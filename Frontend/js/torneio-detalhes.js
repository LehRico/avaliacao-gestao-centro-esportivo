const TOURNAMENT_NEXT_STATUS = {
  DRAFT: ['OPEN', 'CANCELED'],
  OPEN: ['IN_PROGRESS', 'CANCELED'],
  IN_PROGRESS: ['FINISHED', 'CANCELED'],
  FINISHED: [],
  CANCELED: [],
};

(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('torneios', user);

  const tournamentId = new URLSearchParams(window.location.search).get('id');
  if (!tournamentId) {
    document.getElementById('page-content').innerHTML = errorState(
      'Torneio não informado.',
    );
    return;
  }

  await load();

  async function load() {
    const content = document.getElementById('page-content');
    try {
      const tournament = await api.get(`/tournaments/${tournamentId}`);
      content.innerHTML = renderPage(tournament, user);
      attachHandlers(tournament, user);
      loadHoliday(tournament);
    } catch (error) {
      content.innerHTML = `<div class="card">${errorState(error.message)}</div>`;
    }
  }

  function isOrganizerOfThis(tournament, user) {
    return user.role === 'ADMIN' || tournament.organizer.id === user.userId || tournament.organizer.id === user.id;
  }

  function renderPage(tournament, user) {
    const canManage = user.role === 'ORGANIZER' || user.role === 'ADMIN';
    const nextStatuses = TOURNAMENT_NEXT_STATUS[tournament.status] ?? [];

    return `
      <div class="page-header">
        <div class="page-header-text">
          <h1>${tournament.name}</h1>
          <p>${tournament.sport.name} · Organizado por ${tournament.organizer.name}</p>
        </div>
        ${tournamentStatusBadge(tournament.status)}
      </div>

      <div id="holiday-banner"></div>

      <div class="grid grid-2" style="align-items: start; margin-top: var(--sp-5);">
        <div class="stack">
          <section class="card">
            <h2 class="card-title">Período</h2>
            <p class="card-subtitle">${formatDateTime(tournament.startDate)} até ${formatDateTime(tournament.endDate)}</p>
          </section>

          <section class="card">
            <h2 class="card-title">Regulamento</h2>
            ${renderRegulationBox(tournament, canManage)}
          </section>

          ${canManage ? renderStatusPanel(tournament, nextStatuses) : ''}
        </div>

        <div class="stack">
          <section class="card">
            <h2 class="card-title">Equipes inscritas (${tournament.teams.length})</h2>
            ${renderTeamsList(tournament)}
            ${renderRegisterTeamBox(tournament, user)}
          </section>

          ${canManage ? renderNewMatchBox(tournament) : ''}
        </div>
      </div>

      <div class="alert alert-danger" id="action-error" role="alert" hidden style="margin-top: var(--sp-5);"></div>
    `;
  }

  function renderRegulationBox(tournament, canManage) {
    const current = tournament.regulationPath
      ? `<div class="upload-box-current"><span>📄 Regulamento enviado</span></div>`
      : `<p class="card-subtitle" style="margin-bottom: var(--sp-4);">Nenhum regulamento enviado ainda.</p>`;

    if (!canManage) return current;

    return `
      ${current}
      <form id="regulation-form" class="cluster">
        <label for="regulation-file" class="sr-only">Selecionar arquivo do regulamento (PDF)</label>
        <input type="file" id="regulation-file" accept="application/pdf" />
        <button type="submit" class="btn btn-secondary btn-sm" id="regulation-submit-btn">Enviar PDF</button>
      </form>
      <p class="field-hint" style="margin-top: var(--sp-2);">Apenas arquivos PDF, até 5 MB.</p>
      <div class="alert alert-danger" id="regulation-error" role="alert" hidden style="margin-top: var(--sp-3);"></div>
    `;
  }

  function renderStatusPanel(tournament, nextStatuses) {
    if (nextStatuses.length === 0) {
      return `<section class="card"><h2 class="card-title">Status</h2><p class="card-subtitle">Este torneio está em um estado final.</p></section>`;
    }

    return `
      <section class="card">
        <h2 class="card-title">Mudar status</h2>
        <p class="card-subtitle">Atual: ${TOURNAMENT_STATUS_LABEL[tournament.status]}</p>
        <div class="cluster" style="margin-top: var(--sp-4);">
          ${nextStatuses
            .map(
              (status) =>
                `<button class="btn btn-secondary btn-sm" data-status="${status}">${TOURNAMENT_STATUS_LABEL[status]}</button>`,
            )
            .join('')}
        </div>
      </section>
    `;
  }

  function renderTeamsList(tournament) {
    if (tournament.teams.length === 0) {
      return emptyState('Nenhuma equipe inscrita');
    }

    return tournament.teams
      .map(
        (entry) => `
      <div class="team-chip">
        <a href="equipe-detalhes.html?id=${entry.team.id}" style="font-weight: 600; font-size: var(--fs-sm);">${entry.team.name}</a>
        <button class="btn btn-ghost btn-sm" data-unregister-team="${entry.team.id}">Remover</button>
      </div>
    `,
      )
      .join('');
  }

  function renderRegisterTeamBox(tournament) {
    const allowed = ['DRAFT', 'OPEN'].includes(tournament.status);
    if (!allowed) return '';

    return `
      <form id="register-team-form" class="cluster" style="margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--border);">
        <label for="team-select" class="sr-only">Selecionar equipe para inscrever</label>
        <select id="team-select" style="flex: 1; background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--sp-3) var(--sp-4); color: var(--text);">
          <option value="">Carregando seus times...</option>
        </select>
        <button type="submit" class="btn btn-primary btn-sm">Inscrever</button>
      </form>
    `;
  }

  function renderNewMatchBox(tournament) {
    const allowed = ['OPEN', 'IN_PROGRESS'].includes(tournament.status);
    if (!allowed) {
      return `<section class="card"><h2 class="card-title">Nova partida</h2><p class="card-subtitle">Só é possível criar partidas com o torneio em andamento ou com inscrições abertas.</p></section>`;
    }

    if (tournament.teams.length < 2) {
      return `<section class="card"><h2 class="card-title">Nova partida</h2><p class="card-subtitle">É necessário pelo menos 2 equipes inscritas.</p></section>`;
    }

    const teamOptions = tournament.teams
      .map((e) => `<option value="${e.team.id}">${e.team.name}</option>`)
      .join('');

    return `
      <section class="card">
        <h2 class="card-title">Nova partida</h2>
        <form id="new-match-form" class="stack">
          <div class="cluster">
            <div class="field" style="flex:1; margin-bottom:0;">
              <label for="team-a">Equipe A</label>
              <select id="team-a" required>${teamOptions}</select>
            </div>
            <div class="field" style="flex:1; margin-bottom:0;">
              <label for="team-b">Equipe B</label>
              <select id="team-b" required>${teamOptions}</select>
            </div>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label for="court-select">Quadra</label>
            <select id="court-select" required>
              <option value="">Carregando quadras...</option>
            </select>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label for="scheduled-at">Data e horário</label>
            <input type="datetime-local" id="scheduled-at" required />
          </div>
          <button type="submit" class="btn btn-primary btn-sm">Agendar partida</button>
        </form>
      </section>
    `;
  }

  function attachHandlers(tournament, user) {
    const errorBox = document.getElementById('action-error');
    const showError = (msg) => {
      errorBox.textContent = msg;
      errorBox.hidden = false;
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    document.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const status = btn.dataset.status;
        const isTerminal = status === 'FINISHED' || status === 'CANCELED';

        if (isTerminal) {
          const label = TOURNAMENT_STATUS_LABEL[status].toLowerCase();
          const confirmed = await confirmAction(
            `Tem certeza que deseja marcar este torneio como "${label}"? Essa ação não pode ser desfeita.`,
            { confirmLabel: 'Sim, confirmar', danger: true },
          );
          if (!confirmed) return;
        }

        errorBox.hidden = true;
        try {
          await api.patch(`/tournaments/${tournament.id}/status`, { status });
          showToast('Status atualizado.', 'success');
          await load();
        } catch (error) {
          showError(error.message);
        }
      });
    });

    document.querySelectorAll('[data-unregister-team]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const confirmed = await confirmAction(
          'Remover esta equipe da inscrição do torneio?',
          { confirmLabel: 'Remover', danger: true },
        );
        if (!confirmed) return;

        errorBox.hidden = true;
        try {
          await api.delete(
            `/tournaments/${tournament.id}/teams/${btn.dataset.unregisterTeam}`,
          );
          showToast('Inscrição cancelada.', 'success');
          await load();
        } catch (error) {
          showError(error.message);
        }
      });
    });

    const regulationForm = document.getElementById('regulation-form');
    regulationForm?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const regulationError = document.getElementById('regulation-error');
      const submitBtn = document.getElementById('regulation-submit-btn');
      regulationError.hidden = true;

      const fileInput = document.getElementById('regulation-file');
      const file = fileInput.files[0];
      if (!file) {
        regulationError.textContent = 'Selecione um arquivo PDF.';
        regulationError.hidden = false;
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';

      try {
        await api.upload(`/tournaments/${tournament.id}/regulation`, formData);
        showToast('Regulamento enviado.', 'success');
        await load();
      } catch (error) {
        regulationError.textContent = error.message;
        regulationError.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar PDF';
      }
    });

    const teamSelect = document.getElementById('team-select');
    if (teamSelect) loadMyTeamsForRegistration(tournament, user, teamSelect);

    const registerForm = document.getElementById('register-team-form');
    registerForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.hidden = true;

      const teamId = teamSelect.value;
      if (!teamId) {
        showError('Selecione uma equipe.');
        return;
      }

      try {
        await api.post(`/tournaments/${tournament.id}/teams`, { teamId });
        showToast('Equipe inscrita.', 'success');
        await load();
      } catch (error) {
        showError(error.message);
      }
    });

    const courtSelect = document.getElementById('court-select');
    if (courtSelect) loadCourtsForMatch(courtSelect);

    const newMatchForm = document.getElementById('new-match-form');
    newMatchForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.hidden = true;

      const teamAId = document.getElementById('team-a').value;
      const teamBId = document.getElementById('team-b').value;
      const courtId = document.getElementById('court-select').value;
      const scheduledAt = document.getElementById('scheduled-at').value;

      if (teamAId === teamBId) {
        showError('Uma equipe não pode enfrentar ela mesma.');
        return;
      }

      try {
        const match = await api.post(`/tournaments/${tournament.id}/matches`, {
          teamAId,
          teamBId,
          courtId,
          scheduledAt: new Date(scheduledAt).toISOString(),
        });
        showToast('Partida agendada.', 'success');
        window.location.href = `partida-detalhes.html?id=${match.id}`;
      } catch (error) {
        showError(error.message);
      }
    });
  }

  async function loadMyTeamsForRegistration(tournament, user, select) {
    try {
      const response = await api.get(`/teams?sportId=${tournament.sportId}&limit=100`);
      const myTeams = response.data.filter(
        (t) => user.role !== 'USER' || t.ownerId === user.id,
      );

      const alreadyRegisteredIds = new Set(tournament.teams.map((e) => e.team.id));
      const available = myTeams.filter((t) => !alreadyRegisteredIds.has(t.id));

      if (available.length === 0) {
        select.innerHTML = '<option value="">Nenhuma equipe disponível para inscrever</option>';
        return;
      }

      select.innerHTML = available
        .map((t) => `<option value="${t.id}">${t.name}</option>`)
        .join('');
    } catch {
      select.innerHTML = '<option value="">Erro ao carregar equipes</option>';
    }
  }

  async function loadCourtsForMatch(select) {
    try {
      const courts = await api.get('/courts');
      const active = courts.filter((c) => c.status === 'ATIVA');

      if (active.length === 0) {
        select.innerHTML = '<option value="">Nenhuma quadra ativa disponível</option>';
        return;
      }

      select.innerHTML = active
        .map((c) => `<option value="${c.id}">${c.name}</option>`)
        .join('');
    } catch {
      select.innerHTML = '<option value="">Erro ao carregar quadras</option>';
    }
  }

  async function loadHoliday(tournament) {
    const banner = document.getElementById('holiday-banner');
    if (!banner) return;

    try {
      const data = await api.get(`/tournaments/${tournament.id}/holiday-check`);
      if (data.isHoliday) {
        banner.innerHTML = `
          <div class="holiday-banner" style="margin-bottom: var(--sp-5);">
            📅 A data de início coincide com o feriado: ${data.holiday.name}
          </div>
        `;
      }
    } catch {
      // integração externa indisponível — não bloqueia a página
    }
  }
})();
