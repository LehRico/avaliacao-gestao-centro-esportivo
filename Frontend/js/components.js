const MATCH_STATUS_LABEL = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  FINISHED: 'Finalizada',
  CANCELED: 'Cancelada',
};

const MATCH_STATUS_BADGE = {
  SCHEDULED: 'badge-info',
  IN_PROGRESS: 'badge-warning',
  FINISHED: 'badge-success',
  CANCELED: 'badge-danger',
};

const TOURNAMENT_STATUS_LABEL = {
  DRAFT: 'Rascunho',
  OPEN: 'Inscrições abertas',
  IN_PROGRESS: 'Em andamento',
  FINISHED: 'Finalizado',
  CANCELED: 'Cancelado',
};

const TOURNAMENT_STATUS_BADGE = {
  DRAFT: 'badge-neutral',
  OPEN: 'badge-info',
  IN_PROGRESS: 'badge-warning',
  FINISHED: 'badge-success',
  CANCELED: 'badge-danger',
};

const ROLE_BADGE = {
  USER: 'badge-neutral',
  ORGANIZER: 'badge-info',
  ADMIN: 'badge-warning',
};

function roleBadge(role) {
  const cls = ROLE_BADGE[role] ?? 'badge-neutral';
  return `<span class="badge ${cls}">${role}</span>`;
}

function statusBadge(status, labelMap, badgeMap) {
  const label = labelMap[status] ?? status;
  const cls = badgeMap[status] ?? 'badge-neutral';
  return `<span class="badge ${cls}">${label}</span>`;
}

function matchStatusBadge(status) {
  return statusBadge(status, MATCH_STATUS_LABEL, MATCH_STATUS_BADGE);
}

function tournamentStatusBadge(status) {
  return statusBadge(status, TOURNAMENT_STATUS_LABEL, TOURNAMENT_STATUS_BADGE);
}

function emptyState(title, description) {
  return `
    <div class="state-block">
      <div class="state-block-title">${title}</div>
      ${description ? `<p>${description}</p>` : ''}
    </div>
  `;
}

function errorState(message) {
  return `
    <div class="state-block">
      <div class="state-block-title" style="color: var(--danger);">Não foi possível carregar</div>
      <p>${message}</p>
    </div>
  `;
}

function loadingState() {
  return `<div class="state-block"><div class="spinner"></div></div>`;
}

/**
 * Card compacto de partida (usado em listas como "próximas partidas").
 */
function matchListItem(match) {
  const scoreLine =
    match.scoreA !== null && match.scoreB !== null
      ? `<span style="font-family: var(--font-score); font-weight: 700;">${match.scoreA} × ${match.scoreB}</span>`
      : `<span class="card-subtitle">${formatTime(match.scheduledAt)}</span>`;

  return `
    <a href="partida-detalhes.html?id=${match.id}" class="cluster" style="justify-content: space-between; padding: var(--sp-3) 0; border-bottom: 1px solid var(--border); text-decoration: none; color: inherit;">
      <div>
        <div style="font-weight: 600; font-size: var(--fs-sm);">${match.teamA.name} × ${match.teamB.name}</div>
        <div class="card-subtitle">${match.court.name} · ${formatDate(match.scheduledAt)}</div>
      </div>
      <div class="cluster">
        ${scoreLine}
        ${matchStatusBadge(match.status)}
      </div>
    </a>
  `;
}

function sidebarTemplate(activePage, user) {
  const isAdmin = user.role === 'ADMIN';
  const isOrganizerOrAdmin = user.role === 'ORGANIZER' || isAdmin;

  const link = (page, href, label) =>
    `<a href="${href}" class="sidebar-link${activePage === page ? ' active' : ''}">${label}</a>`;

  return `
    <div class="sidebar-brand">MATCH<span>POINT</span></div>
    <nav class="sidebar-nav">
      <span class="sidebar-section-label">Geral</span>
      ${link('dashboard', 'dashboard.html', 'Dashboard')}
      ${link('partidas', 'partidas.html', 'Partidas')}
      ${link('torneios', 'torneios.html', 'Torneios')}
      ${link('equipes', 'equipes.html', 'Equipes')}

      ${
        isOrganizerOrAdmin
          ? `
        <span class="sidebar-section-label">Gestão</span>
        ${link('quadras', 'quadras.html', 'Quadras')}
        ${link('esportes', 'esportes.html', 'Esportes')}
      `
          : ''
      }
      ${isAdmin ? link('usuarios', 'usuarios.html', 'Usuários') : ''}

      <span class="sidebar-section-label">Conta</span>
      ${link('perfil', 'perfil.html', 'Meu perfil')}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">${initials(user.name)}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user.name}</div>
          <div class="sidebar-user-role">${user.role}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Monta a sidebar, conecta o botão de logout e o menu mobile
 * (hambúrguer + drawer). Chame em toda página privada, após
 * requireAuth().
 */
function renderShell(activePage, user) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.innerHTML = sidebarTemplate(activePage, user);

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  setupMobileMenu();
}

function setupMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  const openMenu = () => {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-open');
  };

  const closeMenu = () => {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-open');
  };

  const toggleBtn = document.getElementById('menu-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', openMenu);

  overlay.addEventListener('click', closeMenu);

  sidebar.querySelectorAll('.sidebar-link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

/**
 * Modal de confirmação reutilizável. Retorna uma Promise<boolean> —
 * true se o usuário confirmar, false se cancelar/fechar. Use antes de
 * ações irreversíveis (ex: finalizar/cancelar um torneio ou partida).
 *
 * Exemplo: if (await confirmAction('Finalizar o torneio?')) { ... }
 */
function confirmAction(message, { confirmLabel = 'Confirmar', danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="alertdialog" aria-modal="true">
        <p style="font-size: var(--fs-base);">${message}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" data-action="cancel">Cancelar</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${confirmLabel}</button>
        </div>
      </div>
    `;

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(false);
    });

    document.body.appendChild(overlay);
  });
}
