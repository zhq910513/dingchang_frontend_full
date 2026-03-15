import {computed, ref} from "vue";
import http from "@/api/http";

function parseOptions(raw) {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw;

    if (typeof raw === "object") {
        const items = raw.items;
        return Array.isArray(items) ? items : [];
    }

    return [];
}

function toNumberOr(defaultValue, v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : defaultValue;
}

function toFiniteNumberOrNull(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function normalizeField(raw) {
    const f = raw && typeof raw === "object" ? raw : {};
    const extra = f.extra && typeof f.extra === "object" ? f.extra : {};

    const key = String(f.field_name ?? "").trim();
    if (!key) return null;

    const uiDefaultListOrder = toFiniteNumberOrNull(extra.ui_default_list_order);

    const financeListWidthRaw = extra.finance_list_width;
    const financeListWidth =
        financeListWidthRaw === undefined || financeListWidthRaw === null
            ? undefined
            : toNumberOr(undefined, financeListWidthRaw);

    return {
        key,
        field_name: key,
        label: String(f.label ?? ""),
        type: String(f.type ?? "text"),
        sort: toNumberOr(0, f.sort),

        required: f.required === true,
        editable: f.editable !== false,
        visible: f.visible !== false,

        options: parseOptions(f.options),
        validators: f.validators && typeof f.validators === "object" ? f.validators : null,
        extra,

        show_in_list: extra.show_in_list === true,
        list_width: toNumberOr(150, extra.list_width),

        show_in_finance_list: extra.show_in_finance_list === true,
        finance_list_width: financeListWidth,

        ui_default_list: extra.ui_default_list === true,
        ui_default_list_order: uiDefaultListOrder,
    };
}

function sortByUiOrderThenSort(arr) {
    return [...arr].sort((a, b) => {
        const ao = a.ui_default_list_order ?? a.sort ?? 0;
        const bo = b.ui_default_list_order ?? b.sort ?? 0;
        return ao - bo;
    });
}

export function useOrderFieldConfig() {
    const loadingConfig = ref(false);
    const groups = ref([]);

    const allFields = computed(() => {
        const flat = [];
        const groupList = Array.isArray(groups.value) ? groups.value : [];

        for (const g of groupList) {
            const fields = Array.isArray(g?.fields) ? g.fields : [];
            for (const rawField of fields) {
                const nf = normalizeField(rawField);
                if (nf) flat.push(nf);
            }
        }

        flat.sort((a, b) => a.sort - b.sort || String(a.key).localeCompare(String(a.key)));
        return flat;
    });

    const listFields = computed(() => {
        const explicit = allFields.value.filter((f) => f.show_in_list);
        if (explicit.length) return sortByUiOrderThenSort(explicit);
        return allFields.value.slice(0, 5);
    });

    const financeFields = computed(() => {
        const explicit = allFields.value.filter((f) => f.show_in_finance_list);
        if (explicit.length) return sortByUiOrderThenSort(explicit);

        const fromOrderList = allFields.value.filter((f) => f.show_in_list);
        if (fromOrderList.length) return sortByUiOrderThenSort(fromOrderList).slice(0, 3);

        return allFields.value.slice(0, 3);
    });

    async function loadConfig(module = "order") {
        loadingConfig.value = true;
        try {
            const res = await http.get("/field-config/form-config", {
                params: {module},
            });
            groups.value = Array.isArray(res?.data) ? res.data : [];
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
