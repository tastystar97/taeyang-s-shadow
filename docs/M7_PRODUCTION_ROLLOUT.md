# M7 운영 반영 기록

## 운영 대상

- 사이트: `taeyangcitybranchintranet`
- 운영 주소: <https://taeyangcitybranchintranet.netlify.app>
- 운영 검증 기준 수동 배포 ID: `6a9c49643fad91ad362e10f5`
- 운영 검증 기준 수동 배포 로그: <https://app.netlify.com/projects/taeyangcitybranchintranet/deploys/6a9c49643fad91ad362e10f5>
- 운영 반영일: 2026-09-06

## 전환 전 백업

- 경로: `C:\Users\rere3\Downloads\태양의 그림자\taeyang-city-backups\20260906-013604-pre-m7`
- 공유 상태: `taeyang-city-branch/shared-state` 원본 JSON, ETag, SHA-256 보존
- 공유 상태 SHA-256: `b5699aabcabe74cc9a7e1c3367e8b4559e344330ea615876034f57b21155150b`
- 파일 저장소 `taeyang-city-files`: 객체 0개
- 증거 저장소 `taeyang-city-evidence`: 객체 0개
- 코드 복구 기준 배포: `6a97d80d9d0753000831da8c`

## 환경변수

- 기존 `BRANCH_ACCESS_CODE`와 `CONTROL_ACCESS_CODE`는 유지했다.
- `FIELD_ACCESS_CODE`와 `SESSION_SECRET`은 무작위 값으로 회전해 `production`과 `deploy-preview`에 반영했다.
- 두 회전 값은 Netlify에서 secret으로 설정했다.
- 현장요원 운영 코드는 로컬 `.env`의 `FIELD_ACCESS_CODE`에서 확인한다.
- 로컬 `.env`의 `CONTROL_ACCESS_CODE`는 기존 Netlify 운영값과 다르다. GM은 기존 운영 코드를 계속 사용한다.

## 운영 중 발견한 결함과 조치

GM 플레이어 미리보기 호출에서 Node 24가 `sanitize-html@2.17.7`의 CommonJS 진입점과 ESM 전용 `htmlparser2@12`를 함께 로드하지 못해 500 오류가 발생했다. `sanitize-html`을 `2.17.5`로 고정해 `htmlparser2@10.1.0`을 사용하도록 바꾼 뒤 재배포했다.

## 최종 검증

- `sanitize-html` Node 런타임 로드·정제 검사 통과
- 자동 테스트 80개 통과
- `npm run build` 통과, 아카이브 12종 검증
- 지부장·현장요원·GM 로그인과 역할별 상태 응답 통과
- 미인증 상태 API와 보호 원본 요청 401 확인
- 지부장·현장요원의 관제 전용 쓰기 요청 403 확인
- GM의 지부장·현장요원 미리보기 통과
- 비GM 미리보기 403, 미리보기 쓰기 405 확인
- 지부장 보호 원본과 공개 CSS·JavaScript 응답 통과

운영 데이터를 더럽히지 않기 위해 실제 운영 주소에서 업로드·보고서 제출·공개 변경은 만들지 않았다. 해당 쓰기 흐름은 전체 테스트와 M6 로컬 브라우저 통합 검증에서 확인했다. 첫 세션에서는 비공개 테스트 자료 한 건으로 업로드와 단건 공개를 확인한 뒤 삭제한다.

## 복구 기준

코드 문제는 Netlify에서 이전 배포 `6a97d80d9d0753000831da8c`를 다시 게시한다. 새 코드가 상태를 쓴 뒤 데이터 복구가 필요하면 먼저 현재 상태를 추가 백업하고, ETag 차이를 확인한 다음 전환 전 `shared-state.json`을 사용한다. 파일 저장소는 전환 전 비어 있었으므로 새 파일이 생긴 경우 별도로 보존한 뒤 판단한다.