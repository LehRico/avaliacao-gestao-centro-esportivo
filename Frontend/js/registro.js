(function () {
  if (isAuthenticated()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('submit-btn');
  const formError = document.getElementById('form-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    clearFieldErrors('name', 'email', 'password');
    formError.hidden = true;

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    let hasError = false;
    if (name.length < 2) {
      setFieldError('name', 'Informe seu nome completo.');
      hasError = true;
    }
    if (!email) {
      setFieldError('email', 'Informe seu e-mail.');
      hasError = true;
    }
    if (password.length < 8) {
      setFieldError('password', 'A senha deve ter no mínimo 8 caracteres.');
      hasError = true;
    }
    if (hasError) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando conta...';

    try {
      await register(name, email, password);
      window.location.href = 'dashboard.html';
    } catch (error) {
      formError.textContent =
        error.status === 409
          ? 'Este e-mail já está cadastrado.'
          : error.message;
      formError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Criar conta';
    }
  });
})();
