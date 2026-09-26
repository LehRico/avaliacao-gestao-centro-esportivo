(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('equipes', user);

  const teamId = new URLSearchParams(window.location.search).get('id');
  if (!teamId) {
    document.getElementById('page-content').innerHTML = errorState(
      'Equipe não informada.',
    );
    return;
  }

  await load();

  async function load() {
    const content = document.getElementById('page-content');
    try {
      const team = await api.get(`/teams/${teamId}`);
      content.innerHTML = renderPage(team, user);
      attachHandlers(team, user);
      loadTeamMatches(team);
    } catch (error) {
      content.innerHTML = `<div class="card">${errorState(error.message)}</div>`;
    }
  }

  function isOwner(team, user) {
    return team.ownerId === user.id || team.owner.id === user.id;
  }

  function canManage(team, user) {
    return user.role === 'ADMIN' || isOwner(team, user);
  }

  function renderPage(team, user) {
    const manage = canManage(team, user);
    const ownerIsCaptain = team.members.some(
      (m) => m.user.id === team.owner.id && m.role === 'CAPTAIN',
    );
    const ownerLabel = ownerIsCaptain ? 'Capitão' : 'Gestor';

    return `
      <div class="page-header">
        <div class="page-header-text">
          <h1>${team.name}</h1>
          <p>${team.sport.name} · ${ownerLabel}: ${team.owner.name}</p>
        </div>
        ${
          manage
            ? `<div class="page-actions">
                <button class="btn btn-danger btn-sm" id="delete-team-btn">Excluir equipe</button>
              </div>`
            : ''
        }
      </div>

      <div class="grid grid-2" style="align-items: start;">
        <section class="card">
          <h2 class="card-title">Membros (${team.members.length})</h2>
          <div id="members-list" style="margin-top: var(--sp-4);">
            ${renderMembers(team, user, manage)}
          </div>

          ${
            manage
              ? `
            <form id="add-member-form" class="cluster" style="margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--border);">
              <label for="member-email" class="sr-only">E-mail do membro</label>
              <input type="email" id="member-email" placeholder="E-mail do membro" required style="flex: 1; background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--sp-3) var(--sp-4); color: var(--text);" />
              <button type="submit" class="btn btn-primary btn-sm">Adicionar</button>
            </form>
          `
              : ''
          }
        </section>

        <section class="card">
          <h2 class="card-title">Próximas partidas</h2>
          <div id="team-matches-list" style="margin-top: var(--sp-4);">
            ${loadingState()}
          </div>
        </section>
      </div>

      <div class="alert alert-danger" id="action-error" role="alert" hidden style="margin-top: var(--sp-5);"></div>
    `;
  }

  function renderMembers(team, user, manage) {
    if (team.members.length === 0) return emptyState('Nenhum membro cadastrado');

    return team.members
      .map((member) => {
        const isCaptain = member.role === 'CAPTAIN';
        const canRemove = manage && !isCaptain;

        return `
          <div class="team-chip">
            <div>
              <span style="font-weight: 600; font-size: var(--fs-sm);">${member.user.name}</span>
              ${isCaptain ? '<span class="badge badge-neutral" style="margin-left: var(--sp-2);">Capitão</span>' : ''}
            </div>
            ${canRemove ? `<button class="btn btn-ghost btn-sm" data-remove-member="${member.user.id}">Remover</button>` : ''}
          </div>
        `;
      })
      .join('');
  }

  function attachHandlers(team, user) {
    const errorBox = document.getElementById('action-error');
    const showError = (msg) => {
      errorBox.textContent = msg;
      errorBox.hidden = false;
    };

    document.getElementById('delete-team-btn')?.addEventListener('click', async () => {
      const confirmed = await confirmAction(
        `Excluir a equipe "${team.name}"? Essa ação não pode ser desfeita.`,
        { confirmLabel: 'Sim, excluir', danger: true },
      );
      if (!confirmed) return;

      try {
        await api.delete(`/teams/${team.id}`);
        showToast('Equipe excluída.', 'success');
        window.location.href = 'equipes.html';
      } catch (error) {
        showError(error.message);
      }
    });

    document.querySelectorAll('[data-remove-member]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const confirmed = await confirmAction('Remover este membro da equipe?', {
          confirmLabel: 'Remover',
          danger: true,
        });
        if (!confirmed) return;

        errorBox.hidden = true;
        try {
          await api.delete(`/teams/${team.id}/members/${btn.dataset.removeMember}`);
          showToast('Membro removido.', 'success');
          await load();
        } catch (error) {
          showError(error.message);
        }
      });
    });

    const addMemberForm = document.getElementById('add-member-form');
    addMemberForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorBox.hidden = true;

      const emailInput = document.getElementById('member-email');
      const email = emailInput.value.trim();
      const submitBtn = addMemberForm.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Adicionando...';

      try {
        await api.post(`/teams/${team.id}/members`, { email });
        showToast('Membro adicionado.', 'success');
        await load();
      } catch (error) {
        showError(error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Adicionar';
      }
    });
  }

  async function loadTeamMatches(team) {
    const list = document.getElementById('team-matches-list');
    if (!list) return;

    try {
      const response = await api.get('/matches?limit=100');
      const teamMatches = response.data
        .filter((m) => m.teamA.id === team.id || m.teamB.id === team.id)
        .filter((m) => m.status === 'SCHEDULED')
        .slice(0, 5);

      if (teamMatches.length === 0) {
        list.innerHTML = emptyState('Nenhuma partida agendada');
        return;
      }

      list.innerHTML = teamMatches.map(matchListItem).join('');
    } catch (error) {
      list.innerHTML = errorState(error.message);
    }
  }
})();
