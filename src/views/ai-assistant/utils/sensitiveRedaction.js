function maskPhone(phone) {
  const s = String(phone || "").replace(/\D+/g, "");
  if (s.length === 11) return `${s.slice(0, 3)}****${s.slice(-4)}`;
  if (s.length >= 4) return `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
  return "业务员手机号";
}

export function redactQuoteSensitiveText(text, { hideUnlabeledSmsCode = false } = {}) {
  let out = String(text || "");
  if (!out) return "";

  if (hideUnlabeledSmsCode && /^\s*\d{4,8}\s*$/.test(out)) {
    return "[短信验证码已隐藏]";
  }

  out = out.replace(
    /((?:登录密码|登陆密码|平台密码|密码|口令|password|pwd)\s*[:：=]?\s*)([^\s,，;；。]+)/gi,
    (_, prefix) => `${prefix}[已隐藏]`
  );

  out = out.replace(
    /((?:短信验证码|验证码|校验码|code)\s*[:：=]?\s*)(\d{4,8})/gi,
    (_, prefix) => `${prefix}[已隐藏]`
  );

  out = out.replace(
    /((?:登录手机号|登陆手机号|验证码手机号|短信手机号|平台手机号|业务员手机号|业务员手机|登录手机|登陆手机|login_phone|phone|mobile)\s*[:：=]?\s*)(1\d{10})/gi,
    (_, prefix, phone) => `${prefix}${maskPhone(phone)}`
  );

  return out;
}

export function sanitizeQuoteUserText(text, fallback = "") {
  let out = String(text || "");
  if (!out.trim()) return fallback;
  const protectedValues = [];
  out = out.replace(
    /((?:车辆合格证|行驶证|身份证|车主|平台)?(?:发动机号|车架号|VIN|车型名称|车型|品牌型号|号牌号码|车牌号|身份证号|证件号)[^：:，。；\n]{0,12}[：:])([^，。；\n（）)]{2,64})/gi,
    (_, prefix, value) => {
      protectedValues.push(value);
      return `${prefix}【材料值${protectedValues.length - 1}】`;
    }
  );
  out = out.replace(
    /((?:车辆合格证|行驶证|身份证|车主)?(?:发动机号码|发动机号|发动机|车架号码|车架号|车辆识别代号|VIN码|VIN|车型名称|车型|品牌型号|车辆型号|车辆品牌\/车辆名称|车辆品牌\/车辆型号|号牌号码|车牌号码|车牌号|号牌|车牌|身份证号码|身份证号|证件号码|证件号)\s*(?:[:：=]?\s*))([\u4e00-\u9fa5A-Za-z0-9（）()·\-_/]{2,80})/gi,
    (_, prefix, value) => {
      protectedValues.push(value);
      return `${prefix}【材料值${protectedValues.length - 1}】`;
    }
  );

  if (/^\s*(No permission(?:\s+to\s+access\s+data)?|error_code\s*[:=]\s*6|无权限)\s*$/i.test(out)) {
    out = "接口暂无访问权限，请检查账号权限或稍后重试";
  } else if (/^\s*Internal Server Error\s*$/i.test(out)) {
    out = "服务器处理异常，请稍后重试";
  } else if (/^\s*(timeout|timed out|TimeoutError|超时)\s*$/i.test(out)) {
    out = "平台响应超时，请稍后重试";
  }

  out = out
    .replace(/\bPICC\b/gi, "人保")
    .replace(/\bCPIC\b/gi, "太平洋")
    .replace(/车架号\s*\/\s*VIN/gi, "车架号")
    .replace(/\bVIN\b/gi, "车架号")
    .replace(/\bOCR\b/gi, "文字识别")
    .replace(/\baccurate_basic\b/gi, "通用文字识别")
    .replace(/error_msg\s*[:=]\s*No permission(?:\s+to\s+access\s+data)?/gi, "接口暂无访问权限")
    .replace(/\bJSON\b/gi, "返回格式")
    .replace(/\bHTTP\s*=?\s*\d*/gi, "接口响应异常")
    .replace(/\bstatusText\b/gi, "平台返回提示")
    .replace(/\bresponse\b/gi, "平台返回")
    .replace(/\bdistance\s*=\s*\d+\b/gi, "滑块校验信息")
    .replace(/\bencodeKey\b/gi, "登录上下文")
    .replace(/\bJSESSIONID\b/gi, "登录会话")
    .replace(/\bUSER_TOKEN\b/gi, "登录令牌")
    .replace(/\bRSA\b/gi, "密码加密")
    .replace(/\b(?:KeyError|ValueError|TypeError|RuntimeError|Traceback|AxiosError|TimeoutError|ConnectionError|Exception)\b/gi, "")
    .replace(/\bERR_[A-Z_]+\b/g, "")
    .replace(/Network Error/gi, "网络连接异常")
    .replace(/Request failed/gi, "请求处理失败")
    .replace(/error_code\s*[:=]\s*[-\w.]+/gi, "")
    .replace(/error_msg\s*[:=]\s*[^，。；\n]+/gi, "")
    .replace(/status\s*[:=：]\s*[-\w.]+/gi, "")
    .replace(/body\s*[:=：]\s*.+/gi, "返回内容异常")
    .replace(/token|authorization|cookie|session|trace|stack|payload|debug/gi, "")
    .replace(/\b[A-Za-z][A-Za-z0-9_./:-]{2,}\b/g, "")
    .trim();

  protectedValues.forEach((value, index) => {
    out = out.replaceAll(`【材料值${index}】`, value);
  });

  out = out
    .split(/\n/)
    .map((line) =>
      line
        .replace(/[ \t\r\f\v]+([，。；、）])/g, "$1")
        .replace(/([（：])[ \t\r\f\v]+/g, "$1")
        .replace(/[，；： \t\r\f\v]+$/g, "")
        .replace(/[ \t\r\f\v]+/g, " ")
        .trim()
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out || fallback || "处理失败，请稍后重试";
}
