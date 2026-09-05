import { getStore } from '@netlify/blobs';
import { freshState } from './default-state.mjs';
const KEY = 'shared-state';
const ETAG = Symbol('stored-etag');
const stateStore = () => getStore({ name: 'taeyang-city-branch', consistency: 'strong' });
export async function readState() {
  const store = stateStore();
  let result = await store.getWithMetadata(KEY, { type: 'json' });
  if (!result) {
    await store.setJSON(KEY, freshState(), { onlyIfNew: true });
    result = await store.getWithMetadata(KEY, { type: 'json' });
  }
  if (!result) throw new Error('공유 기록을 초기화하지 못했습니다.');
  Object.defineProperty(result.data, ETAG, { value: result.etag });
  return result.data;
}
export async function writeState(state, original = state) {
  if (!original[ETAG]) throw new Error('저장할 기록의 버전이 없습니다.');
  const result = await stateStore().setJSON(KEY, state, { onlyIfMatch: original[ETAG] });
  return result.modified ? state : false;
}
