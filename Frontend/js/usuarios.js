(async function () {
  const user = requireAuth(['ADMIN']);
  if (!user) return;

  renderShell('usuarios', user);

  const tbody = document.getElementById('users-tbody');

  try {
    const users = await api.get('/users');

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">${emptyState('Nenhum usuário encontrado')}</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(userRow).join('');
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="4">${errorState(error.message)}</td></tr>`;
  }
})();

function userRow(user) {
  return `
    <tr>
      <td style="font-weight: 600;">${user.name}</td>
      <td>${user.email}</td>
      <td>${roleBadge(user.role)}</td>
      <td class="card-subtitle">${formatDate(user.createdAt)}</td>
    </tr>
  `;
}
