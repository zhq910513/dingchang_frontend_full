// src/composables/useOrderFieldConfig.js
import {computed, ref} from "vue";
import http from "../api/http";

// -------------------------
// 仅支持新版 options 结构：
// - null/undefined -> []
// - Array -> Array（允许直接给数组）
// - Object -> 读取 { items: [...] }
// 不再兼容 JSON 字符串 / 旧 options_json
// -------------------------
function parseOptions(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;

    if (typeof raw === "object" && raw !== null) {
        const items = raw.items;
        return Array.isArray(items) ? items : [];
    }

    return [];
}

/**
 * 统一读取后端字段配置（默认 module=order）
 * 后端接口：GET /field-config/form-config
 * 返回结构：[{ group_key, group_name, fields: [{ field_name, label, type, required, visible, editable, sort, options, validators, extra }] }]
 */
export function useOrderFieldConfig() {
    const loadingConfig = ref(false);
    const groups = ref([]);

    const allFields = computed(() => {
        const flat = [];

        (groups.value || []).forEach((g) => {
            (g.fields || []).forEach((f) => flat.push(f));
        });

        flat.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

        return flat
            .map((f) => {
                const key = f.field_name;
                const label = f.label ?? "";
                const type = f.type ?? "text";
                const extra = f.extra ?? {};

                const uiDefaultOrder =
                    typeof extra.ui_default_list_order === "number"
                        ? extra.ui_default_list_order
                        : null;

                return {
                    key,
                    label,
                    type,
                    sort: f.sort ?? 0,
                    required: !!f.required,
                    editable: f.editable !== false,
                    options: parseOptions(f.options),

                    // 订单列表：仅从 extra 读取（不再兼容旧字段）
                    show_in_list: extra.show_in_list === true,
                    list_width: extra.list_width ?? 150,

                    // 财务列表：仅从 extra 读取
                    show_in_finance_list: extra.show_in_finance_list === true,
                    finance_list_width: extra.finance_list_width ?? undefined,

                    // UI 默认列表顺序（仅从 extra 读取）
                    ui_default_list: extra.ui_default_list === true,
                    ui_default_list_order: uiDefaultOrder,
                };
            })
            .filter((f) => !!f.key);
    });

    const listFields = computed(() => {
        const picked = allFields.value.filter((f) => f.show_in_list);
        if (picked.length) {
            return [...picked].sort((a, b) => {
                const ao =
                    a.ui_default_list_order != null ? a.ui_default_list_order : a.sort ?? 0;
                const bo =
                    b.ui_default_list_order != null ? b.ui_default_list_order : b.sort ?? 0;
                return ao - bo;
            });
        }
        return allFields.value.slice(0, 5);
    });

    // 财务列表字段：显式 show_in_finance_list 优先；排序同 ui_default_list_order
    const financeFields = computed(() => {
        const explicit = allFields.value.filter((f) => f.show_in_finance_list);
        if (explicit.length) {
            return [...explicit].sort((a, b) => {
                const ao =
                    a.ui_default_list_order != null ? a.ui_default_list_order : a.sort ?? 0;
                const bo =
                    b.ui_default_list_order != null ? b.ui_default_list_order : b.sort ?? 0;
                return ao - bo;
            });
        }

        const fromOrderList = allFields.value.filter((f) => f.show_in_list);
        if (fromOrderList.length) {
            const sorted = [...fromOrderList].sort((a, b) => {
                const ao =
                    a.ui_default_list_order != null ? a.ui_default_list_order : a.sort ?? 0;
                const bo =
                    b.ui_default_list_order != null ? b.ui_default_list_order : b.sort ?? 0;
                return ao - bo;
            });
            return sorted.slice(0, 3);
        }

        return allFields.value.slice(0, 3);
    });

    async function loadConfig(module = "order") {
        loadingConfig.value = true;
        try {
            const res = await http.get("/field-config/form-config", {
                params: {module},
            });
            groups.value = res.data || [];
        } catch (e) {
            console.error(e);
            groups.value = [];
        } finally {
            loadingConfig.value = false;
        }
    }

    return {
        groups,
        allFields,
        listFields,
        financeFields,
        loadingConfig,
        loadConfig,
    };
}
