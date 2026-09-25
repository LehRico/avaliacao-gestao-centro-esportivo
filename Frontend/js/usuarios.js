(async function () {
  const currentUser = requireAuth(['ADMIN']);
  if (!currentUser) return;

  renderShell('usuarios', currentUser);

  await load();

  async function load() {
    const tbody = document.getElementById('users-tbody');
    try {
      const users = await api.get('/users');

      if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">${emptyState('Nenhum usuário encontrado')}</td></tr>`;
        return;
      }

      tbody.innerHTML = users.map((u) => userRow(u, currentUser)).join('');
      attachHandlers();
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="5">${errorState(error.message)}</td></tr>`;
    }
  }

  function attachHandlers() {
    document.querySelectorAll('[data-change-role]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.changeRole;
        const userName = btn.dataset.userName;
        const userRoleValue = btn.dataset.userRole;

        const newRole = await promptRoleChange(userName, userRoleValue);
        if (!newRole) return;

        try {
          await api.patch(`/users/${userId}/role`, { role: newRole });
          showToast('Papel atualizado.', 'success');
          await load();
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    });
  }
})();

function userRow(user, currentUser) {
  const isSelf = user.id === currentUser.id;
  const isAdmin = user.role === 'ADMIN';
  const canChangeRole = !isSelf && !isAdmin;

  return `
    <tr>
      <td style="font-weight: 600;">${user.name}</td>
      <td>${user.email}</td>
      <td>${roleBadge(user.role)}</td>
      <td class="card-subtitle">${formatDate(user.createdAt)}</td>
      <td>
        ${
          canChangeRole
            ? `<button class="btn btn-ghost btn-sm" data-change-role="${user.id}" data-user-name="${user.name}" data-user-role="${user.role}">Alterar papel</button>`
            : `<span class="card-subtitle">${isSelf ? 'Você' : '—'}</span>`
        }
      </td>
    </tr>
  `;
}

/**
 * Modal com seleção de papel (USER/ORGANIZER/ADMIN). Resolve com o
 * novo papel escolhido, ou null se cancelado/inalterado.
 */
function promptRoleChange(userName, currentRole) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="card-title" style="margin-bottom:0;">Alterar papel</h2>
        </div>
        <p class="card-subtitle" style="margin-bottom: var(--sp-4);">${userName}</p>
        <div class="field" style="margin-bottom:0;">
          <label for="role-select">Novo papel</label>
          <select id="role-select">
            <option value="USER" ${currentRole === 'USER' ? 'selected' : ''}>USER</option>
            <option value="ORGANIZER" ${currentRole === 'ORGANIZER' ? 'selected' : ''}>ORGANIZER</option>
            <option value="ADMIN" ${currentRole === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
          <button class="btn btn-primary" data-action="confirm">Salvar</button>
        </div>
      </div>
    `;

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(null));
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      const select = overlay.querySelector('#role-select');
      close(select.value);
    });
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(null);
    });

    document.body.appendChild(overlay);
  });
}
