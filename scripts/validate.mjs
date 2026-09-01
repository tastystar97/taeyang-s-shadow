import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const required = [
  "public/index.html", "public/styles.css", "public/app.js", "public/control.html", "public/control.js",
  "netlify/functions/auth.mjs", "netlify/functions/state.mjs", "netlify/lib/store.mjs", "netlify.toml"
];

for (const file of required) await access(file);

const html = await readFile("public/index.html", "utf8");
for (const id of ["view-command", "view-branch", "view-city", "view-archive", "view-workflow", "document-dialog", "form-dialog"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`필수 화면 누락: ${id}`);
}

const archive = await readdir(join("public", "archive"));
if (archive.filter((file) => file.endsWith(".html")).length < 12) throw new Error("플레이어용 보관 문서가 누락되었습니다.");

const serverState = await readFile("netlify/lib/default-state.mjs", "utf8");
for (const file of archive) {
  if (file.endsWith(".html") && !serverState.includes(`/archive/${file}`)) throw new Error(`상태 목록에 없는 문서: ${file}`);
}

console.log(`Taeyang City Branch validation passed (${archive.length} archived documents).`);
