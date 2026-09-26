(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('dashboard', user);

  await Promise.all([loadKpis(), loadNextMatches(), loadCourtsStatus()]);
})();

function isToday(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function kpiCard(label, value) {
  return `
    <div class="card">
      <div class="card-subtitle">${label}</div>
      <div style="font-family: var(--font-score); font-size: var(--fs-3xl); font-weight: 700; margin-top: var(--sp-1);">
        ${value}
      </div>
    </div>
  `;
}

async function loadKpis() {
  const grid = document.getElementById('kpi-grid');

  try {
    const [matches, openTournaments, teams, sports] = await Promise.all([
      api.get('/matches?limit=100'),
      api.get('/tournaments?status=OPEN&limit=1'),
      api.get('/teams?limit=1'),
      api.get('/sports'),
    ]);

    const inProgressTournaments = await api.get(
      '/tournaments?status=IN_PROGRESS&limit=1',
    );

    const matchesToday = matches.data.filter((m) => isToday(m.scheduledAt));
    const activeTournaments =
      openTournaments.meta.total + inProgressTournaments.meta.total;

    grid.innerHTML =
      kpiCard('Partidas hoje', matchesToday.length) +
      kpiCard('Torneios ativos', activeTournaments) +
      kpiCard('Equipes cadastradas', teams.meta.total) +
      kpiCard('Esportes disponíveis', sports.length);
  } catch (error) {
    grid.innerHTML = `<div class="card">${errorState(error.message)}</div>`;
  }
}

async function loadNextMatches() {
  const list = document.getElementById('next-matches-list');

  try {
    const response = await api.get(
      '/matches?status=SCHEDULED&limit=5',
    );

    if (response.data.length === 0) {
      list.innerHTML = emptyState(
        'Nenhuma partida agendada',
        'Ainda não há partidas futuras cadastradas.',
      );
      return;
    }

    list.innerHTML = response.data.map(matchListItem).join('');
  } catch (error) {
    list.innerHTML = errorState(error.message);
  }
}

async function loadCourtsStatus() {
  const list = document.getElementById('courts-status-list');

  try {
    const [courts, inProgressMatches] = await Promise.all([
      api.get('/courts'),
      api.get('/matches?status=IN_PROGRESS&limit=100'),
    ]);

    if (courts.length === 0) {
      list.innerHTML = emptyState('Nenhuma quadra cadastrada');
      return;
    }

    const occupiedCourtIds = new Set(
      inProgressMatches.data.map((m) => m.courtId ?? m.court.id),
    );

    list.innerHTML = courts
      .map((court) => {
        if (court.status !== 'ATIVA') {
          return `
            <div class="cluster" style="justify-content: space-between; padding: var(--sp-3) 0; border-bottom: 1px solid var(--border);">
              <span style="font-weight: 600; font-size: var(--fs-sm);">${court.name}</span>
              ${courtStatusBadge(court.status)}
            </div>
          `;
        }

        const occupied = occupiedCourtIds.has(court.id);
        return `
          <div class="cluster" style="justify-content: space-between; padding: var(--sp-3) 0; border-bottom: 1px solid var(--border);">
            <span style="font-weight: 600; font-size: var(--fs-sm);">${court.name}</span>
            <span class="badge ${occupied ? 'badge-warning' : 'badge-success'}">
              ${occupied ? 'Em uso' : 'Disponível'}
            </span>
          </div>
        `;
      })
      .join('');
  } catch (error) {
    list.innerHTML = errorState(error.message);
  }
}
