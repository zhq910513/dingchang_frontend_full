const STATUS_TITLES = {
  400: "请求参数有误",
  401: "未登录或登录已失效",
  403: "权限不足",
  404: "资源不存在",
  409: "数据冲突",
  413: "文件过大",
  415: "文件类型不支持",
  422: "参数校验失败",
  429: "请求过于频繁",
  500: "服务器内部错误",
  502: "网关错误",
  503: "服务暂不可用",
  504: "服务响应超时",
};

const COMMON_DETAIL_TRANSLATIONS = {
  "No permission": "权限不足：当前账号没有执行该操作的权限",
  "Order not found": "订单不存在或已被删除",
  "Not Found": "请求的资源不存在",
  "Missing X-Session-Token": "未登录或登录信息已失效：缺少会话令牌",
  "Invalid X-Session-Token": "登录信息无效，请重新登录",
  "Session expired": "登录已过期，请重新登录",
  "Only finished orders can be accessed in finance": "仅已完成订单可进入财务详情",
};

const FIELD_LABELS = {
  username: "用户名",
  password: "密码",
  role_name: "角色",
  team_name: "所属团队",
  team_names: "团队",
  customer_group_id: "客户",
  channel_group_id: "渠道",
  customer_code: "客户代码",
  customer_name: "客户名称",
  channel_code: "渠道代码",
  channel_name: "渠道名称",
  owner_name: "车主姓名",
  owner_phone: "车主电话",
  plate_no: "车牌号",
  vin: "车架号",
  engine_no: "发动机号",
  id_number: "证件号",
  first_register_date: "初登日期",
  file: "文件",
  message: "消息内容",
  order_id: "订单ID",
  slot_key: "材料槽位",
  storage_key: "文件存储标识",
  images: "图片材料",
  body: "请求体",
  query: "查询参数",
  path: "路径参数",
};

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return cleanText(String(value ?? "").replace(/<[^>]*>/g, " "));
}

function uniq(list) {
  return [...new Set(list.map(cleanText).filter(Boolean))];
}

function translateCommonDetail(detail) {
  const text = stripHtml(detail);
  if (!text) return "";
  if (/^internal server error$/i.test(text)) {
    return "服务器内部错误：后端没有返回详细原因，请查看后端日志；如果是报价助手平台配置，请确认后端已重启且报价助手新表已创建";
  }
  if (/ECONNREFUSED|proxy error|http proxy|trying to proxy|connect ECONN/i.test(text)) {
    return "本地开发代理无法连接后端服务：请确认后端已启动，并检查 VITE_API_PROXY_TARGET 是否指向正确端口";
  }
  if (/ECONNRESET|socket hang up/i.test(text)) {
    return "后端连接被中断：服务可能正在重启或处理超时，请稍后重试";
  }
  return COMMON_DETAIL_TRANSLATIONS[text] || text;
}

function translateValidationMessage(item) {
  const msg = cleanText(item?.msg || item?.message);
  const type = cleanText(item?.type).toLowerCase();

  if (type.includes("missing") || /field required/i.test(msg)) return "该字段必填";
  if (type.includes("int_parsing") || /valid integer/i.test(msg)) return "必须是整数";
  if (type.includes("float_parsing") || /valid number/i.test(msg)) return "必须是数字";
  if (type.includes("bool_parsing") || /valid boolean/i.test(msg)) return "必须是布尔值";
  if (type.includes("string_too_short") || /at least/i.test(msg)) {
    const minLength = item?.ctx?.min_length;
    return minLength ? `长度不能少于 ${minLength} 个字符` : "长度过短";
  }
  if (type.includes("string_too_long") || /at most/i.test(msg)) {
    const maxLength = item?.ctx?.max_length;
    return maxLength ? `长度不能超过 ${maxLength} 个字符` : "长度过长";
  }
  if (type.includes("greater_than_equal")) return `不能小于 ${item?.ctx?.ge}`;
  if (type.includes("less_than_equal")) return `不能大于 ${item?.ctx?.le}`;
  if (type.includes("value_error")) return translateCommonDetail(msg || "字段值不合法");
  if (msg) return translateCommonDetail(msg);
  return "字段值不合法";
}

function formatLoc(loc) {
  const parts = Array.isArray(loc) ? loc : [];
  const meaningful = parts
    .filter((part) => !["body", "query", "path"].includes(String(part)))
    .map((part) => FIELD_LABELS[String(part)] || String(part));
  return meaningful.length ? meaningful.join(".") : "请求参数";
}

function formatValidationDetail(detailList) {
  const lines = detailList
    .filter(isObject)
    .map((item) => `${formatLoc(item.loc)}：${translateValidationMessage(item)}`);
  const normalized = uniq(lines);
  if (!normalized.length) return "";
  if (normalized.length <= 6) return normalized.join("；");
  return `${normalized.slice(0, 6).join("；")}；等 ${normalized.length} 条校验错误`;
}

function extractDataMessage(data) {
  if (!data) return "";
  if (typeof data === "string") return translateCommonDetail(data);
  if (Array.isArray(data)) return formatValidationDetail(data);
  if (!isObject(data)) return "";

  const detail = data.detail;
  if (Array.isArray(detail)) return formatValidationDetail(detail);
  if (typeof detail === "string") return translateCommonDetail(detail);
  if (isObject(detail)) {
    return extractDataMessage(detail) || translateCommonDetail(JSON.stringify(detail));
  }

  for (const key of ["message", "error", "msg", "reason"]) {
    const value = data[key];
    if (typeof value === "string" && cleanText(value)) return translateCommonDetail(value);
    if (isObject(value)) {
      const nested = extractDataMessage(value);
      if (nested) return nested;
    }
  }

  return "";
}

function statusTitle(status) {
  return STATUS_TITLES[Number(status)] || (status ? `请求失败（HTTP ${status}）` : "请求失败");
}

function requestLabel(config) {
  const method = cleanText(config?.method).toUpperCase();
  const url = cleanText(config?.url || config?.baseURL);
  if (!method && !url) return "";
  if (!url) return method;
  return `${method || "REQUEST"} ${url}`;
}

function isCancelLike(error) {
  const msg = cleanText(error?.message || error);
  return error === "cancel" || error === "close" || msg === "cancel" || msg === "close";
}

function networkMessage(error) {
  const msg = cleanText(error?.message);
  const code = cleanText(error?.code).toUpperCase();
  const dataText = stripHtml(error?.response?.data || "");

  if (/timeout/i.test(msg) || code === "ECONNABORTED") {
    return "请求超时：服务器在限定时间内没有响应，请稍后重试";
  }
  if (/ECONNREFUSED|proxy error|http proxy|trying to proxy|connect ECONN/i.test(dataText)) {
    return "本地开发代理无法连接后端服务：请确认后端已启动，并检查 VITE_API_PROXY_TARGET 是否指向正确端口";
  }
  if (/network error/i.test(msg) || /failed to fetch/i.test(msg)) {
    return "网络异常：无法连接服务器，请检查网络、代理或本地服务是否启动";
  }
  if (code && !error?.response) {
    return `网络异常：${code}`;
  }
  return "";
}

export function getApiErrorDetail(error) {
  if (isCancelLike(error)) return "";

  const response = error?.response;
  const dataDetail = extractDataMessage(response?.data);
  if (dataDetail) return dataDetail;

  const net = networkMessage(error);
  if (net) return net;

  const message = cleanText(error?.message);
  if (message && !/^request failed with status code/i.test(message)) {
    return translateCommonDetail(message);
  }

  return "";
}

export function getApiErrorMessage(error, fallback = "操作失败", options = {}) {
  if (isCancelLike(error)) return "";

  const detail = getApiErrorDetail(error);
  const status = error?.response?.status;
  const title = statusTitle(status);
  const action = cleanText(fallback || options.action || "");
  const req = options.withRequest === false ? "" : requestLabel(error?.config);

  const prefix = action || title;
  const reason = detail || title;
  const main = prefix === reason ? reason : `${prefix}：${reason}`;
  return req ? `${main}（接口：${req}）` : main;
}

export function normalizeApiError(error) {
  if (!error || typeof error !== "object") return error;

  const detail = getApiErrorDetail(error);
  const message = getApiErrorMessage(error, "请求失败");

  try {
    error.apiErrorDetail = detail;
    error.apiErrorMessage = message;
  } catch {
    // ignore
  }

  if (error.response?.data && isObject(error.response.data) && detail) {
    try {
      error.response.data.raw_detail = error.response.data.detail;
      error.response.data.detail = detail;
    } catch {
      // ignore
    }
  }

  try {
    error.message = message;
  } catch {
    // ignore
  }

  return error;
}

export function getAuthExpiredMessage() {
  return "登录已过期或未登录，请重新登录。";
}
