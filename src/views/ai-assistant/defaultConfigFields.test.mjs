import assert from "node:assert/strict";
import test from "node:test";
import {
  availableDefaultConfigFieldNames,
  canonicalizeDefaultConfigJointSales,
  defaultConfigPayloadMatchesSaved,
  omitSystemManagedDefaultConfigFields,
  shouldAddDefaultTemplateField,
} from "./defaultConfigFields.mjs";

test("template does not restore a removed or renamed field", () => {
  assert.equal(shouldAddDefaultTemplateField("第三者责任险", new Set(), new Set(["第三者责任险"]), new Set()), false);
  assert.equal(shouldAddDefaultTemplateField("途顺家安组合保险", new Set(["途家安顺保费"]), new Set(), new Set()), false);
  assert.equal(shouldAddDefaultTemplateField("途顺家安组合保险", new Set(), new Set(["途家安顺保费"]), new Set()), false);
  assert.equal(shouldAddDefaultTemplateField("途顺家安组合保险", new Set(), new Set(), new Set(["途家安顺保费"])), false);
  assert.equal(shouldAddDefaultTemplateField("第三者责任险", new Set(), new Set(), new Set()), true);
});

test("legacy joint-sales fields are renamed without restoring deleted values", () => {
  assert.deepEqual(canonicalizeDefaultConfigJointSales({ "途家安顺保费": "600" }, []), {
    default_values: { "途顺家安组合保险": "600" }, deleted_default_fields: [],
  });
  assert.deepEqual(canonicalizeDefaultConfigJointSales({}, ["途家安顺保费"]), {
    default_values: {}, deleted_default_fields: ["途顺家安组合保险"],
  });
  assert.deepEqual(canonicalizeDefaultConfigJointSales({ "途家安顺保费": "398", "途顺家安": "500" }, ["途家安顺保费"]), {
    default_values: { "途顺家安组合保险": "500" }, deleted_default_fields: [],
  });
});

test("fixed field choices exclude fields selected by other rows", () => {
  const allowed = ["交强", "机动车损失保险", "第三者责任险"];
  const fields = [
    { field_name: "交强" },
    { field_name: "第三者责任险" },
    { field_name: "" },
  ];
  assert.deepEqual(availableDefaultConfigFieldNames(allowed, fields, 0), ["交强", "机动车损失保险"]);
  assert.deepEqual(availableDefaultConfigFieldNames(allowed, fields, 2), ["机动车损失保险"]);
  assert.deepEqual(availableDefaultConfigFieldNames(allowed, [{ field_name: "交强" }, { field_name: "" }], 1), ["机动车损失保险", "第三者责任险"]);
  assert.deepEqual(availableDefaultConfigFieldNames(allowed, [{ field_name: "交强" }, { field_name: "第三者责任险" }]), ["机动车损失保险"]);
  assert.deepEqual(availableDefaultConfigFieldNames([], [{ field_name: "" }], 0), []);
  assert.deepEqual(
    availableDefaultConfigFieldNames(allowed, [{ field_name: "历史字段" }], 0),
    ["历史字段", ...allowed],
  );
});

test("system-managed protocol fields are hidden without becoming deletions", () => {
  assert.deepEqual(omitSystemManagedDefaultConfigFields({
    "交强": "20",
    "操作配置ID": "internal-id",
    "业务性质代码": "2",
    "业务性质名称": "专业代理业务",
    "operateConfigId": "legacy-id",
    "comCName": "历史机构",
    "agentType": "2",
    "prpCmain.handlerCode": "legacy-handler",
  }, ["业务性质代码", "机动车损失保险"]), {
    default_values: { "交强": "20" },
    deleted_default_fields: ["机动车损失保险"],
  });
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
