<!-- src/views/NoPermission.vue -->
<template>
  <div style="padding: 24px;">
    <el-result
      icon="warning"
      title="无权限"
      sub-title="你当前账号没有权限访问该模块"
    >
      <template #extra>
        <el-button type="primary" @click="goHome">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

function goHome() {
  router.push("/orders/all");
}
</script>
