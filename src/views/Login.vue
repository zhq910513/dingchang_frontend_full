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

            <el-button class="login-btn" type="primary" :loading="loading" @click="doLogin">
              登录
            </el-button>

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

function normalizeStr(v) {
  return v == null ? "" : String(v).trim();
}

function defaultHomeByRole(roleName) {
  if (roleName === ROLE.MARKET) return "/channels";
  if (roleName === ROLE.FINANCE) return "/finance";
  return "/orders/all";
}

function isAllowedPath(roleName, path) {
  const p = normalizeStr(path);
  if (!p.startsWith("/")) return false;
  if (p.startsWith("/login")) return false;

  if (roleName === ROLE.FINANCE && p.startsWith("/orders")) return false;
  if (roleName === ROLE.SALES && p.startsWith("/finance")) return false;

  if (
    (roleName === ROLE.SALES || roleName === ROLE.FINANCE) &&
    p.startsWith("/users")
  ) {
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

  if (detail && typeof detail === "string" && hasChinese(detail)) return detail;

  const m = String(msg || "");
  if (/timeout/i.test(m) || /ECONNABORTED/i.test(String(e?.code || ""))) {
    return "请求超时，请检查网络后重试";
  }
  if (/Network Error/i.test(m)) {
    return "网络异常，请检查网络连接";
  }

  if (status === 401) return "登录失败：账号或密码不正确";
  if (status === 403) return "登录失败：当前账号无权限";
  if (status >= 500) return "服务器异常，请稍后重试";
  if (status) return "登录失败，请稍后重试";

  return "登录失败，请检查网络后重试";
}

function buildLoginStateFromResponse(resp) {
  const data = resp?.data ?? {};
  const token = normalizeStr(data?.token);
  const roleName = normalizeStr(data?.role_name);

  const user = {
    user_id: data?.user_id ?? null,
    username: normalizeStr(data?.username),
    real_name: normalizeStr(data?.real_name),
    full_name: normalizeStr(data?.full_name),
    role_name: roleName,
    team_name: normalizeStr(data?.team_name),
    team_names: Array.isArray(data?.team_names) ? data.team_names : [],
  };

  if (!token) {
    throw new Error("LOGIN_RESPONSE_MISSING_TOKEN");
  }
  if (!roleName) {
    throw new Error("LOGIN_RESPONSE_MISSING_ROLE");
  }
  if (!user.username) {
    throw new Error("LOGIN_RESPONSE_MISSING_USERNAME");
  }

  return { token, roleName, user };
}

async function redirectAfterLogin(roleName) {
  const redirect = route.query.redirect;
  const redirectPath = typeof redirect === "string" ? redirect : "";

  if (redirectPath && isAllowedPath(roleName, redirectPath)) {
    await router.replace(redirectPath);
    return;
  }

  await router.replace(defaultHomeByRole(roleName));
}

onMounted(async () => {
  document.body.classList.remove("app-shell-lock");

  if (!store.isLoggedIn) return;
  await redirectAfterLogin(store.roleName);
});

async function doLogin() {
  if (loading.value) return;

  const username = normalizeStr(form.username);
  const password = String(form.password || "");

  if (!username || !password) {
    ElMessage.warning("请输入用户名和密码");
    return;
  }

  loading.value = true;
  try {
    const resp = await login({ username, password });
    const nextState = buildLoginStateFromResponse(resp);

    store.commitLogin(nextState);

    ElMessage.success("登录成功");
    await redirectAfterLogin(nextState.roleName);
  } catch (e) {
    console.error(e);
    store.clearSession();

    if (String(e?.message || "").includes("LOGIN_RESPONSE_MISSING_")) {
      ElMessage.error("登录失败：登录返回结构异常，请联系管理员");
    } else {
      ElMessage.error(getLoginErrorMessage(e));
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  height: 100dvh;
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
  padding-top: clamp(120px, 18vh, 260px);
  position: relative;
  z-index: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
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
  margin-bottom: 18px;
}

.brand-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #f6f8ff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2d3d;
}

.brand-subtitle {
  font-size: 13px;
  color: #7a8599;
}

.brand-tag {
  flex-shrink: 0;
}

.login-form {
  margin-top: 10px;
}

.form-item {
  margin-bottom: 18px;
}

.login-btn {
  width: 100%;
  margin-top: 4px;
  height: 42px;
  border-radius: 10px;
}

.footer-note {
  margin-top: 14px;
  font-size: 12px;
  color: #8f98a8;
  text-align: center;
}
</style>