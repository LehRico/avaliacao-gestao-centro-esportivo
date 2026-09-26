(async function () {
  if (isAuthenticated()) {
    window.location.href = 'dashboard.html';
    return;
  }

  await Promise.all([loadSports(), loadTournaments(), loadMatches()]);
})();

function sportImageSlug(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sportCard(sport) {
  const imageSrc = `assets/sports/${sportImageSlug(sport.name)}.jpg`;
  const initial = sport.name.trim().charAt(0).toUpperCase();

  return `
    <div class="sport-card">
      <div class="sport-card-image">
        <img
          src="${imageSrc}"
          alt="${sport.name}"
          class="sport-card-image-photo"
          onerror="this.replaceWith(Object.assign(document.createElement('span'), { className: 'sport-card-image-fallback', textContent: '${initial}' }))"
        />
      </div>
      <div class="sport-card-name">${sport.name}</div>
    </div>
  `;
}

async function loadSports() {
  const container = document.getElementById('sports-list');
  try {
    const sports = await api.get('/sports');

    if (sports.length === 0) {
      container.innerHTML = emptyState('Nenhum esporte cadastrado ainda');
      return;
    }

    container.innerHTML = sports.map(sportCard).join('');
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
        <span class="scorecard-tournament">${match.tournament ? match.tournament.name : 'Partida independente'}</span>
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
