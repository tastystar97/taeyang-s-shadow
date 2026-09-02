import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const required = [
  "public/index.html", "public/styles.css", "public/app.js", "public/control.html", "public/control.js", "public/archive-editor.js", "public/login-sequence.js",
  "netlify/functions/auth.mjs", "netlify/functions/state.mjs", "netlify/functions/evidence.mjs", "netlify/lib/store.mjs", "netlify.toml"
];

for (const file of required) await access(file);

const html = await readFile("public/index.html", "utf8");
for (const id of ["view-command", "view-personnel", "view-city", "view-archive", "view-evidence", "view-workflow", "document-dialog", "evidence-dialog", "form-dialog"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`필수 화면 누락: ${id}`);
}
if (html.includes('id="view-branch"') || html.includes('data-view="branch"')) throw new Error("삭제된 브랜치 상태 화면이 남아 있습니다.");
if (!html.includes("data-close-form")) throw new Error("전자서류 취소 동작이 누락되었습니다.");
for (const id of ["form-paper-title", "form-paper-status", "form-paper-code", "form-signature-button"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`UGN 공문 요소 누락: ${id}`);
}
if (!html.includes('class="official-form-paper"')) throw new Error("UGN 공문 양식이 누락되었습니다.");

const archive = await readdir(join("public", "archive"));
if (archive.filter((file) => file.endsWith(".html")).length < 12) throw new Error("플레이어용 보관 문서가 누락되었습니다.");

const serverState = await readFile("netlify/lib/default-state.mjs", "utf8");
for (const file of archive) {
  if (file.endsWith(".html") && !serverState.includes(`/archive/${file}`)) throw new Error(`상태 목록에 없는 문서: ${file}`);
}

const editor = await readFile("public/archive-editor.js", "utf8");
for (const id of ["hq-urgent", "medical-isea", "sera-profile", "suhwan-card", "handover"]) {
  if (!editor.includes(`'${id}'`) && !editor.includes(`${id}:`)) throw new Error(`작성 가능한 문서 서식 누락: ${id}`);
}

const app = await readFile("public/app.js", "utf8");
if (!app.includes("function toggleFormSignature()") || !app.includes("choi-youngho-fitted.png")) throw new Error("공문 이미지 전자서명 기능이 누락되었습니다.");
if (!app.includes("function evidenceSource(item)") || !app.includes("escapeHTML(evidenceSource(item))")) throw new Error("정적 증거 이미지 경로 처리가 누락되었습니다.");
if (!app.includes('class="archive-row-link"') || !app.includes("문서 열기 →")) throw new Error("보관 문서 행 전체 열기 기능이 누락되었습니다.");

for (const file of [
  "public/media/evidence/audit-eve.webp", "public/media/evidence/two-beds.webp", "public/media/evidence/luminous-pharma.webp",
  "public/media/evidence/white-noise-in-wall.webp", "public/media/evidence/incident-record.webp", "public/media/evidence/suhwan-collar.webp",
  "public/media/evidence/ghost-waybill.webp", "public/media/evidence/yunha-report.webp", "public/media/evidence/doctor-disappeared.webp",
  "public/media/evidence/taeyang-city-view.webp", "public/media/evidence/taeyang-shadow-main.webp",
  "public/media/personnel/choi-youngho.webp", "public/media/personnel/ha-eunchae.webp", "public/media/personnel/jin-taeho.webp",
  "public/media/personnel/lee-sea.webp", "public/media/personnel/lee-taeyang.webp",
  "public/media/signatures/choi-youngho-fitted.png"
]) await access(file);

console.log(`Taeyang City Branch validation passed (${archive.length} archived documents).`);
