(async function () {
  const user = requireAuth(['ORGANIZER', 'ADMIN']);
  if (!user) return;

  renderShell('torneios', user);

  const sportSelect = document.getElementById('sport');
  try {
    const sports = await api.get('/sports');
    sportSelect.innerHTML = sports
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join('');
  } catch (error) {
    sportSelect.innerHTML = '<option value="">Erro ao carregar esportes</option>';
  }

  const form = document.getElementById('tournament-form');
  const submitBtn = document.getElementById('submit-btn');
  const formError = document.getElementById('form-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors('name', 'sport');
    formError.hidden = true;

    const name = document.getElementById('name').value.trim();
    const sportId = sportSelect.value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (name.length < 2) {
      setFieldError('name', 'Informe o nome do torneio.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando...';

    try {
      const tournament = await api.post('/tournaments', {
        name,
        sportId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      showToast('Torneio criado com sucesso.', 'success');
      window.location.href = `torneio-detalhes.html?id=${tournament.id}`;
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Criar torneio';
    }
  });
})();
