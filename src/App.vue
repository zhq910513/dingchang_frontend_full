<!-- src/App.vue -->
<template>
  <router-view />
</template>

<script setup>
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
}

* {
  box-sizing: border-box;
}

/* ✅ 全局移动端优化：不改功能，只改排版/可用性 */
@media (max-width: 768px) {
  /* 页面容器：给小屏一点呼吸空间 */
  .page {
    padding: 10px 10px 14px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .header-actions {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* 顶部工具条：从一行多列变为纵向堆叠 */
  .toolbar-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .toolbar-main {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-input {
    width: 100% !important;
    min-width: 0 !important;
  }

  /* 订单筛选：PC 4 列 => 手机 1 列 */
  .filters-form .el-col {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  .toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-start;
  }

  .finance-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 8px;
  }

  /* 表格：允许横向滚动，避免内容被挤成乱码 */
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .table-scroll .el-table {
    min-width: 980px;
  }
}
</style>
