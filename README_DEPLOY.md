# Taeyang City Branch · Netlify 배포 안내

이 압축 파일은 플레이어 공용 UGN 인트라넷과 GM 관제실을 함께 포함합니다.

## 포함된 기능

- 공용 지부 대시보드와 페이즈 체크리스트
- 지부 상태·인원·시설 화면
- 태양시 정보망과 기존 플레이어용 HTML 문서 12종
- 지부장 전자서류 4종, 자동저장, 전자서명, 제출 잠금
- GM 관제실에서 페이즈·지표·긴급 알림 변경 및 서류 승인·반려
- Netlify Blobs를 이용한 여러 기기 간 상태 저장

## 배포

이 ZIP은 정적 파일만 올리는 Drag & Drop용이 아니라 **Netlify가 빌드하는 소스 ZIP**입니다. 압축을 풀어 Git 저장소에 올린 뒤 Netlify의 **Import an existing project**로 연결하거나, Netlify CLI에서 프로젝트 폴더를 배포하세요. `netlify.toml`이 빌드와 Functions 위치를 자동으로 지정합니다.

Netlify 프로젝트의 Environment variables에 다음 값을 설정하세요.

- `BRANCH_ACCESS_CODE`: 플레이어가 함께 사용할 공용 코드. 비워 두면 플레이어 화면은 공개됩니다.
- `CONTROL_ACCESS_CODE`: `/control.html` 관제실 코드. 반드시 설정하세요.
- `SESSION_SECRET`: 충분히 긴 무작위 문자열. 반드시 설정하세요.

메인 플레이어 화면은 `/`, GM 관제실은 `/control.html`입니다.

## 첫 배포 후 확인

1. 플레이어 화면에서 체크 항목 하나를 변경합니다.
2. 새 서류를 임시저장한 뒤 새로고침해 내용이 남아 있는지 확인합니다.
3. 서류를 제출하고 `/control.html`에서 승인 대기 목록에 나타나는지 확인합니다.
4. 관제실에서 페이즈를 변경해 플레이어 화면의 체크리스트가 바뀌는지 확인합니다.

로컬에서 단순히 `public/index.html`을 열거나 정적 서버로 확인하면 기기 내 미리보기 저장 모드로 작동합니다. 실제 공용 저장과 관제 기능은 Netlify Functions 환경에서 작동합니다.
