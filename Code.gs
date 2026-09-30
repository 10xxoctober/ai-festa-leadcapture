/**
 * AI FESTA 방문 등록 — Apps Script 백엔드
 * 흐름: 웹페이지(POST) → 명함 이미지는 Drive 저장 → 나머지는 Google Form 응답으로 제출(명함 링크 포함)
 *
 * 설정: 아래 CONFIG 를 채우고 [배포 > 새 배포 > 웹 앱]
 *   - 실행 사용자: 나(Me)
 *   - 액세스 권한: 모든 사용자(Anyone)
 */
const CONFIG = {
  FORM_ID: '1NfBN5e828MFz4LXZP1wfRcT8LGr8pBIRX2b8gpI_PDU',
  FOLDER_ID: '11LifMwZRnyM1D6QdpFDQFbn0EtbJdj5E',
  SHARED_SECRET: '',    // index.html CONFIG.SECRET 과 동일한 값 (선택, 단순 스팸 방지용)

  // 폼 문항 제목 ↔ 데이터 필드 매핑. 폼의 실제 문항 제목과 정확히 일치해야 합니다.
  // 문항 유형: 단답형 / 장문형 (체크박스는 보기 이름이 정확히 일치할 때만 선택됨)
  FIELDS: {
    '이름': 'name',
    '회사/소속': 'company',
    '연락처': 'phone',
    '이메일': 'email',
    '관심 제품': 'products',
    '상세 관심 내용': 'detail',
    '명함 이미지': 'cardUrl',
    '개인정보 수집·이용 동의': 'consent',
    '이벤트': 'event',
    '예약일': 'date',
    '예약시각': 'time',
    '미팅방식': 'method',
    '미팅위치': 'location',
    '미팅목적': 'purpose',
  },
  // 예약 중복 확인에 쓰는 문항 제목(위 FIELDS 의 '예약일'/'예약시각' 키와 반드시 같아야 함)
  DATE_FIELD_TITLE: '예약일',
  TIME_FIELD_TITLE: '예약시각',
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (CONFIG.SHARED_SECRET && d.secret !== CONFIG.SHARED_SECRET) return out_({ ok: false, error: 'forbidden' });
    if (d.consent !== '동의') return out_({ ok: false, error: 'no consent' });

    // 중복 전송 방지(재시도 대비)
    const cache = CacheService.getScriptCache();
    if (d.id && cache.get('id_' + d.id)) return out_({ ok: true, dup: true });

    // 예약(날짜+시간)이 있으면 이미 찬 시간인지 락을 잡은 상태에서 마지막으로 한 번 더 확인
    if (d.date && d.time) {
      const taken = takenTimesForDate_(d.date);
      if (taken.indexOf(d.time) >= 0) return out_({ ok: false, error: 'slot_taken' });
    }

    d.cardUrl = saveCard_(d);
    d.products = Array.isArray(d.products) ? d.products : [];
    submitToForm_(d);

    if (d.id) cache.put('id_' + d.id, '1', 6 * 60 * 60);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** 예약 현황 조회: GET {webAppUrl}?action=slots&date=YYYY-MM-DD → 그 날짜에 이미 찬 시간 목록 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'slots') {
      const date = e.parameter.date;
      if (!date) return out_({ ok: false, error: 'missing date' });
      return out_({ ok: true, date: date, times: takenTimesForDate_(date) });
    }
    return out_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

/** 지정한 날짜에 이미 예약된 시간('HH:00') 목록을 폼 응답에서 읽어옵니다. */
function takenTimesForDate_(date) {
  const form = FormApp.openById(CONFIG.FORM_ID);
  const items = form.getItems();
  const dateItem = items.filter(function (it) { return it.getTitle().trim() === CONFIG.DATE_FIELD_TITLE; })[0];
  const timeItem = items.filter(function (it) { return it.getTitle().trim() === CONFIG.TIME_FIELD_TITLE; })[0];
  if (!dateItem || !timeItem) return [];
  const times = [];
  form.getResponses().forEach(function (r) {
    const dResp = r.getResponseForItem(dateItem);
    const tResp = r.getResponseForItem(timeItem);
    const dVal = dResp && dResp.getResponse();
    const tVal = tResp && tResp.getResponse();
    if (dVal === date && tVal) times.push(tVal);
  });
  return times;
}

function saveCard_(d) {
  if (!d.cardImage) return '';
  const m = /^data:(image\/\w+);base64,(.+)$/.exec(d.cardImage);
  if (!m) return '';
  const safe = (d.name || 'noname').replace(/[\\/:*?"<>|]/g, '_');
  const stamp = Utilities.formatDate(new Date(d.ts || Date.now()), 'Asia/Seoul', 'yyyyMMdd_HHmmss');
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], stamp + '_' + safe + '.jpg');
  const file = DriveApp.getFolderById(CONFIG.FOLDER_ID).createFile(blob); // 공유 설정 변경 안 함(비공개 유지)
  return file.getUrl();
}

function submitToForm_(d) {
  const form = FormApp.openById(CONFIG.FORM_ID);
  const resp = form.createResponse();
  const byTitle = {};
  form.getItems().forEach(function (it) { byTitle[it.getTitle().trim()] = it; });

  Object.keys(CONFIG.FIELDS).forEach(function (title) {
    const item = byTitle[title];
    if (!item) return;
    const val = d[CONFIG.FIELDS[title]];
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length)) return;
    const type = item.getType();
    const text = Array.isArray(val) ? val.join(', ') : String(val);
    if (type === FormApp.ItemType.TEXT) resp.withItemResponse(item.asTextItem().createResponse(text));
    else if (type === FormApp.ItemType.PARAGRAPH_TEXT) resp.withItemResponse(item.asParagraphTextItem().createResponse(text));
    else if (type === FormApp.ItemType.CHECKBOX) {
      const names = item.asCheckboxItem().getChoices().map(function (c) { return c.getValue(); });
      const pick = (Array.isArray(val) ? val : [text]).filter(function (v) { return names.indexOf(v) >= 0; });
      if (pick.length) resp.withItemResponse(item.asCheckboxItem().createResponse(pick));
    }
  });
  resp.submit();
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** 에디터에서 한 번 실행해 Forms/Drive 권한을 승인하세요. (이름 끝에 _ 를 붙이면 Apps Script가
 * 비공개 헬퍼로 취급해 실행 드롭다운에 나타나지 않으므로 일부러 밑줄 없이 뒀습니다.) */
function authorize() {
  FormApp.openById(CONFIG.FORM_ID).getTitle();
  DriveApp.getFolderById(CONFIG.FOLDER_ID).getName();
}
