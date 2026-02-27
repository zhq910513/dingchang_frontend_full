<!-- src/App.vue -->
<template>
  <router-view />
</template>

<script setup>
</script>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  background: #f5f6f8;
}

/* ✅ 只在 Dashboard 挂载时加这个类，不再误伤登录页滚动 */
body.app-shell-lock {
  overflow: hidden;
}

* {
  box-sizing: border-box;
}

/* 让 Element Plus 容器体系在根节点下高度链路完整 */
#app,
.el-container {
  min-height: 0;
}

.el-main {
  min-height: 0;
}

/* ✅ 全局移动端优化：不改功能，只改排版/可用性 */
@media (max-width: 768px) {
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
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 10px;
  }

  .toolbar-label {
    width: auto !important;
    line-height: 1.2 !important;
    padding-top: 0 !important;
  }

  .toolbar-content {
    width: 100%;
    min-width: 0;
  }

  .toolbar-fields {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    width: 100%;
  }

  .toolbar-input {
    width: 100% !important;
    min-width: 0 !important;
  }

  .toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-start !important;
  }

  .toolbar-actions .el-button {
    margin-left: 0 !important;
  }

  .finance-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 8px;
  }

  /* 订单筛选：PC 4 列 => 手机 1 列 */
  .filters-form .el-col {
    flex: 0 0 100% !important;
    max-width: 100% !important;
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