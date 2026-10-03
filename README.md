# AI/AX 강사·컨설턴트 공고 트래커

Google Sheets + Apps Script. 설계는 [docs/DESIGN.md](docs/DESIGN.md) 참고.

- 시트: <https://docs.google.com/spreadsheets/d/12N0pdRoT8xL4mSL_wrgE7wcBsaRA41GRTrRHwXY1Hdw/edit>
  (탭 6개: 00_모니터링트랙 / 01_공고관리 / 02_분류·키워드 / 03_기관목록 / 04_설정 / 99_로그)

## 설치

1. 시트에서 **확장 프로그램 → Apps Script** 를 열고 `apps-script/` 의 `.gs` 파일을 복사하거나, clasp 로 배포한다.
   ```
   npm i -g @google/clasp && clasp login
   cp .clasp.json.example .clasp.json   # scriptId 입력
   clasp push
   ```
2. **프로젝트 설정 → 스크립트 속성** 에 API 키를 등록한다 (저장소에 커밋 금지).

   | 속성 | 발급처 | 용도 |
   |---|---|---|
   | `NARA_KEY` | data.go.kr "조달청 나라장터 입찰공고정보서비스" | 나라장터 용역 입찰 |
   | `KSTARTUP_KEY` | data.go.kr "창업진흥원 K-Startup 사업공고" | K-Startup 공고 |
   | `BIZINFO_KEY` | bizinfo.go.kr OpenAPI 신청 | 기업마당 지원사업 |
   | `SARAMIN_KEY` | oapi.saramin.co.kr 접근키 신청 | 사람인 채용공고 |

   키가 없는 소스는 `04_설정` 수집원 표에서 `사용`을 FALSE 로 두면 건너뛴다(오류는 99_로그에 기록).
   (시트에 바인딩하지 않은 스크립트면 `SHEET_ID` 속성도 추가)
3. Google 알리미(알림 주제별 "RSS 피드로 전송")의 피드 URL을 `04_설정` 의 `Google 알리미 RSS` 행 `URL/쿼리` 칸에 쉼표로 구분해 붙여넣는다.
4. 스크립트 편집기에서 `installTriggers` 를 한 번 실행해 권한을 승인한다.
   - 월·목 08시 `collect`, 매일 08:30 `digestDaily`(마감 D-3/D-1/당일·3일 내 일정이 있을 때만 발송), 편집 트리거가 등록된다.
5. 시트 메뉴 **구인트래커 → 지금 수집** 으로 수동 실행해 확인한다.

## 동작 요약

- `collect()`: 활성 수집원 실행 → `02_분류·키워드` 규칙(제외·개인불가·필수·포함 점수)으로 필터 → 공고ID 중복 제거 → `01_공고관리` 에 `미검토` 로 추가 → `00_모니터링트랙` 검색일/발견ID 갱신 → 요약 메일.
- 지원여부·지원일·결과는 자동 수집이 덮어쓰지 않는다.
- 소스 하나가 실패해도 나머지는 계속 실행되고 결과는 `04_설정` 수집원 표와 `99_로그` 에 남는다.

## 주의

- API 응답 필드명은 각 기관 문서 기준으로 작성했으며, 키 발급 후 첫 실행에서 `99_로그` 오류를 보고 필드를 조정해야 할 수 있다.
- 나라장터는 법인 입찰이 대부분이라 결과가 적을 수 있다.
- 잡코리아·원티드·프리랜서 플랫폼은 공식 API가 없거나 제한적이어서 아직 어댑터가 없다(알림 메일/RSS 경로 권장).
