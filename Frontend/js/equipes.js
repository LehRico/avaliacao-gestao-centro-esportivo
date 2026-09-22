(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('equipes', user);

  let currentPage = 1;
  const sportFilter = document.getElementById('sport-filter');

  await loadSportOptions();

  sportFilter.addEventListener('change', () => {
    currentPage = 1;
    loadTeams();
  });

  await loadTeams();

  async function loadSportOptions() {
    try {
      const sports = await api.get('/sports');
      sportFilter.innerHTML =
        '<option value="">Todos</option>' +
        sports.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch {
      // filtro é apenas conveniência; se falhar, mantém "Todos"
    }
  }

  async function loadTeams() {
    const grid = document.getElementById('teams-grid');
    const pagination = document.getElementById('pagination');
    grid.innerHTML = loadingState();
    pagination.innerHTML = '';

    const params = new URLSearchParams({ page: currentPage, limit: 9 });
    if (sportFilter.value) params.set('sportId', sportFilter.value);

    try {
      const response = await api.get(`/teams?${params.toString()}`);

      if (response.data.length === 0) {
        grid.innerHTML = `<div class="card">${emptyState(
          'Nenhuma equipe encontrada',
          'Ajuste o filtro ou crie uma nova equipe.',
        )}</div>`;
        return;
      }

      grid.innerHTML = response.data.map(teamCard).join('');
      renderPagination(response.meta);
    } catch (error) {
      grid.innerHTML = `<div class="card">${errorState(error.message)}</div>`;
    }
  }

  function renderPagination(meta) {
    if (meta.totalPages <= 1) return;

    const pagination = document.getElementById('pagination');
    let html = '';

    for (let i = 1; i <= meta.totalPages; i++) {
      html += `<button class="btn btn-sm ${i === meta.page ? 'btn-primary' : 'btn-secondary'}" data-page="${i}">${i}</button>`;
    }

    pagination.innerHTML = html;
    pagination.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentPage = Number(btn.dataset.page);
        loadTeams();
      });
    });
  }
})();

function teamCard(team) {
  return `
    <a href="equipe-detalhes.html?id=${team.id}" class="tournament-card">
      <div class="tournament-card-header">
        <span class="tournament-card-name">${team.name}</span>
      </div>
      <div class="tournament-card-sport">${team.sport.name}</div>

      <div class="tournament-card-footer">
        <span class="tournament-card-teams-count">${team.members.length} membro(s)</span>
        <span>${team.owner.name}</span>
      </div>
    </a>
  `;
}
