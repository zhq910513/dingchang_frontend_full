import assert from "node:assert/strict";
import test from "node:test";
import { defaultConfigPayloadMatchesSaved, shouldAddDefaultTemplateField } from "./defaultConfigFields.mjs";

test("template does not restore a removed or renamed field", () => {
  assert.equal(shouldAddDefaultTemplateField("第三者责任险", new Set(), new Set(["第三者责任险"]), new Set()), false);
  assert.equal(shouldAddDefaultTemplateField("途顺家安", new Set(["途家安顺保费"]), new Set(), new Set()), false);
  assert.equal(shouldAddDefaultTemplateField("途顺家安", new Set(), new Set(["途家安顺保费"]), new Set()), false);
  assert.equal(shouldAddDefaultTemplateField("途顺家安", new Set(), new Set(), new Set(["途家安顺保费"])), false);
  assert.equal(shouldAddDefaultTemplateField("第三者责任险", new Set(), new Set(), new Set()), true);
});

test("save verification rejects stale values, unexpected old names and tombstones", () => {
  const payload = { platform_code: "PICC", account_type_name: "油车-旧", enabled: true,
    default_values: { "途顺家安": "500" }, deleted_default_fields: ["途家安顺保费"] };
  const saved = { ...payload, default_values: { ...payload.default_values }, deleted_default_fields: [...payload.deleted_default_fields] };
  assert.equal(defaultConfigPayloadMatchesSaved(saved, payload), true);
  assert.equal(defaultConfigPayloadMatchesSaved({ ...saved, default_values: { ...saved.default_values, "途家安顺保费": "398" } }, payload), false);
  assert.equal(defaultConfigPayloadMatchesSaved({ ...saved, default_values: { "途顺家安": "398" } }, payload), false);
  assert.equal(defaultConfigPayloadMatchesSaved({ ...saved, deleted_default_fields: [] }, payload), false);
});
