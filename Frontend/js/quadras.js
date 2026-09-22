(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('quadras', user);

  const isAdmin = user.role === 'ADMIN';
  if (isAdmin) {
    document.getElementById('page-actions').innerHTML =
      '<button class="btn btn-primary" id="new-court-btn">Nova quadra</button>';
    document
      .getElementById('new-court-btn')
      .addEventListener('click', () => openCourtForm());
  }

  let allMatches = null;

  await loadCourts();

  async function loadCourts() {
    const list = document.getElementById('courts-list');
    list.innerHTML = loadingState();

    try {
      const courts = await api.get('/courts');

      if (courts.length === 0) {
        list.innerHTML = emptyState('Nenhuma quadra cadastrada');
        return;
      }

      list.innerHTML = courts.map((c) => courtCard(c, isAdmin)).join('');
      attachCourtHandlers(courts);
    } catch (error) {
      list.innerHTML = errorState(error.message);
    }
  }

  function attachCourtHandlers(courts) {
    document.querySelectorAll('[data-toggle-schedule]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const courtId = btn.dataset.toggleSchedule;
        const schedule = document.getElementById(`schedule-${courtId}`);
        const isOpen = schedule.classList.toggle('is-open');
        btn.textContent = isOpen ? 'Ocultar agenda' : 'Ver agenda';

        if (isOpen && !schedule.dataset.loaded) {
          await loadCourtSchedule(courtId, schedule);
        }
      });
    });

    if (!isAdmin) return;

    document.querySelectorAll('[data-edit-court]').forEach((btn) => {
      const court = courts.find((c) => c.id === btn.dataset.editCourt);
      btn.addEventListener('click', () => openCourtForm(court));
    });

    document.querySelectorAll('[data-delete-court]').forEach((btn) => {
      const court = courts.find((c) => c.id === btn.dataset.deleteCourt);
      btn.addEventListener('click', () => deleteCourt(court));
    });
  }

  async function loadCourtSchedule(courtId, container) {
    container.dataset.loaded = 'true';
    container.innerHTML = loadingState();

    try {
      if (!allMatches) {
        const response = await api.get('/matches?status=SCHEDULED&limit=100');
        allMatches = response.data;
      }

      const matches = allMatches
        .filter((m) => m.court.id === courtId)
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
        .slice(0, 5);

      if (matches.length === 0) {
        container.innerHTML = `<p class="card-subtitle">Nenhuma partida agendada nesta quadra.</p>`;
        return;
      }

      container.innerHTML = matches
        .map(
          (m) => `
        <div class="court-schedule-item">
          <span>${m.teamA.name} × ${m.teamB.name}</span>
          <span class="card-subtitle">${formatDateTime(m.scheduledAt)}</span>
        </div>
      `,
        )
        .join('');
    } catch (error) {
      container.innerHTML = errorState(error.message);
    }
  }

  function openCourtForm(court) {
    const isEdit = Boolean(court);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2 class="card-title">${isEdit ? 'Editar quadra' : 'Nova quadra'}</h2>
        </div>
        <form id="court-form" class="stack">
          <div class="field">
            <label for="court-name">Nome</label>
            <input type="text" id="court-name" value="${court?.name ?? ''}" required />
          </div>
          <div class="field">
            <label for="court-location">Localização (opcional)</label>
            <input type="text" id="court-location" value="${court?.location ?? ''}" />
          </div>
          <div class="alert alert-danger" id="court-form-error" role="alert" hidden></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Salvar' : 'Criar'}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('#court-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorBox = overlay.querySelector('#court-form-error');
      errorBox.hidden = true;

      const name = overlay.querySelector('#court-name').value.trim();
      const location = overlay.querySelector('#court-location').value.trim();
      const payload = { name, location: location || undefined };

      try {
        if (isEdit) {
          await api.patch(`/courts/${court.id}`, payload);
          showToast('Quadra atualizada.', 'success');
        } else {
          await api.post('/courts', payload);
          showToast('Quadra criada.', 'success');
        }
        close();
        allMatches = null;
        await loadCourts();
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      }
    });
  }

  async function deleteCourt(court) {
    const confirmed = await confirmAction(
      `Excluir a quadra "${court.name}"? Essa ação não pode ser desfeita.`,
      { confirmLabel: 'Sim, excluir', danger: true },
    );
    if (!confirmed) return;

    try {
      await api.delete(`/courts/${court.id}`);
      showToast('Quadra excluída.', 'success');
      await loadCourts();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
})();

function courtCard(court, isAdmin) {
  return `
    <div class="court-card">
      <div class="court-card-header">
        <div>
          <div class="court-card-name">${court.name}</div>
          ${court.location ? `<div class="court-card-location">${court.location}</div>` : ''}
        </div>
        <div class="court-card-actions">
          <button class="btn btn-secondary btn-sm" data-toggle-schedule="${court.id}">Ver agenda</button>
          ${
            isAdmin
              ? `
            <button class="btn btn-ghost btn-sm" data-edit-court="${court.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-delete-court="${court.id}">Excluir</button>
          `
              : ''
          }
        </div>
      </div>
      <div class="court-schedule" id="schedule-${court.id}"></div>
    </div>
  `;
}
