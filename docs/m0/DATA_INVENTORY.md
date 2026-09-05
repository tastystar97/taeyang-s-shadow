# 기존 자료 인벤토리와 전환 매핑

0단계 로컬 확인 결과야. 운영 데이터 백업이나 이전을 실행한 결과는 아니야.

인사 5명·아카이브 12종·정적 증거 9종과 지원 이미지 3종의 원본 파일 존재와 SHA-256을 확인했어. 전체 해시는 같은 폴더의 DATA_INVENTORY.json에 보관해.

## 자료 매핑

| 종류 | 기존 ID | 이름 | 원본 파일 | 전환 규칙 |
| --- | --- | --- | --- |
| personnel | choi-youngho | 최영호 | public/media/personnel/choi-youngho.webp | ID·사번·순서·본문 유지, 상태에 인사와 파일 참조 추가 |
| personnel | ha-eunchae | 하은채 | public/media/personnel/ha-eunchae.webp | ID·사번·순서·본문 유지, 상태에 인사와 파일 참조 추가 |
| personnel | jin-taeho | 진태호 | public/media/personnel/jin-taeho.webp | ID·사번·순서·본문 유지, 상태에 인사와 파일 참조 추가 |
| personnel | lee-sea | 이세아 | public/media/personnel/lee-sea.webp | ID·사번·순서·본문 유지, 상태에 인사와 파일 참조 추가 |
| personnel | lee-taeyang | 이태양 | public/media/personnel/lee-taeyang.webp | ID·사번·순서·본문 유지, 상태에 인사와 파일 참조 추가 |
| archive | hq-urgent | 루미나스 병원 확보 인원 | public/archive/hq-urgent.html | ID와 archiveEntries 유지, 앱 소유 편집 서식 |
| archive | medical-isea | 이세아 귀환 후 의료기록 | public/archive/medical-isea.html | ID와 archiveEntries 유지, 앱 소유 편집 서식 |
| archive | sera-profile | 정세라 임시 신원 및 보호 서류 | public/archive/sera-profile.html | ID와 archiveEntries 유지, 앱 소유 편집 서식 |
| archive | suhwan-card | 수환 임시 신원 카드 | public/archive/suhwan-card.html | ID와 archiveEntries 유지, 앱 소유 편집 서식 |
| archive | kangjun-note | 이강준 수첩 · 003 페이지 | public/archive/kangjun-note-003.html | ID·원문 유지, 인증된 읽기 경로 |
| archive | former-chief-note | 전임 지부장 개인 수첩 | public/archive/former-chief-note.html | ID·원문 유지, 인증된 읽기 경로 |
| archive | handover | 지부장 인수인계서 | public/archive/branch-handover.html | ID와 archiveEntries 유지, 앱 소유 편집 서식 |
| archive | p07 | 보호대상 안정화 및 인계 규정 | public/archive/regulation-p07.html | ID·원문 유지, 인증된 읽기 경로 |
| archive | branch-summary | 지부 운영 시스템 서머리 | public/archive/branch-operations.html | ID·원문 유지, 인증된 읽기 경로 |
| archive | facilities | 지부 시설 목록 및 효과 | public/archive/facilities.html | ID·원문 유지, 인증된 읽기 경로 |
| archive | city-locations | 태양시 로케이션 | public/archive/city-locations.html | ID·원문 유지, 인증된 읽기 경로 |
| archive | city-history | 태양시 역사와 주요 조직 | public/archive/city-history.html | ID·원문 유지, 인증된 읽기 경로 |
| evidence | static-audit-eve | 감사 전야 | public/media/evidence/audit-eve.webp | ID로 기존 업로드 목록과 병합, 원본·caseCode 유지 |
| evidence | static-two-beds | 두 개의 침대 | public/media/evidence/two-beds.webp | ID로 기존 업로드 목록과 병합, 원본·caseCode 유지 |
| evidence | static-luminous-pharma | 루미나스 제약 | public/media/evidence/luminous-pharma.webp | ID로 기존 업로드 목록과 병합, 원본·caseCode 유지 |
| evidence | static-white-noise | 벽 속의 백색 소음 | public/media/evidence/white-noise-in-wall.webp | ID로 기존 업로드 목록과 병합, 원본·caseCode 유지 |
| evidence | static-incident-record | 사고 기록 | public/media/evidence/incident-record.webp | ID로 기존 업로드 목록과 병합, 원본·caseCode 유지 |
| evidence | static-suhwan-collar | 수환의 초커 | public/media/evidence/suhwan-collar.webp | ID로 기존 업로드 목록과 병합, 원본·caseCode 유지 |
| evidence | static-ghost-waybill | 유령 운송장 | public/media/evidence/ghost-waybill.webp | ID로 기존 업로드 목록과 병합, 원본·caseCode 유지 |
| evidence | static-yunha-report | 윤하의 보고서 | public/media/evidence/yunha-report.webp | ID로 기존 업로드 목록과 병합, 원본·caseCode 유지 |
| evidence | static-doctor-disappeared | 의사가 사라진 밤 | public/media/evidence/doctor-disappeared.webp | ID로 기존 업로드 목록과 병합, 원본·caseCode 유지 |
| support | director-signature | director-signature | public/media/signatures/choi-youngho-fitted.png | 기존 화면·서명 참조 유지 |
| support | command-image | command-image | public/media/evidence/taeyang-shadow-main.webp | 기존 화면·서명 참조 유지 |
| support | city-image | city-image | public/media/evidence/taeyang-city-view.webp | 기존 화면·서명 참조 유지 |

## 서식과 저장 기록

| 대상 | 보존 규칙 |
| --- | --- |
| operation-order / hq-report / protection-record / settlement-report | 기존 ID·내용·서명·상태 유지, director 작성→gm 결재 메타정보 추가 |
| hq-urgent / medical-isea / sera-profile / suhwan-card / handover | 기존 archiveEntries 키·내용·서명·수정시각 유지 |
| field-report | 신규 서식, agent 작성→director 결재; 기존 forms를 이 서식으로 변환하지 않아. |
| 기존 업로드·forms·notices·activity·checklist | 운영 원본에서 추가 대조해. 빈 기본값으로 덮어쓰지 않아. |

## 반복 가능한 전환 규칙

1. 운영 원본 상태와 파일을 백업하고 별도 검증용 복사본에서 시작해.
2. schemaVersion과 엔터티 ID를 검사해. 같은 ID가 이미 있으면 사용자 본문·파일·공개 설정을 유지해.
3. 누락된 기존 seed만 추가하고 기존 필드는 누락값만 보완해. 의미가 충돌하는 ID는 자동 병합하지 않고 중단해.
4. 기존 자료의 지부장 접근은 유지해. 현장요원에게는 자료별 수동 공개하며 새 사례·연결을 자동 생성하지 않아.
5. 파일을 새 저장 경로에 복사하고 해시를 대조한 뒤 메타정보 참조를 전환해. 성공 전에 원본을 지우지 않아.
6. 기존 보호 자료의 공개 정적 사본이 배포에 남지 않는지 확인해. 기존 URL은 인증된 제공 경로로 매핑해.
7. 전환을 재실행해 항목 수·ID·본문·서명·공개 대상이 추가로 바뀌지 않는지 확인해.
8. 서버 쓰기 충돌·파일 저장 실패·복구를 연습해. 새 버전에서 생성한 기록도 보존한 후 코드와 데이터를 함께 복원해.

## 기존 작업본 변경

public/archive/branch-operations.html과 public/archive/facilities.html은 시작 시 이미 수정돼 있었어. 이 인벤토리는 현재 파일의 해시를 기록했고 그 변경을 되돌리지 않았어. .gitignore, package.json, pnpm-lock.yaml과 Cloudflare 관련 기존 작업도 그대로 유지해.
