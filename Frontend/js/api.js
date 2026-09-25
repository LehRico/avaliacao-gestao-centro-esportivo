class ApiError extends Error {
  constructor(status, message, raw) {
    super(message);
    this.status = status;
    this.raw = raw;
  }
}

function getToken() {
  return localStorage.getItem(CONFIG.STORAGE_TOKEN_KEY);
}

function extractMessage(body, status) {
  if (body && Array.isArray(body.message)) {
    return body.message.join(' ');
  }
  if (body && typeof body.message === 'string') {
    return body.message;
  }

  switch (status) {
    case 400:
      return 'Os dados enviados são inválidos.';
    case 401:
      return 'É necessário autenticar novamente.';
    case 403:
      return 'Você não tem permissão para esta ação.';
    case 404:
      return 'Recurso não encontrado.';
    case 409:
      return 'Esta ação conflita com o estado atual do recurso.';
    case 413:
      return 'Arquivo excede o tamanho máximo permitido.';
    default:
      return 'Ocorreu um erro inesperado. Tente novamente.';
  }
}

async function request(method, path, { body, isFormData = false } = {}) {
  const headers = { 'X-API-KEY': CONFIG.API_KEY };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(`${CONFIG.API_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new ApiError(
      0,
      'Não foi possível conectar ao servidor. Verifique sua conexão.',
      networkError,
    );
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    throw new ApiError(
      response.status,
      extractMessage(data, response.status),
      data,
    );
  }

  return data;
}

const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
  upload: (path, formData) =>
    request('POST', path, { body: formData, isFormData: true }),
};
