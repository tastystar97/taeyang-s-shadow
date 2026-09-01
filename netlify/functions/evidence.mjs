import { getStore } from "@netlify/blobs";
import { requireSession } from "../lib/auth.mjs";
import { applyAction } from "../lib/state-core.mjs";
import { readState, writeState } from "../lib/store.mjs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;
const json = (data, init = {}) => Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init.headers || {}) } });
const evidenceStore = () => getStore({ name: "taeyang-city-evidence", consistency: "strong" });

export default async function handler(request) {
  const player = requireSession(request, "player");
  if (!player) return json({ error: "접근 인증이 필요합니다." }, { status: 401 });
  const url = new URL(request.url);

  if (request.method === "GET") {
    const id = String(url.searchParams.get("id") || "").slice(0, 80);
    if (!id) return json({ error: "사진 식별자가 필요합니다." }, { status: 400 });
    const state = await readState();
    const record = (state.evidence || []).find((entry) => entry.id === id);
    if (!record) return json({ error: "등록된 증거 사진이 아닙니다." }, { status: 404 });
    const data = await evidenceStore().get(`image/${id}`, { type: "arrayBuffer" });
    if (!data) return json({ error: "사진 원본을 찾을 수 없습니다." }, { status: 404 });
    return new Response(data, { headers: { "Content-Type": record.contentType || "application/octet-stream", "Content-Disposition": "inline", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  }

  if (request.method !== "POST") return json({ error: "허용되지 않은 요청입니다." }, { status: 405 });
  if (!requireSession(request, "gm")) return json({ error: "관제 권한이 필요합니다." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: "사진 등록 데이터를 읽을 수 없습니다." }, { status: 400 });
  const image = form.get("image");
  if (!image || typeof image.arrayBuffer !== "function") return json({ error: "사진 파일을 선택하세요." }, { status: 400 });
  if (!ALLOWED_TYPES.has(image.type)) return json({ error: "JPG, PNG, WEBP, GIF 파일만 등록할 수 있습니다." }, { status: 400 });
  if (image.size > MAX_BYTES) return json({ error: "사진 파일은 5MB 이하여야 합니다." }, { status: 400 });

  const state = await readState();
  if (Number(form.get("revision")) !== Number(state.revision)) return json({ error: "다른 단말에서 상태가 변경되었습니다.", state }, { status: 409 });

  const id = crypto.randomUUID();
  const evidence = {
    id, title: form.get("title"), category: form.get("category"), caseCode: form.get("caseCode"), location: form.get("location"),
    capturedAt: form.get("capturedAt"), description: form.get("description"), fileName: image.name, contentType: image.type, createdAt: new Date().toISOString()
  };

  try {
    await evidenceStore().set(`image/${id}`, await image.arrayBuffer(), { metadata: { contentType: image.type, fileName: image.name } });
    applyAction(state, "add-evidence", { evidence });
    await writeState(state);
    return json({ state });
  } catch (error) {
    return json({ error: error.message || "증거 사진을 저장하지 못했습니다." }, { status: 500 });
  }
}
