(async function () {
  const user = requireAuth(['ORGANIZER', 'ADMIN']);
  if (!user) return;

  renderShell('partidas', user);

  const form = document.getElementById('match-form');
  const submitBtn = document.getElementById('submit-btn');
  const formError = document.getElementById('form-error');
  const tournamentSelect = document.getElementById('tournament');
  const sportSelect = document.getElementById('sport');
  const teamASelect = document.getElementById('team-a');
  const teamBSelect = document.getElementById('team-b');
  const courtSelect = document.getElementById('court');

  let tournaments = [];
  let sports = [];

  await Promise.all([loadTournaments(), loadSports(), loadCourts()]);

  tournamentSelect.addEventListener('change', () => {
    const tournament = tournaments.find((t) => t.id === tournamentSelect.value);

    if (tournament) {
      sportSelect.value = tournament.sportId;
      sportSelect.disabled = true;
      loadTeamsForTournament(tournament);
    } else {
      sportSelect.disabled = false;
      loadTeamsForSport(sportSelect.value);
    }
  });

  sportSelect.addEventListener('change', () => {
    if (!tournamentSelect.value) {
      loadTeamsForSport(sportSelect.value);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.hidden = true;

    const teamAId = teamASelect.value;
    const teamBId = teamBSelect.value;

    if (!teamAId || !teamBId) {
      formError.textContent = 'Selecione as duas equipes.';
      formError.hidden = false;
      return;
    }

    if (teamAId === teamBId) {
      formError.textContent = 'Uma equipe não pode enfrentar ela mesma.';
      formError.hidden = false;
      return;
    }

    const payload = {
      courtId: courtSelect.value,
      teamAId,
      teamBId,
      scheduledAt: new Date(document.getElementById('scheduled-at').value).toISOString(),
    };
    if (tournamentSelect.value) {
      payload.tournamentId = tournamentSelect.value;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Agendando...';

    try {
      const match = await api.post('/matches', payload);
      showToast('Partida agendada.', 'success');
      window.location.href = `partida-detalhes.html?id=${match.id}`;
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Agendar partida';
    }
  });

  async function loadTournaments() {
    try {
      const response = await api.get('/tournaments?limit=100');
      tournaments = response.data.filter((t) =>
        ['OPEN', 'IN_PROGRESS'].includes(t.status),
      );

      tournamentSelect.innerHTML =
        '<option value="">Nenhum — partida independente</option>' +
        tournaments
          .map((t) => `<option value="${t.id}">${t.name} (${t.sport.name})</option>`)
          .join('');
    } catch (error) {
      formError.textContent = `Não foi possível carregar torneios: ${error.message}`;
      formError.hidden = false;
    }
  }

  async function loadSports() {
    try {
      sports = await api.get('/sports');
      sportSelect.innerHTML = sports
        .map((s) => `<option value="${s.id}">${s.name}</option>`)
        .join('');

      if (sports.length > 0) {
        loadTeamsForSport(sportSelect.value);
      }
    } catch (error) {
      formError.textContent = `Não foi possível carregar esportes: ${error.message}`;
      formError.hidden = false;
    }
  }

  async function loadCourts() {
    try {
      const courts = await api.get('/courts');
      const active = courts.filter((c) => c.status === 'ATIVA');

      if (active.length === 0) {
        courtSelect.innerHTML = '<option value="">Nenhuma quadra ativa disponível</option>';
        return;
      }

      courtSelect.innerHTML = active
        .map((c) => `<option value="${c.id}">${c.name}</option>`)
        .join('');
    } catch (error) {
      courtSelect.innerHTML = '<option value="">Erro ao carregar quadras</option>';
    }
  }

  async function loadTeamsForSport(sportId) {
    if (!sportId) return;
    teamASelect.innerHTML = '<option value="">Carregando...</option>';
    teamBSelect.innerHTML = '<option value="">Carregando...</option>';

    try {
      const response = await api.get(`/teams?sportId=${sportId}&limit=100`);
      const options = response.data
        .map((t) => `<option value="${t.id}">${t.name}</option>`)
        .join('');

      if (!options) {
        teamASelect.innerHTML = '<option value="">Nenhuma equipe deste esporte</option>';
        teamBSelect.innerHTML = '<option value="">Nenhuma equipe deste esporte</option>';
        return;
      }

      teamASelect.innerHTML = options;
      teamBSelect.innerHTML = options;
    } catch {
      teamASelect.innerHTML = '<option value="">Erro ao carregar equipes</option>';
      teamBSelect.innerHTML = '<option value="">Erro ao carregar equipes</option>';
    }
  }

  async function loadTeamsForTournament(tournament) {
    teamASelect.innerHTML = '<option value="">Carregando...</option>';
    teamBSelect.innerHTML = '<option value="">Carregando...</option>';

    try {
      const full = await api.get(`/tournaments/${tournament.id}`);
      const options = full.teams
        .map((e) => `<option value="${e.team.id}">${e.team.name}</option>`)
        .join('');

      if (!options) {
        teamASelect.innerHTML = '<option value="">Nenhuma equipe inscrita neste torneio</option>';
        teamBSelect.innerHTML = '<option value="">Nenhuma equipe inscrita neste torneio</option>';
        return;
      }

      teamASelect.innerHTML = options;
      teamBSelect.innerHTML = options;
    } catch {
      teamASelect.innerHTML = '<option value="">Erro ao carregar equipes</option>';
      teamBSelect.innerHTML = '<option value="">Erro ao carregar equipes</option>';
    }
  }
})();
