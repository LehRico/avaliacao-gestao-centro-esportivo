(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('partidas', user);

  let currentPage = 1;
  const statusFilter = document.getElementById('status-filter');

  statusFilter.addEventListener('change', () => {
    currentPage = 1;
    loadMatches();
  });

  await loadMatches();

  async function loadMatches() {
    const grid = document.getElementById('matches-grid');
    const pagination = document.getElementById('pagination');
    grid.innerHTML = loadingState();
    pagination.innerHTML = '';

    const params = new URLSearchParams({ page: currentPage, limit: 9 });
    if (statusFilter.value) params.set('status', statusFilter.value);

    try {
      const response = await api.get(`/matches?${params.toString()}`);

      if (response.data.length === 0) {
        grid.innerHTML = `<div class="card">${emptyState(
          'Nenhuma partida encontrada',
          'Ajuste o filtro ou aguarde novas partidas serem agendadas.',
        )}</div>`;
        return;
      }

      grid.innerHTML = response.data.map(scorecard).join('');
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
        loadMatches();
      });
    });
  }
})();

function scorecard(match) {
  const finished = match.status === 'FINISHED';
  const aWins = finished && match.scoreA > match.scoreB;
  const bWins = finished && match.scoreB > match.scoreA;

  const scoreOrTime = (value, isWinner) => {
    if (value === null || value === undefined) {
      return `<span class="scorecard-team-score">${formatTime(match.scheduledAt)}</span>`;
    }
    return `<span class="scorecard-team-score${isWinner ? ' is-winner' : ''}">${value}</span>`;
  };

  return `
    <a href="partida-detalhes.html?id=${match.id}" class="scorecard" data-status="${match.status}">
      <div class="scorecard-header">
        <span class="scorecard-tournament">${match.tournament.name}</span>
        ${matchStatusBadge(match.status)}
      </div>

      <div class="scorecard-teams">
        <div class="scorecard-team-row">
          <span class="scorecard-team-name">${match.teamA.name}</span>
          ${scoreOrTime(match.scoreA, aWins)}
        </div>
        <div class="scorecard-vs">×</div>
        <div class="scorecard-team-row">
          <span class="scorecard-team-name">${match.teamB.name}</span>
          ${scoreOrTime(match.scoreB, bWins)}
        </div>
      </div>

      <div class="scorecard-footer">
        <span>${match.court.name}</span>
        <span>${formatDate(match.scheduledAt)}</span>
      </div>
    </a>
  `;
}
