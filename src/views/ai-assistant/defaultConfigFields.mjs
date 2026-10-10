const jointSalesFieldNames = new Set(["途顺家安", "途顺家安组合保险", "途家安顺保费", "途家安顺", "途家安顺非车保费"]);
const jointSalesCanonicalName = "途顺家安组合保险";
const jointSalesNamePriority = [jointSalesCanonicalName, "途顺家安", "途家安顺保费", "途家安顺", "途家安顺非车保费"];

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
