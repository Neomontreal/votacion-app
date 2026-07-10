const titleEl = document.getElementById('title');
const totalEl = document.getElementById('total');
const stageEl = document.getElementById('stage');

const MAX_PARTICIPANTS = 9;
const ASPECT_W = 3;
const ASPECT_H = 4;
const GAP = 18;

// Columns to use for each participant count, chosen so rows stay as even as possible.
const COLS_BY_COUNT = { 1: 1, 2: 2, 3: 3, 4: 2, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3 };

let candidates = [];
let title = 'Live Results';

function computeCardSize(count, containerW, containerH) {
  const cols = COLS_BY_COUNT[count] || 3;
  const rows = Math.ceil(count / cols);

  const availW = containerW - GAP * (cols - 1);
  const availH = containerH - GAP * (rows - 1);

  const widthLimitedW = availW / cols;
  const widthLimitedH = (widthLimitedW * ASPECT_H) / ASPECT_W;

  const heightLimitedH = availH / rows;
  const heightLimitedW = (heightLimitedH * ASPECT_W) / ASPECT_H;

  if (widthLimitedH <= heightLimitedH) {
    return { w: Math.floor(widthLimitedW), h: Math.floor(widthLimitedH) };
  }
  return { w: Math.floor(heightLimitedW), h: Math.floor(heightLimitedH) };
}

function render() {
  titleEl.textContent = title;
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  totalEl.textContent = `Total votes: ${totalVotes}`;

  const sorted = [...candidates].sort((a, b) => b.votes - a.votes).slice(0, MAX_PARTICIPANTS);
  const maxVotes = sorted.length ? sorted[0].votes : 0;

  stageEl.innerHTML = '';

  if (!sorted.length) {
    stageEl.innerHTML = '<div class="empty">No participants yet.</div>';
    return;
  }

  const rect = stageEl.getBoundingClientRect();
  const STAGE_TOP_PADDING = 34; // reserved space above cards for the crown, see CSS padding-top on #stage
  const { w, h } = computeCardSize(sorted.length, rect.width, rect.height - STAGE_TOP_PADDING);

  sorted.forEach((c) => {
    const pct = totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0;
    const isLeader = c.votes > 0 && c.votes === maxVotes;

    const card = document.createElement('div');
    card.className = 'card' + (isLeader ? ' leader' : '');
    card.style.width = w + 'px';
    card.style.height = h + 'px';

    const photoUrl = c.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=334155&color=fff&size=256`;

    card.innerHTML = `
      ${isLeader ? '<div class="crown">👑</div>' : ''}
      <div class="card-media">
        <img src="${photoUrl}" alt="${c.name}">
        <div class="overlay">
          <div class="name">${c.name}</div>
          <div class="pct">${pct}%</div>
          <div class="votes">${c.votes} votes</div>
        </div>
      </div>
    `;
    stageEl.appendChild(card);
  });
}

async function loadState() {
  const res = await fetch('/api/state');
  const data = await res.json();
  title = data.title || 'Live Results';
  candidates = data.candidates || [];
  render();
}

const socket = io();
socket.on('results', (updatedCandidates) => {
  const votesById = Object.fromEntries(updatedCandidates.map((c) => [c.id, c]));
  candidates = candidates.map((c) => ({ ...c, ...votesById[c.id] }));
  updatedCandidates.forEach((c) => {
    if (!candidates.find((x) => x.id === c.id)) candidates.push(c);
  });
  render();
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 100);
});

loadState();
setInterval(loadState, 30000); // safety refresh in case a socket event was missed
