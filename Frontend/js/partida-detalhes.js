(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('partidas', user);

  const matchId = new URLSearchParams(window.location.search).get('id');
  if (!matchId) {
    document.getElementById('page-content').innerHTML = errorState(
      'Partida não informada.',
    );
    return;
  }

  await loadMatch(matchId, user);

  async function loadMatch(id, user) {
    const content = document.getElementById('page-content');

    try {
      const match = await api.get(`/matches/${id}`);
      content.innerHTML = renderPage(match, user);
      attachActions(match, user);
      loadWeather(id);
    } catch (error) {
      content.innerHTML = `<div class="card">${errorState(error.message)}</div>`;
    }
  }

  function canManage(match, user) {
    return user.role === 'ADMIN' || user.role === 'ORGANIZER';
  }

  function renderPage(match, user) {
    const finished = match.status === 'FINISHED';
    const showScore = match.scoreA !== null && match.scoreB !== null;

    return `
      <div class="page-header">
        <div class="page-header-text">
          <h1>${match.tournament.name}</h1>
          <p>${match.court.name} · ${formatDateTime(match.scheduledAt)}</p>
        </div>
        ${matchStatusBadge(match.status)}
      </div>

      <div class="big-scoreboard">
        <div class="big-scoreboard-label">Placar</div>
        <div class="big-scoreboard-teams">
          <div>
            <div class="big-scoreboard-team-name">${match.teamA.name}</div>
            <div class="big-scoreboard-score" style="${finished && match.scoreA > match.scoreB ? 'color: var(--accent);' : ''}">
              ${showScore ? match.scoreA : '—'}
            </div>
          </div>
          <div class="big-scoreboard-divider">×</div>
          <div>
            <div class="big-scoreboard-team-name">${match.teamB.name}</div>
            <div class="big-scoreboard-score" style="${finished && match.scoreB > match.scoreA ? 'color: var(--accent);' : ''}">
              ${showScore ? match.scoreB : '—'}
            </div>
          </div>
        </div>

        <div class="big-scoreboard-meta">
          <div class="big-scoreboard-meta-item">
            <div class="big-scoreboard-meta-label">Quadra</div>
            <div class="big-scoreboard-meta-value">${match.court.name}</div>
          </div>
          <div class="big-scoreboard-meta-item">
            <div class="big-scoreboard-meta-label">Data</div>
            <div class="big-scoreboard-meta-value">${formatDate(match.scheduledAt)}</div>
          </div>
          <div class="big-scoreboard-meta-item">
            <div class="big-scoreboard-meta-label">Horário</div>
            <div class="big-scoreboard-meta-value">${formatTime(match.scheduledAt)}</div>
          </div>
          <div class="big-scoreboard-meta-item">
            <div class="big-scoreboard-meta-label">Duração</div>
            <div class="big-scoreboard-meta-value">${match.durationMin} min</div>
          </div>
        </div>
      </div>

      <div id="weather-widget" style="margin-top: var(--sp-5);"></div>

      ${canManage(match, user) ? renderManagementPanel(match) : ''}

      <div class="alert alert-danger" id="action-error" role="alert" hidden style="margin-top: var(--sp-5);"></div>
    `;
  }

  function renderManagementPanel(match) {
    const canStart = match.status === 'SCHEDULED';
    const canFinish = match.status === 'IN_PROGRESS';
    const canCancel = match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS';

    return `
      <section class="card" style="margin-top: var(--sp-5);">
        <h2 class="card-title">Gerenciar partida</h2>
        <p class="card-subtitle">Ações disponíveis para o estado atual: ${MATCH_STATUS_LABEL[match.status]}.</p>

        <div class="cluster" style="margin-top: var(--sp-4);">
          <button class="btn btn-primary" id="start-btn" ${canStart ? '' : 'disabled'}>
            Iniciar partida
          </button>
          <button class="btn btn-danger" id="cancel-btn" ${canCancel ? '' : 'disabled'}>
            Cancelar partida
          </button>
        </div>

        ${
          canFinish
            ? `
          <form id="result-form" class="stack" style="margin-top: var(--sp-5); padding-top: var(--sp-5); border-top: 1px solid var(--border);">
            <h3 style="font-size: var(--fs-sm); color: var(--text-muted);">Lançar resultado</h3>
            <div class="cluster">
              <div class="field" style="margin-bottom: 0;">
                <label for="score-a">${match.teamA.name}</label>
                <input type="number" id="score-a" min="0" required style="width: 100px;" />
              </div>
              <div class="field" style="margin-bottom: 0;">
                <label for="score-b">${match.teamB.name}</label>
                <input type="number" id="score-b" min="0" required style="width: 100px;" />
              </div>
              <button type="submit" class="btn btn-primary" style="align-self: flex-end;">
                Finalizar com este resultado
              </button>
            </div>
          </form>
        `
            : ''
        }
      </section>
    `;
  }

  function attachActions(match, user) {
    if (!canManage(match, user)) return;

    const errorBox = document.getElementById('action-error');

    const showError = (message) => {
      errorBox.textContent = message;
      errorBox.hidden = false;
    };

    document.getElementById('start-btn')?.addEventListener('click', async () => {
      errorBox.hidden = true;
      try {
        await api.patch(`/matches/${match.id}/status`, { status: 'IN_PROGRESS' });
        showToast('Partida iniciada.', 'success');
        await loadMatch(match.id, user);
      } catch (error) {
        showError(error.message);
      }
    });

    document.getElementById('cancel-btn')?.addEventListener('click', async () => {
      const confirmed = await confirmAction(
        'Tem certeza que deseja cancelar esta partida? Essa ação não pode ser desfeita.',
        { confirmLabel: 'Sim, cancelar', danger: true },
      );
      if (!confirmed) return;

      errorBox.hidden = true;
      try {
        await api.patch(`/matches/${match.id}/status`, { status: 'CANCELED' });
        showToast('Partida cancelada.', 'success');
        await loadMatch(match.id, user);
      } catch (error) {
        showError(error.message);
      }
    });

    document.getElementById('result-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.hidden = true;

      const scoreA = Number(document.getElementById('score-a').value);
      const scoreB = Number(document.getElementById('score-b').value);

      const confirmed = await confirmAction(
        `Finalizar a partida com o placar ${scoreA} × ${scoreB}? Essa ação não pode ser desfeita.`,
        { confirmLabel: 'Sim, finalizar' },
      );
      if (!confirmed) return;

      try {
        await api.patch(`/matches/${match.id}/result`, { scoreA, scoreB });
        showToast('Resultado registrado.', 'success');
        await loadMatch(match.id, user);
      } catch (error) {
        showError(error.message);
      }
    });
  }

  async function loadWeather(matchId) {
    const widget = document.getElementById('weather-widget');
    if (!widget) return;

    try {
      const data = await api.get(`/matches/${matchId}/weather`);

      if (!data.weatherAvailable) {
        widget.innerHTML = '';
        return;
      }

      widget.innerHTML = `
        <div class="cluster" style="color: var(--text-muted); font-size: var(--fs-sm);">
          <span>🌡️ ${Math.round(data.currentWeather.temperatureC)}°C agora</span>
          <span>·</span>
          <span>💨 ${Math.round(data.currentWeather.windSpeedKmh)} km/h de vento</span>
        </div>
      `;
    } catch {
      widget.innerHTML = '';
    }
  }
})();
