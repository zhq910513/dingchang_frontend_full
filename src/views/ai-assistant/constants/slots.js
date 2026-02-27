// src/views/ai-assistant/constants/slots.js
export const AI_IMAGE_SLOTS = [
  { key: "vehicle_cert", label: "合格证", multiple: false, ocrEnabled: true },
  { key: "idcard_front", label: "身份证正面", multiple: false, ocrEnabled: true },
  { key: "idcard_back", label: "身份证反面", multiple: false, ocrEnabled: true },
  { key: "driving_license_main", label: "行驶证主页", multiple: false, ocrEnabled: true },
  { key: "driving_license_sub", label: "行驶证副页", multiple: false, ocrEnabled: true },
  { key: "related", label: "相关图片(多张)", multiple: true, ocrEnabled: false },
];

export function slotLabel(slotKey) {
  return AI_IMAGE_SLOTS.find((s) => s.key === slotKey)?.label || slotKey;
}

export function isMultipleSlot(slotKey) {
  return !!AI_IMAGE_SLOTS.find((s) => s.key === slotKey)?.multiple;
}
