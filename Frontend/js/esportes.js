(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('esportes', user);

  const isAdmin = user.role === 'ADMIN';
  if (isAdmin) {
    document.getElementById('page-actions').innerHTML =
      '<button class="btn btn-primary" id="new-sport-btn">Novo esporte</button>';
    document
      .getElementById('new-sport-btn')
      .addEventListener('click', () => openSportForm());
  }

  await loadSports();

  async function loadSports() {
    const tbody = document.getElementById('sports-tbody');
    tbody.innerHTML = `<tr><td colspan="3"><div class="state-block"><div class="spinner"></div></div></td></tr>`;

    try {
      const sports = await api.get('/sports');

      if (sports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3">${emptyState('Nenhum esporte cadastrado')}</td></tr>`;
        return;
      }

      tbody.innerHTML = sports.map((s) => sportRow(s, isAdmin)).join('');
      await loadTeamCounts(sports);
      attachHandlers(sports);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="3">${errorState(error.message)}</td></tr>`;
    }
  }

  async function loadTeamCounts(sports) {
    await Promise.all(
      sports.map(async (sport) => {
        const cell = document.getElementById(`sport-count-${sport.id}`);
        if (!cell) return;
        try {
          const response = await api.get(`/teams?sportId=${sport.id}&limit=1`);
          cell.textContent = response.meta.total;
        } catch {
          cell.textContent = '—';
        }
      }),
    );
  }

  function attachHandlers(sports) {
    if (!isAdmin) return;

    document.querySelectorAll('[data-edit-sport]').forEach((btn) => {
      const sport = sports.find((s) => s.id === btn.dataset.editSport);
      btn.addEventListener('click', () => openSportForm(sport));
    });

    document.querySelectorAll('[data-delete-sport]').forEach((btn) => {
      const sport = sports.find((s) => s.id === btn.dataset.deleteSport);
      btn.addEventListener('click', () => deleteSport(sport));
    });
  }

  function openSportForm(sport) {
    const isEdit = Boolean(sport);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2 class="card-title">${isEdit ? 'Editar esporte' : 'Novo esporte'}</h2>
        </div>
        <form id="sport-form" class="stack">
          <div class="field">
            <label for="sport-name">Nome</label>
            <input type="text" id="sport-name" value="${sport?.name ?? ''}" required />
          </div>
          <div class="alert alert-danger" id="sport-form-error" role="alert" hidden></div>
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

    overlay.querySelector('#sport-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorBox = overlay.querySelector('#sport-form-error');
      errorBox.hidden = true;

      const name = overlay.querySelector('#sport-name').value.trim();

      try {
        if (isEdit) {
          await api.patch(`/sports/${sport.id}`, { name });
          showToast('Esporte atualizado.', 'success');
        } else {
          await api.post('/sports', { name });
          showToast('Esporte criado.', 'success');
        }
        close();
        await loadSports();
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      }
    });
  }

  async function deleteSport(sport) {
    const confirmed = await confirmAction(
      `Excluir o esporte "${sport.name}"? Essa ação não pode ser desfeita.`,
      { confirmLabel: 'Sim, excluir', danger: true },
    );
    if (!confirmed) return;

    try {
      await api.delete(`/sports/${sport.id}`);
      showToast('Esporte excluído.', 'success');
      await loadSports();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
})();

function sportRow(sport, isAdmin) {
  return `
    <tr>
      <td style="font-weight: 600;">${sport.name}</td>
      <td id="sport-count-${sport.id}">…</td>
      <td>
        ${
          isAdmin
            ? `
          <div class="cluster">
            <button class="btn btn-ghost btn-sm" data-edit-sport="${sport.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-delete-sport="${sport.id}">Excluir</button>
          </div>
        `
            : ''
        }
      </td>
    </tr>
  `;
}
