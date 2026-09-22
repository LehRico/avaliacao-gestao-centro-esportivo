(async function () {
  if (isAuthenticated()) {
    window.location.href = 'dashboard.html';
    return;
  }

  await Promise.all([loadSports(), loadTournaments(), loadMatches()]);
})();

async function loadSports() {
  const container = document.getElementById('sports-list');
  try {
    const sports = await api.get('/sports');

    if (sports.length === 0) {
      container.innerHTML = emptyState('Nenhum esporte cadastrado ainda');
      return;
    }

    container.innerHTML = sports
      .map((s) => `<span class="sport-pill">${s.name}</span>`)
      .join('');
  } catch (error) {
    container.innerHTML = errorState(error.message);
  }
}

async function loadTournaments() {
  const container = document.getElementById('tournaments-list');
  try {
    const response = await api.get('/tournaments?status=IN_PROGRESS&limit=3');

    if (response.data.length === 0) {
      container.innerHTML = `<div class="card">${emptyState('Nenhum torneio em andamento no momento')}</div>`;
      return;
    }

    container.innerHTML = response.data.map(publicTournamentCard).join('');
  } catch (error) {
    container.innerHTML = `<div class="card">${errorState(error.message)}</div>`;
  }
}

async function loadMatches() {
  const container = document.getElementById('matches-list');
  try {
    const response = await api.get('/matches?status=SCHEDULED&limit=3');

    if (response.data.length === 0) {
      container.innerHTML = `<div class="card">${emptyState('Nenhuma partida agendada no momento')}</div>`;
      return;
    }

    container.innerHTML = response.data.map(publicMatchCard).join('');
  } catch (error) {
    container.innerHTML = `<div class="card">${errorState(error.message)}</div>`;
  }
}

function publicTournamentCard(tournament) {
  return `
    <div class="card">
      <div class="cluster" style="justify-content: space-between;">
        <span class="card-title" style="font-size: var(--fs-base);">${tournament.name}</span>
        ${tournamentStatusBadge(tournament.status)}
      </div>
      <p class="card-subtitle" style="margin-top: var(--sp-2);">${tournament.sport.name}</p>
    </div>
  `;
}

function publicMatchCard(match) {
  return `
    <div class="scorecard" data-status="${match.status}">
      <div class="scorecard-header">
        <span class="scorecard-tournament">${match.tournament.name}</span>
        ${matchStatusBadge(match.status)}
      </div>
      <div class="scorecard-teams">
        <div class="scorecard-team-row">
          <span class="scorecard-team-name">${match.teamA.name}</span>
        </div>
        <div class="scorecard-vs">×</div>
        <div class="scorecard-team-row">
          <span class="scorecard-team-name">${match.teamB.name}</span>
        </div>
      </div>
      <div class="scorecard-footer">
        <span>${match.court.name}</span>
        <span>${formatDate(match.scheduledAt)}</span>
      </div>
    </div>
  `;
}
