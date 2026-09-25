(function () {
  if (isAuthenticated()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');
  const formError = document.getElementById('form-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    clearFieldErrors('email', 'password');
    formError.hidden = true;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email) {
      setFieldError('email', 'Informe seu e-mail.');
      return;
    }
    if (!isValidEmail(email)) {
      setFieldError('email', 'Informe um e-mail em um formato válido (ex: nome@dominio.com).');
      return;
    }
    if (!password) {
      setFieldError('password', 'Informe sua senha.');
      return;
    }
    const passwordError = getPasswordError(password);
    if (passwordError) {
      setFieldError('password', passwordError);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    try {
      await login(email, password);
      window.location.href = 'dashboard.html';
    } catch (error) {
      formError.textContent =
        error.status === 401
          ? 'E-mail ou senha incorretos.'
          : error.message;
      formError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  });
})();
