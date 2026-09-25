function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const SEQUENTIAL_ALPHABETS = ['abcdefghijklmnopqrstuvwxyz', '0123456789'];

function isEntirelySequential(password) {
  const normalized = password.toLowerCase();
  return SEQUENTIAL_ALPHABETS.some((alphabet) => {
    const reversed = alphabet.split('').reverse().join('');
    return alphabet.includes(normalized) || reversed.includes(normalized);
  });
}

function getPasswordError(password) {
  if (password.length < 8) {
    return 'A senha deve ter no mínimo 8 caracteres.';
  }
  if (/ {2,}/.test(password)) {
    return 'A senha não pode conter espaços em sequência.';
  }
  if (!/[a-zA-Z0-9]/.test(password)) {
    return 'A senha não pode conter apenas caracteres especiais.';
  }
  if (isEntirelySequential(password)) {
    return 'A senha não pode ser uma sequência óbvia (ex: "12345678", "abcdefgh").';
  }
  return null;
}

function setFieldError(fieldId, message) {
  const el = document.getElementById(`${fieldId}-error`);
  if (el) el.textContent = message || '';
}

function clearFieldErrors(...fieldIds) {
  fieldIds.forEach((id) => setFieldError(id, ''));
}
