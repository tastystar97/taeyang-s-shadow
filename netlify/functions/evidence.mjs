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

  if (!["POST", "PATCH", "DELETE"].includes(request.method)) return json({ error: "허용되지 않은 요청입니다." }, { status: 405 });
  if (!requireSession(request, "gm")) return json({ error: "관제 권한이 필요합니다." }, { status: 403 });

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "").slice(0, 80);
    const state = await readState();
    if (Number(body.revision) !== Number(state.revision)) return json({ error: "다른 단말에서 상태가 변경되었습니다.", state }, { status: 409 });
    if (!(state.evidence || []).some((entry) => entry.id === id)) return json({ error: "삭제할 증거 사진을 찾을 수 없습니다." }, { status: 404 });
    try {
      await evidenceStore().delete(`image/${id}`);
      applyAction(state, "delete-evidence", { id });
      await writeState(state);
      return json({ state });
    } catch (error) {
      return json({ error: error.message || "증거 사진을 삭제하지 못했습니다." }, { status: 500 });
    }
  }

  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: "사진 등록 데이터를 읽을 수 없습니다." }, { status: 400 });
  const editing = request.method === "PATCH";
  const image = form.get("image");
  const hasImage = Boolean(image && typeof image.arrayBuffer === "function" && image.size > 0);
  if (!editing && !hasImage) return json({ error: "사진 파일을 선택하세요." }, { status: 400 });
  if (hasImage && !ALLOWED_TYPES.has(image.type)) return json({ error: "JPG, PNG, WEBP, GIF 파일만 등록할 수 있습니다." }, { status: 400 });
  if (hasImage && image.size > MAX_BYTES) return json({ error: "사진 파일은 5MB 이하여야 합니다." }, { status: 400 });

  const state = await readState();
  if (Number(form.get("revision")) !== Number(state.revision)) return json({ error: "다른 단말에서 상태가 변경되었습니다.", state }, { status: 409 });
  if (!String(form.get("title") || "").trim()) return json({ error: "증거 사진의 기록 제목이 필요합니다." }, { status: 400 });

  const id = editing ? String(form.get("id") || "").slice(0, 80) : crypto.randomUUID();
  const existing = editing ? (state.evidence || []).find((entry) => entry.id === id) : null;
  if (editing && !existing) return json({ error: "수정할 증거 사진을 찾을 수 없습니다." }, { status: 404 });
  const evidence = {
    id, title: form.get("title"), category: form.get("category"), caseCode: form.get("caseCode"), location: form.get("location"),
    capturedAt: form.get("capturedAt"), description: form.get("description"), fileName: hasImage ? image.name : existing?.fileName,
    contentType: hasImage ? image.type : existing?.contentType, createdAt: existing?.createdAt || new Date().toISOString()
  };

  try {
    if (hasImage) await evidenceStore().set(`image/${id}`, await image.arrayBuffer(), { metadata: { contentType: image.type, fileName: image.name } });
    applyAction(state, editing ? "update-evidence" : "add-evidence", { evidence });
    await writeState(state);
    return json({ state });
  } catch (error) {
    return json({ error: error.message || (editing ? "증거 사진을 수정하지 못했습니다." : "증거 사진을 저장하지 못했습니다.") }, { status: 500 });
  }
}
