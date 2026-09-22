(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('equipes', user);

  const sportSelect = document.getElementById('sport');
  try {
    const sports = await api.get('/sports');
    sportSelect.innerHTML = sports
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join('');
  } catch {
    sportSelect.innerHTML = '<option value="">Erro ao carregar esportes</option>';
  }

  const form = document.getElementById('team-form');
  const submitBtn = document.getElementById('submit-btn');
  const formError = document.getElementById('form-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors('name');
    formError.hidden = true;

    const name = document.getElementById('name').value.trim();
    const sportId = sportSelect.value;

    if (name.length < 2) {
      setFieldError('name', 'Informe o nome da equipe.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando...';

    try {
      const team = await api.post('/teams', { name, sportId });
      showToast('Equipe criada com sucesso.', 'success');
      window.location.href = `equipe-detalhes.html?id=${team.id}`;
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Criar equipe';
    }
  });
})();
