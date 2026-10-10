import assert from "node:assert/strict";
import test from "node:test";
import { normalizeChatPayload } from "./chatPayload.mjs";

const savedQuote = {
  ok: true,
  session_id: "session-1",
  intent: "quote",
  reply: "报价完成",
  data: { result_status: "success", payload: { material_saved: true, quote_result: { status: "success" } } },
};

test("streamed form submission keeps the full response and material_saved acknowledgement", () => {
  assert.equal(normalizeChatPayload(savedQuote), savedQuote);
  assert.equal(normalizeChatPayload(savedQuote).data.payload.material_saved, true);
});

test("ordinary axios and nested responses unwrap without losing business data", () => {
  assert.equal(normalizeChatPayload({ data: savedQuote, status: 200 }), savedQuote);
  assert.equal(normalizeChatPayload({ data: { data: savedQuote } }), savedQuote);
});

test("failed quotes and missing responses remain distinguishable", () => {
  const failed = { ok: true, reply: "报价失败", data: { result_status: "failed" } };
  assert.equal(normalizeChatPayload(failed), failed);
  assert.deepEqual(normalizeChatPayload({ data: { result_status: "success" } }), {});
  assert.deepEqual(normalizeChatPayload(null), {});
});
