# AI FESTA 방문 등록 (GPUBASE)

명함 촬영 + 타이핑 입력 → Drive(명함 이미지) + Google Form 응답.
아이패드·노트북 등 기기 구분 없이 동일한 페이지 하나로 동작합니다.

**✅ 2026-09-30 실제 구축·테스트 완료.** Google Form·Apps Script 배포·`index.html` 연결까지 전부 실제로 만들어서
GET(예약 조회)·POST(리드+예약 제출)·중복 예약 거부·실제 화면 조작까지 확인했습니다(테스트로 넣은 응답은 삭제 완료, 현재 0건).
아래 세팅 항목은 이미 끝난 상태이며, 참고용으로 남겨둡니다. 실제 운영 전 `PRODUCTS`/`BOOKING` 값만 최종 확인하세요.

- Google Form: <https://docs.google.com/forms/d/1NfBN5e828MFz4LXZP1wfRcT8LGr8pBIRX2b8gpI_PDU/edit>
- 응답 스프레드시트: <https://docs.google.com/spreadsheets/d/15jXfXPJv-zbXmtxf4ZfL_CXHlag2fUpeUON7bKYzQek/edit>
- Apps Script 프로젝트: `GPUBASE_AIFESTA_backend` (script.google.com, 옥토버 계정 소유)
- 배포된 웹앱 URL: `https://script.google.com/macros/s/AKfycbxLuCov64NCsVivjP0M2yYTbnJAutOnFC-jK6Q_71jGVNhBLzV-1_Q2e5rCEQVbb4ZEiw/exec`
  (`index.html`의 `CONFIG.ENDPOINT`에 이미 반영됨)

## 파일
- `index.html` — 현장 입력 화면. 단일 파일.
- `Code.gs` — Google Apps Script 백엔드.

## 세팅 (약 15분)

1. **Google Form 만들기** ✅ (2026-09-30, 실제로 생성 완료 — `GPUBASE 방문 등록 - AI FESTA`)
   문항 14개, 제목이 `Code.gs`의 `FIELDS`와 정확히 일치:
   이름 · 회사/소속 · 연락처 · 이메일 · 관심 제품 · 상세 관심 내용(장문) · 명함 이미지 · 개인정보 수집·이용 동의 · 이벤트 ·
   예약일 · 예약시각 · 미팅방식 · 미팅위치 · 미팅목적 (모두 단답형, 상세 관심 내용만 장문형; 예약 관련 5개는 선택 항목)
   - 문항 제목이 애초 설계와 3곳 다릅니다: `행사`→`이벤트`, `예약시간`→`예약시각`, `미팅장소`→`미팅위치`
     (Google Forms 편집기에서 특정 한글 음절이 입력 중 깨지는 문제가 있어, 그 문제를 피할 수 있는 표현으로 바꿨습니다. `Code.gs`도 이 이름으로 맞춰 두었습니다.)
   - 이메일 주소 수집 = 수집하지 않음, 응답 1회 제한 = 꺼짐 확인 완료
   - Form ID: `1NfBN5e828MFz4LXZP1wfRcT8LGr8pBIRX2b8gpI_PDU` (이미 `Code.gs`의 `FORM_ID`에 반영됨)
2. **Drive 폴더** ✅ 완료 — `GPUBASE_AIFESTA_명함` (ID `11LifMwZRnyM1D6QdpFDQFbn0EtbJdj5E`, `Code.gs`의 `FOLDER_ID`에 반영됨). 비공개 유지.
3. **Apps Script** ✅ 완료 — 프로젝트 `GPUBASE_AIFESTA_backend`. 새로 만들 경우:
   script.google.com 새 프로젝트 → `Code.gs` 붙여넣기(`FORM_ID`/`FOLDER_ID`는 이미 채워져 있음)
   → 함수 `authorize` 실행해 권한 승인 → **배포 > 새 배포 > 웹 앱** (실행: 나 / 액세스: 모든 사용자) → URL 복사
   - 함수 이름이 `_`로 끝나면(예: `authorize_`) Apps Script가 비공개 헬퍼로 취급해 **실행 드롭다운에 나타나지 않습니다.**
     이 저장소의 `Code.gs`는 이미 `authorize`(밑줄 없음)로 되어 있습니다 — 직접 실행할 함수 이름에는 끝에 `_`를 붙이지 마세요.
   - `Code.gs`를 나중에 다시 수정한 경우(특히 예약 기능 추가처럼 `doGet`이 새로 생긴 경우) **저장만으로는 반영되지 않습니다.**
     **배포 관리 > 연필(편집) 아이콘 > 버전: 새 버전 > 배포**로 반드시 새 버전을 만들어야 웹앱 URL에 반영됩니다.
   - **구글 폼을 새로 만든 직후에는 "게시"를 하지 않으면 응답을 받지 않습니다** (`설문지에서 응답을 수락하지 않습니다` 에러).
     폼 편집 화면 우측 상단 **게시** 버튼을 한 번 눌러야 `doPost` 제출이 성공합니다. (문항을 나중에 수정해도 재게시는 필요 없음)
4. `index.html` 상단 `CONFIG.ENDPOINT` 에 배포된 웹앱 URL 붙여넣기 ✅ 완료, `PRODUCTS`/`BOOKING`은 실제 운영 값으로 한 번 더 확인
5. **HTTPS로 호스팅** — 카메라(getUserMedia) 사용에 HTTPS 필수 (`file://` 로 열면 카메라 미리보기 대신 파일 선택창으로 대체됨). GitHub Pages / Netlify Drop / Cloudflare Pages 중 편한 곳
6. 현장 기기(아이패드·노트북 등)에서 QR 또는 홈 화면/바로가기로 열기

## 명함 촬영 동작 방식
버튼을 누르면 `getUserMedia`로 카메라를 실시간으로 열어 미리보기 화면에서 바로 촬영합니다.
- **아이패드**: 후면 카메라가 자동으로 선택됩니다.
- **노트북**: 내장 웹캠이 켜집니다(후면 카메라가 없어도 정상 동작).
- 카메라 API 미지원 브라우저이거나 권한을 거부한 경우, 자동으로 파일 선택 대화상자로 대체됩니다.
- 최초 1회 카메라 권한 허용 필요.

## 미팅 예약 동작 방식
캘린더에서 날짜 클릭 → 9~18시 1시간 단위 시간 버튼 → 온라인/오프라인 → (오프라인이면) 방문 장소 → 미팅 목적, 순서로 선택합니다. 전체 예약 항목은 선택 사항이라 날짜를 고르지 않으면 그냥 건너뜁니다.
- **중복 예약 방지**: 날짜를 클릭하면 그 날짜의 예약 현황을 서버(Apps Script)에 물어봐서 이미 찬 시간은 흐리게 비활성화합니다. 최종 등록 시에도 서버가 한 번 더 충돌 여부를 확인해, 그 사이 다른 기기에서 같은 시간이 찼다면 “이미 예약된 시간입니다”라고 알리고 그 자리에서 다른 시간을 고르게 합니다.
- **한계**: 예약은 한 번에 한 건만 가능한 단일 캘린더(담당자/회의실을 구분하지 않음)입니다. 또 전시장 Wi-Fi가 끊겨 제출이 임시 저장(큐)된 경우, 나중에 재전송되는 시점까지는 그 시간이 “빈 시간”으로 보일 수 있습니다.

## 현장 운영 팁
- 전시장 Wi-Fi가 불안정하면 자동으로 기기에 임시 저장 후 재전송 (하단에 “전송 대기 N건” 표시). 행사 종료 전 0건인지 확인.
- 제출 후 6초 뒤(또는 버튼)에 화면이 초기화되어 다음 방문객이 바로 사용.
- 법적: 동의 문구/보유 기간(`CONFIG.RETAIN`)은 사내 개인정보 처리방침에 맞게 확정하세요.
