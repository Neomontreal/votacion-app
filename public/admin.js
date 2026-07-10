const candidatesListEl = document.getElementById('candidatesList');
const totalVotesEl = document.getElementById('totalVotes');
const publicLinkEl = document.getElementById('publicLink');

publicLinkEl.href = window.location.origin + '/';
publicLinkEl.textContent = window.location.origin + '/';

async function loadAdminState() {
  const res = await fetch('/api/admin/state');
  const data = await res.json();

  document.getElementById('votingOpen').checked = data.config.votingOpen;
  document.getElementById('title').value = data.config.title || '';
  document.getElementById('lat').value = data.config.lat ?? '';
  document.getElementById('lng').value = data.config.lng ?? '';
  document.getElementById('radius').value = data.config.radiusMeters ?? 0;
  totalVotesEl.textContent = `Total de votos registrados: ${data.totalVotes}`;

  candidatesListEl.innerHTML = '';
  data.candidates.forEach((c) => {
    const row = document.createElement('div');
    row.className = 'candidate-row';
    row.innerHTML = `
      <span>${c.name} <span class="muted">(${c.votes} votos)</span></span>
      <button class="danger" data-id="${c.id}" style="margin-top:0;">Eliminar</button>
    `;
    row.querySelector('button').addEventListener('click', () => deleteCandidate(c.id));
    candidatesListEl.appendChild(row);
  });
}

async function deleteCandidate(id) {
  if (!confirm('¿Eliminar este candidato?')) return;
  await fetch('/api/admin/candidates/' + id, { method: 'DELETE' });
  loadAdminState();
}

document.getElementById('addCandidateBtn').addEventListener('click', async () => {
  const name = document.getElementById('newName').value.trim();
  const photo = document.getElementById('newPhoto').value.trim();
  if (!name) return alert('Escribe un nombre.');
  const res = await fetch('/api/admin/candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, photo })
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'No se pudo agregar.');
    return;
  }
  document.getElementById('newName').value = '';
  document.getElementById('newPhoto').value = '';
  loadAdminState();
});

document.getElementById('saveTitleBtn').addEventListener('click', async () => {
  const title = document.getElementById('title').value;
  const votingOpen = document.getElementById('votingOpen').checked;
  await fetch('/api/admin/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, votingOpen })
  });
  loadAdminState();
});

document.getElementById('saveLocationBtn').addEventListener('click', async () => {
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  const radiusMeters = document.getElementById('radius').value;
  await fetch('/api/admin/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: lat === '' ? null : Number(lat),
      lng: lng === '' ? null : Number(lng),
      radiusMeters: radiusMeters === '' ? 0 : Number(radiusMeters)
    })
  });
  loadAdminState();
});

document.getElementById('useMyLocationBtn').addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Geolocalización no soportada en este navegador.');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      document.getElementById('lat').value = pos.coords.latitude;
      document.getElementById('lng').value = pos.coords.longitude;
    },
    () => alert('No se pudo obtener tu ubicación.')
  );
});

document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!confirm('¿Reiniciar todos los votos? Esta acción no se puede deshacer.')) return;
  await fetch('/api/admin/reset-votes', { method: 'POST' });
  loadAdminState();
});

loadAdminState();
