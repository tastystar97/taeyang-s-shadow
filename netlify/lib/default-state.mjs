export const defaultState = {
  revision: 1,
  operation: { act: "ACT II", title: "배신", phase: 1 },
  stats: { morale: 3, alert: 2, intel: 1, funds: 6, trust: "표준" },
  notices: [
    { id: "notice-1", time: "21:40", title: "본부 공문 수신", body: "루미나스 병원 확보 인원", priority: true },
    { id: "notice-2", time: "20:18", title: "기록 복구 완료", body: "이강준 수첩 · 003 페이지" },
    { id: "notice-3", time: "18:03", title: "의료기록 갱신", body: "이세아 귀환 후 경과" }
  ],
  checklist: {
    1: [
      { id: "briefing", title: "신규 공문 확인", note: "본부 및 지부 내부 수신함", done: true, source: "SYSTEM" },
      { id: "branch-review", title: "현재 지부 상태 확인", note: "자금·사기·경계도·정보력", done: true, source: "SYSTEM" },
      { id: "assignment", title: "대원 배치 확정", note: "내정 및 현장 슬롯 배치", done: false, source: "COMMAND" },
      { id: "operation-order", title: "작전 명령서 제출", note: "전자서명 후 관제 제출", done: false, source: "E-DOC" },
      { id: "protected-review", title: "보호대상 재평가", note: "P-07 기한 및 본인 의사 확인", done: false, source: "P-07" }
    ],
    2: [
      { id: "field-brief", title: "현장 브리핑 완료", note: "목표·철수 조건·연락망 확인", done: false, source: "COMMAND" },
      { id: "resources", title: "지원 리소스 지급", note: "작전실·의무실 보정 확인", done: false, source: "BRANCH" },
      { id: "parallel-front", title: "동시 전선 처리", note: "비투입 대원의 경량 판정", done: false, source: "FIELD" },
      { id: "casualty-log", title: "침식·부상 임시 기록", note: "현장 종료 전 누락 확인", done: false, source: "MEDICAL" }
    ],
    3: [
      { id: "result-record", title: "사건 결과 기록", note: "성공도와 미결 사항", done: false, source: "E-DOC" },
      { id: "condition-update", title: "침식·부상 갱신", note: "회복 및 상실 판정 반영", done: false, source: "MEDICAL" },
      { id: "payroll", title: "대원 임금 지급", note: "현재 고정 임금 3 UNIT", done: false, source: "FINANCE" },
      { id: "maintenance", title: "시설 유지비 정산", note: "유료 시설 유지비 확인", done: false, source: "FINANCE" },
      { id: "indicators", title: "지부 지표 갱신", note: "사기·경계도·정보력·자금", done: false, source: "BRANCH" },
      { id: "hq-report", title: "본부 정기 보고서 제출", note: "보고 내용과 누락 항목 최종 확인", done: false, source: "E-DOC" }
    ]
  },
  roster: [
    { name: "하은채", grade: "A", role: "부지부장 대행", syndrome: "노이만", tags: ["행정", "탐문"], erosion: 0, wound: 0 },
    { name: "진태호", grade: "B", role: "현장 요원", syndrome: "키마이라", tags: ["전투"], erosion: 0, wound: 0 }
  ],
  facilities: [
    { name: "의무실", level: 1, active: true, effect: "부상 회복 및 침식 케어. 기본 응급 리소스 제공." },
    { name: "휴게실", level: 1, active: true, effect: "대원 사기 유지. 파산 상태에서도 기본 기능 가동." },
    { name: "훈련장", level: 0, active: false, effect: "미설치. 대원 육성과 태그 훈련에 사용." },
    { name: "작전실", level: 0, active: false, effect: "미설치. 정보력과 현장 진입 준비를 보조." },
    { name: "숙소", level: 0, active: false, effect: "미설치. 보호대상과 추가 인원을 수용." }
  ],
  documents: [
    { id: "hq-urgent", code: "HQ-KR/URG-2043-17", category: "본부 공문", title: "루미나스 병원 확보 인원", detail: "본부 긴급 공문", security: "CONFIDENTIAL", status: "NEW", url: "/archive/hq-urgent.html" },
    { id: "medical-isea", code: "TCB/MED-002", category: "의료기록", title: "이세아 귀환 후 의료기록", detail: "POST-OP 기록", security: "MEDICAL", status: "NEW", url: "/archive/medical-isea.html" },
    { id: "sera-profile", code: "TCB/ID-004", category: "신원서류", title: "정세라 임시 신원 및 보호 서류", detail: "CASE 004 · ADULT", security: "CONFIDENTIAL", status: "RELEASED", url: "/archive/sera-profile.html" },
    { id: "suhwan-card", code: "TCB/ID-003", category: "신원서류", title: "수환 임시 신원 카드", detail: "CODE-003", security: "CONFIDENTIAL", status: "RELEASED", url: "/archive/suhwan-card.html" },
    { id: "kangjun-note", code: "RECOVERED/NOTE-003", category: "개인 기록", title: "이강준 수첩 · 003 페이지", detail: "복구된 비공식 기록", security: "RESTRICTED", status: "NEW", url: "/archive/kangjun-note-003.html" },
    { id: "former-chief-note", code: "TCB/FORMER-01", category: "개인 기록", title: "전임 지부장 개인 수첩", detail: "공식 사건철 미포함", security: "RESTRICTED", status: "RELEASED", url: "/archive/former-chief-note.html" },
    { id: "handover", code: "TCB/ADMIN-HO1", category: "지부 행정", title: "지부장 인수인계서", detail: "신임 지부장 부임 기록", security: "INTERNAL", status: "RELEASED", url: "/archive/branch-handover.html" },
    { id: "p07", code: "HQ-PD/P-07", category: "본부 규정", title: "보호대상 안정화 및 인계 규정", detail: "REVISION 01", security: "INTERNAL", status: "RELEASED", url: "/archive/regulation-p07.html" },
    { id: "branch-summary", code: "TCB/OPS-SUM", category: "지부 행정", title: "지부 운영 시스템 서머리", detail: "신임 지부장 업무 참조", security: "INTERNAL", status: "RELEASED", url: "/archive/branch-operations.html" },
    { id: "facilities", code: "TCB/FAC-REF", category: "지부 행정", title: "지부 시설 목록 및 효과", detail: "HOUSING REFERENCE", security: "INTERNAL", status: "RELEASED", url: "/archive/facilities.html" },
    { id: "city-locations", code: "CITY/LOC-01", category: "도시 정보", title: "태양시 로케이션", detail: "신도심·구도심·도시 근교·대학가", security: "INTERNAL", status: "RELEASED", url: "/archive/city-locations.html" },
    { id: "city-history", code: "CITY/HST-01", category: "도시 정보", title: "태양시 역사와 주요 조직", detail: "1973—2043 CHRONOLOGY", security: "INTERNAL", status: "RELEASED", url: "/archive/city-history.html" }
  ],
  forms: [],
  activity: []
};

export function freshState() {
  return structuredClone(defaultState);
}
