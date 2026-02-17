<!-- src/views/Login.vue -->
<template>
  <div class="login-page">
    <div class="bg-blobs" aria-hidden="true">
      <span class="blob b1"></span>
    </div>

    <div class="login-shell">
      <el-card class="login-card" shadow="never">
        <div class="card-inner">
          <div class="brand">
            <div class="brand-left">
              <div class="logo-wrap">
                <img src="/logo.png" alt="Logo" class="logo" />
              </div>
              <div class="brand-text">
                <div class="brand-title">订单管理系统</div>
                <div class="brand-subtitle">欢迎回来，请登录继续</div>
              </div>
            </div>

            <el-tag size="small" type="info" class="brand-tag">v1</el-tag>
          </div>

          <el-form class="login-form" :model="form" label-width="72px" @keyup.enter="doLogin">
            <el-form-item label="用户名" class="form-item">
              <el-input v-model="form.username" autocomplete="username" placeholder="请输入用户名" clearable>
                <template #prefix>
                  <el-icon>
                    <User />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="密码" class="form-item">
              <el-input
                v-model="form.password"
                type="password"
                show-password
                autocomplete="current-password"
                placeholder="请输入密码"
                clearable
              >
                <template #prefix>
                  <el-icon>
                    <Lock />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-button class="login-btn" type="primary" :loading="loading" @click="doLogin"> 登录 </el-button>

            <div class="footer-note">登录即表示你同意系统的使用规范与审计记录。</div>
          </el-form>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { login } from "../api/auth";
import { useSessionStore } from "../store/session";
import { ElMessage } from "element-plus";
import { Lock, User } from "@element-plus/icons-vue";
import { ROLE } from "../constants";

const router = useRouter();
const route = useRoute();
const store = useSessionStore();

const form = reactive({
  username: "",
  password: "",
});

const loading = ref(false);

function defaultHomeByRole(roleName) {
  // ✅ 市场账号默认进入渠道管理
  if (roleName === ROLE.MARKET) return "/channels";
  // ✅ 财务默认进入财务管理，避免卡在“订单无权限”
  if (roleName === ROLE.FINANCE) return "/finance";
  return "/orders/all";
}

function isAllowedPath(roleName, path) {
  const p = String(path || "");
  if (!p.startsWith("/")) return false;

  // ✅ 财务不能看订单
  if (roleName === ROLE.FINANCE && p.startsWith("/orders")) return false;

  // ✅ 业务员不能看财务
  if (roleName === ROLE.SALES && p.startsWith("/finance")) return false;

  // ✅ 账号管理（后端也限制：仅 super_admin / manager）
  if ((roleName === ROLE.SALES || roleName === ROLE.FINANCE) && p.startsWith("/users")) {
    return false;
  }

  return true;
}

function hasChinese(s) {
  return /[\u4e00-\u9fa5]/.test(String(s || ""));
}

function getLoginErrorMessage(e) {
  const status = e?.response?.status;
  const detail = e?.response?.data?.detail;
  const msg = e?.message;

  // 后端 detail 如果是中文，优先展示（避免丢失精确信息）
  if (detail && typeof detail === "string" && hasChinese(detail)) return detail;

  // 网络/超时等 axios 常见英文
  const m = String(msg || "");
  if (/timeout/i.test(m) || /ECONNABORTED/i.test(String(e?.code || ""))) {
    return "请求超时，请检查网络后重试";
  }
  if (/Network Error/i.test(m)) {
    return "网络异常，请检查网络连接";
  }

  // 按 HTTP 状态码给中文兜底（不猜测具体业务语义）
  if (status === 401) return "登录失败：账号或密码不正确";
  if (status === 403) return "登录失败：当前账号无权限";
  if (status >= 500) return "服务器异常，请稍后重试";
  if (status) return "登录失败，请稍后重试";

  return "登录失败，请检查网络后重试";
}

async function redirectAfterLogin(roleName) {
  const redirect = route.query.redirect;
  const redirectPath = typeof redirect === "string" && redirect.startsWith("/") ? redirect : "";

  if (redirectPath && isAllowedPath(roleName, redirectPath)) {
    await router.replace(redirectPath);
  } else {
    await router.replace(defaultHomeByRole(roleName));
  }
}

onMounted(async () => {
  if (!store.isLoggedIn) return;
  // ✅ 已登录也尊重 redirect（并校验权限）
  await redirectAfterLogin(store.roleName);
});

async function doLogin() {
  if (loading.value) return;

  const username = String(form.username || "").trim();
  const password = String(form.password || "");

  if (!username || !password) {
    ElMessage.warning("请输入用户名和密码");
    return;
  }

  loading.value = true;
  try {
    const resp = await login({ username, password });

    const token = resp?.data?.session_token || "";
    const user = resp?.data?.user || null;
    const roleName = user?.role_name || "";

    if (!token) {
      ElMessage.error("登录失败：登录信息异常，请联系管理员");
      return;
    }
    if (!roleName) {
      ElMessage.error("登录失败：账号权限信息异常，请联系管理员");
      return;
    }

    store.setToken(token);
    store.setRoleName(roleName);
    store.setUser(user);

    ElMessage.success("登录成功");
    await redirectAfterLogin(roleName);
  } catch (e) {
    console.error(e);
    ElMessage.error(getLoginErrorMessage(e));
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
  background: radial-gradient(1200px 600px at 20% 20%, #eaf2ff 0%, transparent 60%),
    radial-gradient(1000px 520px at 80% 30%, #f3ecff 0%, transparent 55%),
    linear-gradient(135deg, #f6f8ff 0%, #f7f7fb 55%, #f5fbff 100%);
}

.bg-blobs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  filter: blur(0.5px);
}

.blob {
  position: absolute;
  border-radius: 999px;
  opacity: 0.35;
  transform: translateZ(0);
}

/* 仅保留左上氛围光 */
.b1 {
  width: 520px;
  height: 520px;
  left: -180px;
  top: -180px;
  background: radial-gradient(circle at 30% 30%, #6aa9ff 0%, transparent 60%);
}

.login-shell {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  padding-top: clamp(140px, 20vh, 280px);
  position: relative;
  z-index: 1;
  overflow-y: auto;
}

.login-card {
  width: 480px;
  max-width: 92vw;
  border-radius: 14px;
  border: 1px solid rgba(60, 60, 60, 0.08);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 60px rgba(20, 30, 60, 0.12);
}

.card-inner {
  padding: 24px 22px 20px 22px;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.brand-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  overflow: hidden;
  border: 1px solid rgba(60, 60, 60, 0.08);
}

.logo {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: inherit;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #1f2a44;
}

.brand-subtitle {
  font-size: 12px;
  color: rgba(31, 42, 68, 0.65);
  margin-top: 2px;
}

.brand-tag {
  border-radius: 10px;
}

.login-form {
  margin-top: 6px;
}

.login-form :deep(.el-form-item) {
  align-items: center;
}

.login-form :deep(.el-form-item__content) {
  flex: 1;
}

.login-form :deep(.el-input) {
  width: 100%;
}

.form-item :deep(.el-form-item__label) {
  color: rgba(31, 42, 68, 0.8);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
}

.login-btn {
  width: 100%;
  border-radius: 10px;
  height: 40px;
  font-weight: 600;
}

.footer-note {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: rgba(31, 42, 68, 0.55);
}
</style>
