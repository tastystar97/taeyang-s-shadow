import { getStore } from "@netlify/blobs";
import { freshState } from "./default-state.mjs";

const KEY = "shared-state";

function stateStore() {
  return getStore({ name: "taeyang-city-branch", consistency: "strong" });
}

export async function readState() {
  const store = stateStore();
  const state = await store.get(KEY, { type: "json" });
  if (state) return state;
  const initial = freshState();
  await store.setJSON(KEY, initial);
  return initial;
}

export async function writeState(state) {
  await stateStore().setJSON(KEY, state);
  return state;
}
