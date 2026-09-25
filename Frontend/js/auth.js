function saveSession(token, user) {
  localStorage.setItem(CONFIG.STORAGE_TOKEN_KEY, token);
  localStorage.setItem(CONFIG.STORAGE_USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(CONFIG.STORAGE_TOKEN_KEY);
  localStorage.removeItem(CONFIG.STORAGE_USER_KEY);
}

function getCurrentUser() {
  const raw = localStorage.getItem(CONFIG.STORAGE_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isAuthenticated() {
  return Boolean(getToken());
}

async function login(email, password) {
  const data = await api.post('/auth/login', { email, password });
  saveSession(data.accessToken, data.user);
  return data.user;
}

async function register(name, email, password) {
  const data = await api.post('/auth/register', { name, email, password });
  saveSession(data.accessToken, data.user);
  return data.user;
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

/**
 * Chame no topo de páginas privadas. Redireciona para o login se não
 * houver sessão válida. Se `roles` for informado, também bloqueia
 * usuários autenticados cujo papel não esteja na lista (a validação
 * real de autorização continua sendo feita pela API).
 */
function requireAuth(roles) {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return null;
  }

  const user = getCurrentUser();

  if (roles && !roles.includes(user.role)) {
    window.location.href = 'dashboard.html';
    return null;
  }

  return user;
}
