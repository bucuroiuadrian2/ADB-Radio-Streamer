const player = document.getElementById('audio-player');

let currentStation = null;
let allStations = [];
let favorites = JSON.parse(localStorage.getItem('radio-favorites') || '[]');
let activeTab = 'browse';

const SVG = {
  heart: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
  heartOutline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
};

// Hardcoded Vanilla Radio stations
const VANILLA_STATIONS = [
  {
    id: 'vanilla-deep',
    name: 'Vanilla Radio – Deep Flavors',
    url: 'https://stream.vanillaradio.com:8016/stream/stream',
    logo: 'https://www.vanillaradio.com/wp-content/uploads/2020/04/Logo-deepflash-player-1000x1000-1.jpg',
    country: 'Greece',
    tags: 'deep house, afro',
  },
  {
    id: 'vanilla-smooth',
    name: 'Vanilla Radio – Smooth Flavors',
    url: 'https://smooth.vanillaradio.com:8032/stream',
    logo: 'https://www.vanillaradio.com/wp-content/uploads/2016/05/vanilla-logo-300x300.png',
    country: 'Greece',
    tags: 'smooth, lounge, bossa',
  },
  {
    id: 'vanilla-fresh',
    name: 'Vanilla Radio – Fresh Flavors',
    url: 'https://stream.vanillaradio.com:8028/stream',
    logo: 'https://www.vanillaradio.com/wp-content/uploads/2016/05/vanilla-logo-300x300.png',
    country: 'Greece',
    tags: 'pop, top 40, dance',
  },
];

async function loadStations() {
  try {
    //const res = await fetch('https://de1.api.radio-browser.info/json/stations/search?limit=3&order=votes&reverse=true&hidebroken=true');
    const data = await res.json();
    const apiStations = data
      .filter(s => s.url_resolved)
      .map(s => ({
        id: s.stationuuid,
        name: s.name.trim(),
        url: s.url_resolved,
        logo: s.favicon,
        country: s.country,
        tags: s.tags ? s.tags.split(',').slice(0, 2).join(', ') : '',
      }));
    // Vanilla Radio first, then API results
    allStations = [...VANILLA_STATIONS, ...apiStations];
    renderList();
  } catch (e) {
    allStations = VANILLA_STATIONS;
    document.getElementById('loading').style.display = 'none';
    renderList();
  }
}

function isFav(id) {
  return favorites.some(f => f.id === id);
}

function toggleFav(station, e) {
  e.stopPropagation();
  if (isFav(station.id)) {
    favorites = favorites.filter(f => f.id !== station.id);
  } else {
    favorites.unshift(station);
  }
  localStorage.setItem('radio-favorites', JSON.stringify(favorites));
  renderList();
}

function switchTab(tab, el) {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('search').value = '';
  renderList();
}

function filterStations() {
  renderList();
}

function getDisplayList() {
  const q = document.getElementById('search').value.toLowerCase();
  const list = activeTab === 'favorites' ? favorites : allStations;
  return q ? list.filter(s =>
    s.name.toLowerCase().includes(q) || s.tags.toLowerCase().includes(q)
  ) : list;
}

function stationJSON(s) {
  return JSON.stringify(s).replace(/"/g, '&quot;');
}

function renderList() {
  const list = getDisplayList();
  const container = document.getElementById('station-list');
  const empty = document.getElementById('empty-state');

  document.getElementById('loading').style.display = 'none';

  if (!list.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  const isPlaying = !player.paused;

  container.innerHTML = list.map(s => {
    const isActive = currentStation?.id === s.id;
    const fav = isFav(s.id);
    return `
    <div class="station-item ${isActive ? 'active' : ''}" onclick="selectStation(${stationJSON(s)})">
      <div class="item-logo">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
        ${s.logo ? `<img src="${s.logo}" alt="" onload="this.classList.add('loaded')" onerror="this.remove()" />` : ''}
      </div>
      <div class="item-meta">
        <div class="item-name">${s.name}</div>
        <div class="item-tags">${s.tags || s.country || '—'}</div>
      </div>
      <div class="item-actions">
        <div class="playing-indicator ${isActive && isPlaying ? 'visible' : ''}">
          <span></span><span></span><span></span>
        </div>
        <button class="btn-icon ${fav ? 'fav-active' : ''}"
          onclick="toggleFav(${stationJSON(s)}, event)"
          title="${fav ? 'Remove from favorites' : 'Add to favorites'}">
          ${fav ? SVG.heart : SVG.heartOutline}
        </button>
      </div>
    </div>`;
  }).join('');
}

function selectStation(station) {
  currentStation = station;
  player.src = station.url;
  player.volume = document.getElementById('volume').value;
  player.play().catch(() => {});
  updateNowPlaying();
  renderList();
}

function updateNowPlaying() {
  document.getElementById('np-name').textContent = currentStation?.name || 'Select a station';
  document.getElementById('np-country').textContent = currentStation?.country || '—';
  document.getElementById('live-badge').classList.toggle('visible', !!currentStation);

  const logoImg = document.getElementById('np-logo-img');
  if (currentStation?.logo) {
    logoImg.src = currentStation.logo;
    logoImg.onload = () => logoImg.classList.add('loaded');
    logoImg.onerror = () => logoImg.classList.remove('loaded');
  } else {
    logoImg.classList.remove('loaded');
  }
}

function togglePlay() {
  if (!currentStation) return;
  player.paused ? player.play() : player.pause();
}

function setVolume(v) {
  player.volume = v;
}

player.addEventListener('play', () => {
  document.getElementById('icon-play').style.display = 'none';
  document.getElementById('icon-pause').style.display = 'block';
  renderList();
});

player.addEventListener('pause', () => {
  document.getElementById('icon-play').style.display = 'block';
  document.getElementById('icon-pause').style.display = 'none';
  renderList();
});

loadStations();
