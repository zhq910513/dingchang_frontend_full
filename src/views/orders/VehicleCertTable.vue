<template>
  <div class="cert-full">
    <table class="cert-table">
      <colgroup>
        <col class="c-l1"/>
        <col class="c-v"/>
        <col class="c-v"/>
        <col class="c-v"/>
        <col class="c-l2"/>
        <col class="c-v2"/>
        <col class="c-v2"/>
        <col class="c-v2"/>
      </colgroup>

      <tbody>
      <tr>
        <td class="cell-label">1. 合格证编号</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.cert_no" :readonly="readonly"/>
        </td>
        <td class="cell-label">2. 发证日期</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.cert_issue_date" :readonly="readonly" placeholder="YYYY-MM-DD"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">3. 车辆制造企业名称</td>
        <td class="cell-value" colspan="7">
          <CellInput v-model="data.manufacturer_name" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">4. 车辆品牌/车辆名称</td>
        <td class="cell-value" colspan="7">
          <CellInput v-model="data.vehicle_brand_name" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">5. 车辆型号</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.vehicle_model" :readonly="readonly"/>
        </td>
        <td class="cell-label">6. 车辆识别代号/车架号</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.vin" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">7. 车身颜色</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.body_color" :readonly="readonly"/>
        </td>
        <td class="cell-value" colspan="4"></td>
      </tr>

      <tr>
        <td class="cell-label">8. 底盘型号/底盘ID</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.chassis_model_id" :readonly="readonly"/>
        </td>
        <td class="cell-value" colspan="4"></td>
      </tr>

      <tr>
        <td class="cell-label">9. 底盘合格证编号</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.chassis_cert_no" :readonly="readonly"/>
        </td>
        <td class="cell-label">10. 发动机型号</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.engine_model" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">11. 发动机号</td>
        <td class="cell-value" colspan="7">
          <CellInput v-model="data.engine_no" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">12. 燃料种类</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.fuel_type" :readonly="readonly"/>
        </td>

        <td class="cell-label">13. 排量和功率(mL/kW)</td>
        <td class="cell-value" colspan="3">
          <div class="split2">
            <div class="split-cell">
              <CellInput v-model="displacementParts[0]" :readonly="readonly" placeholder="排量(mL)"/>
            </div>
            <div class="split-cell">
              <CellInput v-model="displacementParts[1]" :readonly="readonly" placeholder="功率(kW)"/>
            </div>
          </div>
        </td>
      </tr>

      <tr>
        <td class="cell-label">14. 排放标准</td>
        <td class="cell-value" colspan="7">
          <CellInput v-model="data.emission_standard" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">15. 油耗</td>
        <td class="cell-value" colspan="7">
          <CellInput v-model="data.fuel_consumption" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">16. 外廓尺寸(mm)</td>
        <td class="cell-value">
          <CellInput v-model="dimParts[0]" :readonly="readonly" placeholder="长"/>
        </td>
        <td class="cell-value">
          <CellInput v-model="dimParts[1]" :readonly="readonly" placeholder="宽"/>
        </td>
        <td class="cell-value">
          <CellInput v-model="dimParts[2]" :readonly="readonly" placeholder="高"/>
        </td>

        <td class="cell-label">17. 货箱内部尺寸(mm)</td>
        <td class="cell-value">
          <CellInput v-model="cargoDimParts[0]" :readonly="readonly" placeholder="长"/>
        </td>
        <td class="cell-value">
          <CellInput v-model="cargoDimParts[1]" :readonly="readonly" placeholder="宽"/>
        </td>
        <td class="cell-value">
          <CellInput v-model="cargoDimParts[2]" :readonly="readonly" placeholder="高"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">18. 钢板弹簧片数(片)</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.leaf_spring_count" :readonly="readonly"/>
        </td>
        <td class="cell-label">19. 轮胎数</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.tire_count" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">20. 轮胎规格</td>
        <td class="cell-value" colspan="7">
          <CellInput v-model="data.tire_spec" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">21. 轮距(前/后)(mm)</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="wheelTrackParts[0]" :readonly="readonly" placeholder="前轮距"/>
        </td>
        <td class="cell-value" colspan="4">
          <CellInput v-model="wheelTrackParts[1]" :readonly="readonly" placeholder="后轮距"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">22. 轴距(mm)</td>
        <td class="cell-value" colspan="7">
          <CellInput v-model="data.wheel_base" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">23. 轴荷(kg)</td>
        <td class="cell-value" colspan="7">
          <CellInput v-model="data.axle_load_kg" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">24. 轴数</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.axle_count" :readonly="readonly"/>
        </td>
        <td class="cell-label">25. 转向形式</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.steering_type" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">26. 整备质量(kg)</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.curb_weight" :readonly="readonly"/>
        </td>
        <td class="cell-label">27. 总质量(kg)</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.gross_weight" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">28. 额定载质量(kg)</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.rated_load" :readonly="readonly"/>
        </td>
        <td class="cell-label">29. 额定牵引总质量(kg)</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.rated_traction_weight" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">30. 载质量利用系数</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.load_utilization_factor" :readonly="readonly"/>
        </td>
        <td class="cell-label">31. 准牵引总质量(kg)</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.allowed_traction_weight" :readonly="readonly"/>
        </td>
      </tr>

      <tr>
        <td class="cell-label">32. 半挂车鞍座最大允许总质量(kg)</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.semi_trailer_weight" :readonly="readonly"/>
        </td>
        <td class="cell-value" colspan="4"></td>
      </tr>

      <tr>
        <td class="cell-label">33. 驾驶室准乘人数(人)</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.cab_passenger_count" :readonly="readonly"/>
        </td>
        <td class="cell-value" colspan="4"></td>
      </tr>

      <tr>
        <td class="cell-label">34. 额定载客(人)</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.approved_passenger_count" :readonly="readonly"/>
        </td>
        <td class="cell-value" colspan="4"></td>
      </tr>

      <tr>
        <td class="cell-label">35. 车辆制造日期</td>
        <td class="cell-value" colspan="3">
          <CellInput v-model="data.manufacture_date" :readonly="readonly" placeholder="YYYY-MM-DD"/>
        </td>
        <td class="cell-value" colspan="4"></td>
      </tr>

      <tr>
        <td class="cell-label">36. 备注</td>
        <td class="cell-value" colspan="7">
          <CellInput v-model="data.cert_remark" :readonly="readonly"/>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import {computed, defineComponent, h, ref, watch} from "vue";
import {ElInput} from "element-plus";

const props = defineProps({
  data: {type: Object, required: true},
  readonly: {type: Boolean, default: false},
});

const data = props.data; // shallow readonly 允许改 nested（保持你当前项目风格）

function splitParts(val, expected, mode) {
  const s = val === null || val === undefined ? "" : String(val).trim();
  if (!s) return Array.from({length: expected}, () => "");

  let parts = [];
  if (mode === "x3") parts = s.split(/[xX×\*\s]+/).filter(Boolean);
  else if (mode === "x2") parts = s.split(/[\/／\s\|]+/).filter(Boolean);
  else parts = [s];

  const out = Array.from({length: expected}, (_, i) => parts[i] ?? "");
  if (parts.length > expected) out[expected - 1] = parts.slice(expected - 1).join(" ");
  return out;
}

function joinParts(parts, mode) {
  const cleaned = (parts || []).map((x) => String(x || "").trim()).filter(Boolean);
  if (!cleaned.length) return "";
  if (mode === "x3") return cleaned.join("×");
  if (mode === "x2") return cleaned.join("/");
  return cleaned.join(" ");
}

/** 拆格本地状态（保证详情/创建显示完全一致） */
const displacementParts = ref(["", ""]);
const dimParts = ref(["", "", ""]);
const cargoDimParts = ref(["", "", ""]);
const wheelTrackParts = ref(["", ""]);

function refreshFromData() {
  displacementParts.value = splitParts(data.displacement_and_power, 2, "x2");
  dimParts.value = splitParts(data.overall_dimensions, 3, "x3");
  cargoDimParts.value = splitParts(data.cargo_dimensions, 3, "x3");
  wheelTrackParts.value = splitParts(data.wheel_track, 2, "x2");
}

watch(
    () => [data.displacement_and_power, data.overall_dimensions, data.cargo_dimensions, data.wheel_track],
    () => refreshFromData(),
    {immediate: true}
);

// 只在可编辑时，把拆格回写到聚合字段
watch(
    displacementParts,
    (v) => {
      if (props.readonly) return;
      data.displacement_and_power = joinParts(v, "x2");
    },
    {deep: true}
);

watch(
    dimParts,
    (v) => {
      if (props.readonly) return;
      data.overall_dimensions = joinParts(v, "x3");
    },
    {deep: true}
);

watch(
    cargoDimParts,
    (v) => {
      if (props.readonly) return;
      data.cargo_dimensions = joinParts(v, "x3");
    },
    {deep: true}
);

watch(
    wheelTrackParts,
    (v) => {
      if (props.readonly) return;
      data.wheel_track = joinParts(v, "x2");
    },
    {deep: true}
);

/** 单元格输入/显示组件：同一套表格，readonly 只是渲染不同 */
const CellInput = defineComponent({
  name: "CellInput",
  props: {
    modelValue: {type: [String, Number], default: ""},
    readonly: {type: Boolean, default: false},
    placeholder: {type: String, default: ""},
  },
  emits: ["update:modelValue"],
  setup(p, {emit}) {
    const text = computed(() => {
      const v = p.modelValue;
      const s = v === null || v === undefined ? "" : String(v).trim();
      return s ? s : "-";
    });

    return () =>
        p.readonly
            ? h("div", {class: "val-text", title: text.value}, text.value)
            : h(ElInput, {
              modelValue: p.modelValue ?? "",
              "onUpdate:modelValue": (v) => emit("update:modelValue", v),
              clearable: true,
              placeholder: p.placeholder || "",
              class: "fv helpslim",
            });
  },
});
</script>

<style scoped>
.cert-full {
  width: 100%;
  overflow: auto;
  border-radius: 12px;
  border: 1px solid rgba(60, 60, 60, 0.10);
  background: rgba(255, 255, 255, 0.70);
}

.cert-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.cert-table td {
  border: 1px solid rgba(60, 60, 60, 0.14);
  padding: 6px 8px;
  vertical-align: middle;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.95);
}

.cell-label {
  background: rgba(31, 42, 68, 0.03);
  font-weight: 800;
  color: rgba(31, 42, 68, 0.62);
  white-space: nowrap;
}

.cell-value {
  background: rgba(255, 255, 255, 0.80);
  font-weight: 800;
}

.c-l1 {
  width: 150px;
}

.c-l2 {
  width: 180px;
}

.c-v,
.c-v2 {
  width: 80px;
}

/* 拆格容器：保持详情/创建一致的视觉细节 */
.split2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(60, 60, 60, 0.12);
}

.split-cell {
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.7);
}

.split-cell + .split-cell {
  border-left: 1px solid rgba(60, 60, 60, 0.12);
}

/* readonly 显示：对齐输入框的高度/密度 */
.val-text {
  min-height: 28px;
  display: flex;
  align-items: center;
  color: rgba(31, 42, 68, 0.92);
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fv :deep(.el-input__wrapper) {
  border-radius: 10px;
}

/* 表格里输入稍微更紧凑 */
.helpslim :deep(.el-input__wrapper) {
  padding-top: 2px;
  padding-bottom: 2px;
}
</style>
