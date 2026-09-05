export const ARCHIVE_CATEGORIES = Object.freeze([
  '본부 공문',
  '의료기록',
  '인물 관련',
  '개인 기록',
  '지부 행정',
  '본부 규정',
  '도시 정보',
  '사건 자료',
  '증거품',
  '기타 문서'
]);

export function normalizeArchiveCategory(value) {
  const category = String(value || '').trim();
  return category === '신원서류' ? '인물 관련' : category;
}

export function normalizeEvidenceCategory(value) {
  const category = String(value || '').trim();
  return category === '증거물' ? '증거품' : category;
}
