const I18N = {
  en: {
    subtitle: 'Results update automatically',
    cookieTitle: 'We use cookies',
    cookieText: "We use a small, essential cookie only to make sure each person can vote once. If you decline, you won't be able to vote.",
    cookieAccept: 'Accept & continue',
    cookieDecline: 'Decline',
    votingClosed: 'Voting is currently closed.',
    thanks: 'Thanks, your vote has been recorded. You can watch the live results here.',
    needCookies: 'You must accept cookies to vote.',
    checkingLocation: 'Checking your location...',
    needLocation: 'We need access to your location to vote. Please enable it and try again.',
    couldNotVote: 'We could not register your vote.',
    connectionError: 'Connection error. Please try again.',
    voteBtn: 'Vote',
    votesLabel: 'vote(s)',
    total: 'Total votes'
  },
  fr: {
    subtitle: 'Les résultats se mettent à jour automatiquement',
    cookieTitle: 'Nous utilisons des cookies',
    cookieText: "Nous utilisons un cookie essentiel uniquement pour garantir qu'une personne ne vote qu'une seule fois. Si vous refusez, vous ne pourrez pas voter.",
    cookieAccept: 'Accepter et continuer',
    cookieDecline: 'Refuser',
    votingClosed: "Le vote est actuellement fermé.",
    thanks: 'Merci, votre vote a été enregistré. Vous pouvez suivre les résultats en direct ici.',
    needCookies: 'Vous devez accepter les cookies pour voter.',
    checkingLocation: 'Vérification de votre position...',
    needLocation: 'Nous avons besoin de votre position pour voter. Activez-la et réessayez.',
    couldNotVote: "Votre vote n'a pas pu être enregistré.",
    connectionError: 'Erreur de connexion. Veuillez réessayer.',
    voteBtn: 'Voter',
    votesLabel: 'vote(s)',
    total: 'Total des votes'
  }
};

let lang = localStorage.getItem('lang') || 'en';
let cookiesAccepted = localStorage.getItem('cookiesAccepted');

const statusEl = document.getElementById('status');
const candidatesEl = document.getElementById('candidates');
const totalEl = document.getElementById('total');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const cookieOverlay = document.getElementById('cookieOverlay');

let state = { candidates: [], hasVoted: false, locationRequired: false, votingOpen: true };

function t(key) {
  return I18N[lang][key];
}

function applyLanguage() {
  document.documentElement.lang = lang;
  subtitleEl.textContent = t('subtitle');
  document.getElementById('cookieTitle').textContent = t('cookieTitle');
  document.getElementById('cookieText').textContent = t('cookieText');
  document.getElementById('cookieAccept').textContent = t('cookieAccept');
  document.getElementById('cookieDecline').textContent = t('cookieDecline');
  document.getElementById('langEn').classList.toggle('active', lang === 'en');
  document.getElementById('langFr').classList.toggle('active', lang === 'fr');
  render();
}

document.getElementById('langEn').addEventListener('click', () => {
  lang = 'en';
  localStorage.setItem('lang', lang);
  applyLanguage();
});
document.getElementById('langFr').addEventListener('click', () => {
  lang = 'fr';
  localStorage.setItem('lang', lang);
  applyLanguage();
});

function showStatus(msg, type) {
  statusEl.style.display = 'block';
  statusEl.className = 'status ' + type;
  statusEl.textContent = msg;
}

function render() {
  titleEl.textContent = state.title || 'Live Vote';
  const totalVotes = state.candidates.reduce((sum, c) => sum + c.votes, 0);
  candidatesEl.innerHTML = '';

  if (cookiesAccepted !== 'yes') {
    showStatus(t('needCookies'), 'error');
  } else if (!state.votingOpen) {
    showStatus(t('votingClosed'), 'info');
  } else if (state.hasVoted) {
    showStatus(t('thanks'), 'success');
  } else {
    statusEl.style.display = 'none';
  }

  const canVote = cookiesAccepted === 'yes' && !state.hasVoted && state.votingOpen;

  state.candidates.forEach((c) => {
    const pct = totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0;
    const div = document.createElement('div');
    div.className = 'candidate';
    div.innerHTML = `
      ${c.photo ? `<img src="${c.photo}" alt="${c.name}">` : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=334155&color=fff" alt="${c.name}">`}
      <div class="candidate-info">
        <div class="candidate-name">${c.name}</div>
        <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="votes-count">${c.votes} ${t('votesLabel')} · ${pct}%</div>
      </div>
      <button class="vote-btn" data-id="${c.id}" ${canVote ? '' : 'disabled'}>${t('voteBtn')}</button>
    `;
    candidatesEl.appendChild(div);
  });

  totalEl.textContent = `${t('total')}: ${totalVotes}`;

  document.querySelectorAll('.vote-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleVote(btn.dataset.id));
  });
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

async function handleVote(candidateId) {
  if (cookiesAccepted !== 'yes') {
    showStatus(t('needCookies'), 'error');
    return;
  }

  let coords = {};
  if (state.locationRequired) {
    showStatus(t('checkingLocation'), 'info');
    try {
      coords = await getPosition();
    } catch (e) {
      showStatus(t('needLocation'), 'error');
      return;
    }
  }

  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, lat: coords.lat, lng: coords.lng })
    });
    const data = await res.json();
    if (!res.ok) {
      showStatus(data.error || t('couldNotVote'), 'error');
      return;
    }
    state.hasVoted = true;
    render();
  } catch (e) {
    showStatus(t('connectionError'), 'error');
  }
}

async function loadState() {
  const res = await fetch('/api/state');
  state = await res.json();
  render();
}

function initCookieConsent() {
  if (cookiesAccepted === 'yes' || cookiesAccepted === 'no') {
    cookieOverlay.classList.add('hidden');
  } else {
    cookieOverlay.classList.remove('hidden');
  }

  document.getElementById('cookieAccept').addEventListener('click', () => {
    cookiesAccepted = 'yes';
    localStorage.setItem('cookiesAccepted', 'yes');
    cookieOverlay.classList.add('hidden');
    render();
  });
  document.getElementById('cookieDecline').addEventListener('click', () => {
    cookiesAccepted = 'no';
    localStorage.setItem('cookiesAccepted', 'no');
    cookieOverlay.classList.add('hidden');
    render();
  });
}

const socket = io();
socket.on('results', (candidates) => {
  const votesById = Object.fromEntries(candidates.map((c) => [c.id, c]));
  state.candidates = state.candidates.map((c) => ({ ...c, ...votesById[c.id] }));
  render();
});

applyLanguage();
initCookieConsent();
loadState();
