// src/constants/index.js

/**
 * 角色常量 & 显示文案
 */
export const ROLE = {
  SUPER_ADMIN: "super_admin",
  MANAGER: "manager",
  SALES: "sales",
  FINANCE: "finance",
  MARKET: "market",
};

export const ROLE_LABEL_MAP = {
  [ROLE.SUPER_ADMIN]: "超级账号",
  [ROLE.MANAGER]: "经理账号",
  [ROLE.SALES]: "业务账号",
  [ROLE.FINANCE]: "财务账号",
  [ROLE.MARKET]: "市场账号",
};

/**
 * ✅ 团队常量（与后端 app/core/constants.py 保持一致）
 */
export const TEAM_NAMES = ["赣州团队", "南昌团队", "九江团队"];

/**
 * 订单状态文案
 */
export const ORDER_FINISHED_LABEL = {
  true: "已完成",
  false: "未完成",
};

export const ORDER_FINISHED_TAG_TYPE = {
  true: "success",
  false: "info",
};

export const ORDER_REBATE_LABEL = {
  true: "已返点",
  false: "未返点",
};

export const ORDER_REBATE_TAG_TYPE = {
  true: "success",
  false: "info",
};

export const ORDER_PAID_LABEL = {
  true: "已回款",
  false: "未回款",
};

export const ORDER_PAID_TAG_TYPE = {
  true: "success",
  false: "info",
};

/**
 * 图片槽位常量（与后端 / OCR 完全一致）
 */
export const IMAGE_SLOT = {
  VEHICLE_CERT: "vehicle_cert",
  IDCARD_FRONT: "idcard_front",
  IDCARD_BACK: "idcard_back",
  DRIVING_LICENSE_MAIN: "driving_license_main",
  DRIVING_LICENSE_SUB: "driving_license_sub",
  RELATED: "related",
};
