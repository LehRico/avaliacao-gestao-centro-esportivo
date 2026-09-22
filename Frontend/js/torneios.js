(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('torneios', user);

  const canCreate = user.role === 'ORGANIZER' || user.role === 'ADMIN';
  if (canCreate) {
    document.getElementById('page-actions').innerHTML =
      '<a href="torneio-novo.html" class="btn btn-primary">Novo torneio</a>';
  }

  let currentPage = 1;
  const statusFilter = document.getElementById('status-filter');

  statusFilter.addEventListener('change', () => {
    currentPage = 1;
    loadTournaments();
  });

  await loadTournaments();

  async function loadTournaments() {
    const grid = document.getElementById('tournaments-grid');
    const pagination = document.getElementById('pagination');
    grid.innerHTML = loadingState();
    pagination.innerHTML = '';

    const params = new URLSearchParams({ page: currentPage, limit: 9 });
    if (statusFilter.value) params.set('status', statusFilter.value);

    try {
      const response = await api.get(`/tournaments?${params.toString()}`);

      if (response.data.length === 0) {
        grid.innerHTML = `<div class="card">${emptyState(
          'Nenhum torneio encontrado',
          'Ajuste o filtro ou crie um novo torneio.',
        )}</div>`;
        return;
      }

      grid.innerHTML = response.data.map(tournamentCard).join('');
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
        loadTournaments();
      });
    });
  }
})();

function tournamentCard(tournament) {
  return `
    <a href="torneio-detalhes.html?id=${tournament.id}" class="tournament-card">
      <div class="tournament-card-header">
        <span class="tournament-card-name">${tournament.name}</span>
        ${tournamentStatusBadge(tournament.status)}
      </div>
      <div class="tournament-card-sport">${tournament.sport.name}</div>

      <div style="color: var(--text-muted); font-size: var(--fs-sm);">
        ${formatDate(tournament.startDate)} — ${formatDate(tournament.endDate)}
      </div>

      <div class="tournament-card-footer">
        <span class="tournament-card-teams-count">${tournament.teams.length} equipe(s)</span>
        <span>${tournament.organizer.name}</span>
      </div>
    </a>
  `;
}
