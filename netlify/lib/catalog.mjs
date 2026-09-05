// 기존 공개 번들의 원본 기록. 서버에서만 가져온다.
export const PERSONNEL = [
  {
    "id": "choi-youngho",
    "name": "최영호",
    "order": "01",
    "employeeId": "2043-K-001",
    "position": "지부장",
    "division": "지부장실 · 통합관제",
    "clearance": "A-1",
    "status": "ACTIVE",
    "assignment": "태양시 지부 총괄",
    "appointed": "2043. 04. 01",
    "duties": "태양시 지부 운영과 인사·작전 자원을 총괄하며, 본부 공문 대응·작전 최종 승인·대외 협조 여부를 결정한다.",
    "qualifications": [
      "지부 작전 최종결재권",
      "A급 보안문서 열람",
      "P-07 보호조치 승인"
    ],
    "assessment": "상황 판단과 조직 통제가 안정적이다. 직접 현장 개입보다 정보 취합과 자원 조정, 책임 승인 임무를 우선한다.",
    "note": "긴급 상황 발생 시 지부 내 최종 지휘권자. 장기 부재 또는 연락 두절 시 대한민국 지부본부 관제에 즉시 보고한다.",
    "image": "/media/personnel/choi-youngho.webp",
    "fileName": "최영호.webp"
  },
  {
    "id": "ha-eunchae",
    "name": "하은채",
    "order": "02",
    "employeeId": "2036-K-032",
    "position": "선임 행정관",
    "division": "운영지원 · 기록관리",
    "clearance": "B-1",
    "status": "ACTIVE",
    "assignment": "지부 행정·문서 관제",
    "appointed": "2036. 09. 18",
    "duties": "인사·예산·보급 기록을 관리하고 문서보관소와 본부 정기보고 자료를 정리한다. 지부 내 행정 일정과 감사 대응을 조율한다.",
    "qualifications": [
      "보안기록 관리",
      "물자·예산 정산",
      "전자문서 감사 대응"
    ],
    "assessment": "기록 정확도와 일정 통제 능력이 우수하다. 규정 이탈과 서류 누락을 빠르게 식별하며 장기 업무의 연속성을 안정적으로 유지한다.",
    "note": "대외 접촉 및 인사 평가 기록은 지부장 결재 후 공개. 원본 문서 수정 이력은 별도 감사 로그에 영구 보존한다.",
    "image": "/media/personnel/ha-eunchae.webp",
    "fileName": "하은채.webp"
  },
  {
    "id": "jin-taeho",
    "name": "진태호",
    "order": "03",
    "employeeId": "2042-K-007",
    "position": "현장 대응 요원",
    "division": "작전팀 · 기동대응",
    "clearance": "C-3",
    "status": "ACTIVE",
    "assignment": "초동대응 대기조",
    "appointed": "2042. 07. 11",
    "duties": "이상 사건 초동 대응, 현장 봉쇄, 민간인 대피와 확보 증거물의 안전한 인계를 담당한다. 작전팀의 선행 정찰 임무를 병행한다.",
    "qualifications": [
      "근접 위협 대응",
      "현장 응급처치",
      "봉쇄선·대피로 운용"
    ],
    "assessment": "기동성과 현장 적응력이 우수하고 돌발 상황에 대한 반응이 빠르다. 단독 판단으로 작전 범위를 변경한 경우 사후 보고를 철저히 해야 한다.",
    "note": "고위험 제한구역 투입은 B급 이상 감독자의 승인이 필요하다. 확보 증거물은 현장 종료 즉시 기록관리 담당자에게 인계한다.",
    "image": "/media/personnel/jin-taeho.webp",
    "fileName": "진태호.webp"
  },
  {
    "id": "lee-sea",
    "name": "이세아",
    "order": "04",
    "employeeId": "2033-K-082-C",
    "position": "특수 대응 요원",
    "division": "특수작전 · 보호대상 지원",
    "clearance": "S-4",
    "status": "MONITORED",
    "assignment": "복귀 후 제한 배치",
    "appointed": "2033. 12. 02",
    "duties": "고위험 변칙현상 대응, 특수 보호대상 회수와 비정상 환경 정찰을 담당한다. 일반 대응팀이 접근하기 어려운 상황에 우선 배치된다.",
    "qualifications": [
      "S등급 제한구역 접근",
      "고위험 대상 회수",
      "침식 대응 프로토콜"
    ],
    "assessment": "특수 환경 생존성과 임무 지속 능력이 매우 높다. 최근 복귀 이후 의료 경과와 인지 상태를 병행 관찰하며 단계적으로 배치 범위를 확대한다.",
    "note": "의료기록 TCB/MED-002와 연동. 모든 현장 투입 전후에 인지·침식 평가를 실시하고 이상 수치 발생 시 즉시 임무에서 제외한다.",
    "image": "/media/personnel/lee-sea.webp",
    "fileName": "이세아.webp"
  },
  {
    "id": "lee-taeyang",
    "name": "이태양",
    "order": "05",
    "employeeId": "2045-K-107",
    "position": "정보분석 요원",
    "division": "정보분석 · 기술지원",
    "clearance": "B-1",
    "status": "ACTIVE",
    "assignment": "정보분석실 상시근무",
    "appointed": "2045. 03. 17",
    "duties": "사건 데이터 상관분석, 통신·감시 기록 복구와 현장정보 시각화를 담당한다. 작전 전 브리핑 자료와 위험요소 예측치를 작성한다.",
    "qualifications": [
      "디지털 포렌식",
      "도시 감시망 분석",
      "보안단말·기록복구 운용"
    ],
    "assessment": "분산된 정보의 연결과 반복 패턴 추적 능력이 우수하다. 분석 결과는 현장팀의 교차 확인을 거쳐 확정 정보로 승격한다.",
    "note": "원본 데이터와 복호화 키의 외부 반출 금지. 분석 산출물은 기본적으로 BRANCH INTERNAL 등급을 적용한다.",
    "image": "/media/personnel/lee-taeyang.webp",
    "fileName": "이태양.webp"
  }
];
export const STATIC_EVIDENCE = [
  {
    "id": "static-audit-eve",
    "title": "감사 전야",
    "category": "현장사진",
    "caseCode": "TCB / FIELD RECORD",
    "location": "촬영지 미기록",
    "description": "태양시 지부 현장 기록. 세부 내용은 원본 이미지를 참조하십시오.",
    "fileName": "감사 전야.webp",
    "src": "/media/evidence/audit-eve.webp"
  },
  {
    "id": "static-two-beds",
    "title": "두 개의 침대",
    "category": "현장사진",
    "caseCode": "EMPTY ROOM",
    "location": "루미나스 관련 현장",
    "description": "현장에서 확보된 시각 기록. 두 개의 침대가 촬영되어 있다.",
    "fileName": "두 개의 침대.webp",
    "src": "/media/evidence/two-beds.webp"
  },
  {
    "id": "static-luminous-pharma",
    "title": "루미나스 제약",
    "category": "증거물",
    "caseCode": "LUMINOUS",
    "location": "태양시",
    "description": "루미나스 제약 관련 증거 이미지.",
    "fileName": "루미나스 제약.webp",
    "src": "/media/evidence/luminous-pharma.webp"
  },
  {
    "id": "static-white-noise",
    "title": "벽 속의 백색 소음",
    "category": "현장사진",
    "caseCode": "TCB / FIELD RECORD",
    "location": "촬영지 미기록",
    "description": "벽 내부 이상 현상과 관련된 현장 기록.",
    "fileName": "벽 속의 백색 소음.webp",
    "src": "/media/evidence/white-noise-in-wall.webp"
  },
  {
    "id": "static-incident-record",
    "title": "사고 기록",
    "category": "증거물",
    "caseCode": "INCIDENT RECORD",
    "location": "기록 출처 미기재",
    "description": "사건 조사 과정에서 확보된 사고 기록 이미지.",
    "fileName": "사고 기록.webp",
    "src": "/media/evidence/incident-record.webp"
  },
  {
    "id": "static-suhwan-collar",
    "title": "수환의 초커",
    "category": "증거물",
    "caseCode": "CODE-003",
    "location": "루미나스 종합병원",
    "description": "보호대상 수환에게서 분리된 초커 관련 증거 이미지.",
    "fileName": "수환의 초커.webp",
    "src": "/media/evidence/suhwan-collar.webp"
  },
  {
    "id": "static-ghost-waybill",
    "title": "유령 운송장",
    "category": "증거물",
    "caseCode": "LOGISTICS RECORD",
    "location": "출처 미기재",
    "description": "운송 경로 조사와 관련된 증거 이미지.",
    "fileName": "유령 운송장.webp",
    "src": "/media/evidence/ghost-waybill.webp"
  },
  {
    "id": "static-yunha-report",
    "title": "윤하의 보고서",
    "category": "증거물",
    "caseCode": "RECOVERED REPORT",
    "location": "기록 출처 미기재",
    "description": "윤하의 보고서 원본 이미지.",
    "fileName": "윤하의 보고서.webp",
    "src": "/media/evidence/yunha-report.webp"
  },
  {
    "id": "static-doctor-disappeared",
    "title": "의사가 사라진 밤",
    "category": "현장사진",
    "caseCode": "LUMINOUS / NIGHT",
    "location": "촬영지 미기록",
    "description": "의사 실종 사건과 관련된 현장 기록.",
    "fileName": "의사가 사라진 밤.webp",
    "src": "/media/evidence/doctor-disappeared.webp"
  }
];

export const CITY_HTML = "<div class=\"city-intro panel\"><img src=\"/media/evidence/taeyang-city-view.webp\" alt=\"태양시 전경\"><div><span class=\"city-index\">34°56′N / 127°41′E</span><h2>빛과 그림자의 도시</h2><p>그라운드 제로를 품은 산업도시. 신도심과 구도심 사이에 UGN, H.E.L.I.O.S., NOX의 이해가 겹친다.</p></div><button class=\"primary-button\" data-doc=\"city-locations\">도시 로케이션 열람</button></div>\n        <div class=\"district-grid\">\n          <article><span>SECTOR 01</span><h3>신도심</h3><p>루미나스 병원과 행정 중심지. 통제된 빛이 밤새 꺼지지 않는다.</p></article>\n          <article><span>SECTOR 02</span><h3>구도심</h3><p>재개발에서 밀려난 오래된 주거지. 빈방 사건의 잔향이 남아 있다.</p></article>\n          <article><span>SECTOR 03</span><h3>도시 근교</h3><p>폐쇄된 산업시설과 그라운드 제로의 접근 제한 구역.</p></article>\n          <article><span>SECTOR 04</span><h3>대학가</h3><p>젊은 유동인구와 실종 신고가 교차하는 감시 취약 구역.</p></article>\n        </div>\n        <button class=\"record-banner\" data-doc=\"city-history\"><span>CHRONOLOGY / 1973—2043</span><b>태양시 역사와 주요 조직 기록 열람</b><i>→</i></button>";
