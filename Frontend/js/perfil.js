(async function () {
  const user = requireAuth();
  if (!user) return;

  renderShell('perfil', user);

  const content = document.getElementById('page-content');

  try {
    const me = await api.get('/users/me');
    content.innerHTML = renderProfile(me);
  } catch (error) {
    content.innerHTML = `<div class="card">${errorState(error.message)}</div>`;
  }
})();

function renderProfile(user) {
  return `
    <div class="card" style="text-align: center;">
      <div class="sidebar-user-avatar" style="width: 64px; height: 64px; font-size: var(--fs-xl); margin: 0 auto var(--sp-4);">
        ${initials(user.name)}
      </div>
      <h1 style="font-size: var(--fs-xl);">${user.name}</h1>
      <div style="margin-top: var(--sp-2);">${roleBadge(user.role)}</div>
    </div>

    <div class="card" style="margin-top: var(--sp-5);">
      <h2 class="card-title">Informações da conta</h2>
      <div class="stack" style="margin-top: var(--sp-4);">
        <div>
          <div class="card-subtitle">E-mail</div>
          <div style="font-weight: 500;">${user.email}</div>
        </div>
        <div>
          <div class="card-subtitle">Membro desde</div>
          <div style="font-weight: 500;">${formatDate(user.createdAt)}</div>
        </div>
      </div>
    </div>
  `;
}
