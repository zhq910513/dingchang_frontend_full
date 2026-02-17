// src/utils/statusFormat.js

import {
  ORDER_FINISHED_LABEL,
  ORDER_FINISHED_TAG_TYPE,
  ORDER_REBATE_LABEL,
  ORDER_REBATE_TAG_TYPE,
  ORDER_PAID_LABEL,
  ORDER_PAID_TAG_TYPE,
} from "../constants";

/**
 * 工具函数都接收“任意类型值”，内部统一转成 true/false 再格式化
 */

function toBool(v) {
  return !!v;
}

/* ====== 完成状态 ====== */

export function formatFinishedLabel(v) {
  const b = toBool(v);
  return ORDER_FINISHED_LABEL[String(b)];
}

export function finishedTagType(v) {
  const b = toBool(v);
  return ORDER_FINISHED_TAG_TYPE[String(b)];
}

/* ====== 返点状态 ====== */

export function formatRebateLabel(v) {
  const b = toBool(v);
  return ORDER_REBATE_LABEL[String(b)];
}

export function rebateTagType(v) {
  const b = toBool(v);
  return ORDER_REBATE_TAG_TYPE[String(b)];
}

/* ====== 回款状态 ====== */

export function formatPaidLabel(v) {
  const b = toBool(v);
  return ORDER_PAID_LABEL[String(b)];
}

export function paidTagType(v) {
  const b = toBool(v);
  return ORDER_PAID_TAG_TYPE[String(b)];
}
