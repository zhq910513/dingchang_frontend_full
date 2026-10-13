const jointSalesFieldNames = new Set(["途顺家安", "途顺家安组合保险", "途家安顺保费", "途家安顺", "途家安顺非车保费"]);
const jointSalesCanonicalName = "途顺家安组合保险";
const jointSalesNamePriority = [jointSalesCanonicalName, "途顺家安", "途家安顺保费", "途家安顺", "途家安顺非车保费"];
const systemManagedDefaultConfigFieldNames = new Set([
  "归属机构代码",
  "归属机构名称",
  "机构代码",
  "机构名称",
  "操作机构代码",
  "操作机构名称",
  "出单机构代码",
  "操作配置ID",
  "操作配置名称",
  "车型配置ID",
  "业务性质代码",
  "业务性质名称",
  "代理机构代码",
  "代理机构名称",
  "操作员代码",
  "操作员名称",
  "经办人代码",
  "经办人名称",
  "comCode",
  "comID",
  "comId",
  "comCName",
  "makecom",
  "makeCom",
  "makecomName",
  "comName",
  "organizationName",
  "opconfComCode",
  "opconf_makecomCode",
  "operateConfigId",
  "operateConfigID",
  "operationConfigId",
  "operateConfigName",
  "configName",
  "selectedOperateConfigId",
  "selectedOperateConfig",
  "businesNature",
  "businesNatureName",
  "businessNature",
  "businessNatureName",
  "agentCode",
  "agentName",
  "agentType",
  "operateCode",
  "operateName",
  "handlerCode",
  "handlerName",
  "handler1Code",
  "handler1Name",
  "prpCmain.comCode",
  "prpCmain.businesNature",
  "prpCmain.agentCode",
  "prpCmain.handlerCode",
  "prpCmain.handler1Code",
  "prpCmain.operateCode",
  "送修码启用",
  "送修码",
  "送修码代码",
  "送修码名称",
  "送修码机构",
  "专管代码",
  "专管名称",
  "monopolyCode",
  "monopolyName",
  "groupCodeValidStatus",
]);

export function canonicalizeDefaultConfigJointSales(values = {}, deleted = []) {
  const source = values && typeof values === "object" ? values : {};
  const preferred = jointSalesNamePriority.find((name) => Object.hasOwn(source, name));
  const defaultValues = {};
  for (const [name, value] of Object.entries(source)) {
    if (jointSalesFieldNames.has(name)) {
      if (!Object.hasOwn(defaultValues, jointSalesCanonicalName)) defaultValues[jointSalesCanonicalName] = source[preferred];
    } else {
      defaultValues[name] = value;
    }
  }
  const deletedNames = [...new Set((deleted || []).map((name) => jointSalesFieldNames.has(name) ? jointSalesCanonicalName : name))]
    .filter((name) => !Object.hasOwn(defaultValues, name));
  return { default_values: defaultValues, deleted_default_fields: deletedNames };
}

export function omitSystemManagedDefaultConfigFields(values = {}, deleted = []) {
  const editableValues = {};
  for (const [name, value] of Object.entries(values && typeof values === "object" ? values : {})) {
    if (!systemManagedDefaultConfigFieldNames.has(String(name || "").trim())) editableValues[name] = value;
  }
  const editableDeleted = [...new Set((deleted || []).map((name) => String(name || "").trim()).filter(Boolean))]
    .filter((name) => !systemManagedDefaultConfigFieldNames.has(name));
  return { default_values: editableValues, deleted_default_fields: editableDeleted };
}

export function availableDefaultConfigFieldNames(allowedNames = [], fields = [], rowIndex = -1) {
  const allowed = [...new Set((allowedNames || []).map((name) => String(name || "").trim()).filter(Boolean))];
  const rows = Array.isArray(fields) ? fields : [];
  const current = rowIndex >= 0 ? String(rows[rowIndex]?.field_name || "").trim() : "";
  const selectedElsewhere = new Set(
    rows
      .map((field, index) => index === rowIndex ? "" : String(field?.field_name || "").trim())
      .filter(Boolean),
  );
  const available = allowed.filter((name) => name === current || !selectedElsewhere.has(name));
  if (current && !available.includes(current)) available.unshift(current);
  return available;
}

export function shouldAddDefaultTemplateField(name, currentNames, initialNames, deletedNames) {
  if (currentNames.has(name) || initialNames.has(name) || deletedNames.has(name)) return false;
  if (jointSalesFieldNames.has(name)) {
    return ![...currentNames, ...initialNames, ...deletedNames].some((key) => jointSalesFieldNames.has(key));
  }
  return true;
}

export function defaultConfigPayloadMatchesSaved(config, payload) {
  if (!config || !payload) return false;
  if (String(config.platform_code || "").trim().toUpperCase() !== String(payload.platform_code || "").trim().toUpperCase()) return false;
  if (String(config.account_type_name || "").trim() !== String(payload.account_type_name || "").trim()) return false;
  if (!!config.enabled !== !!payload.enabled) return false;
  const expected = payload.default_values && typeof payload.default_values === "object" ? payload.default_values : {};
  const actual = config.default_values && typeof config.default_values === "object" ? config.default_values : {};
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(actual).sort();
  if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) return false;
  for (const key of expectedKeys) {
    if (String(actual[key] ?? "") !== String(expected[key] ?? "")) return false;
  }
  const expectedDeleted = new Set((payload.deleted_default_fields || []).map((item) => String(item || "").trim()).filter(Boolean));
  const actualDeleted = new Set((config.deleted_default_fields || []).map((item) => String(item || "").trim()).filter(Boolean));
  if (expectedDeleted.size !== actualDeleted.size) return false;
  for (const key of expectedDeleted) if (!actualDeleted.has(key)) return false;
  return true;
}
