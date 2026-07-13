/* =========================================================
   WishMap — client script
   Wired to your Spring Boot REST API.
   Change API_BASE when frontend/backend are deployed separately.

   Endpoints used:
     POST   /api/auth/signup     body: { email, password, name } -> { token }
     POST   /api/auth/login      body: { email, password }       -> { token }
     GET    /api/geocode?query=  -> [{ lat, lon, display_name }]
     POST   /api/wishlist        body: { name, notes, latitude, longitude, category, imageUrl, ... }
     GET    /api/wishlist/all
     PUT    /api/wishlist/{id}/visited
     DELETE /api/wishlist/{id}
     POST   /api/wishlist/nearby body: { currentLat, currentLon, radiusMeters } -> [{ placeId, name, notes, distanceMeters }]
   ========================================================= */

const API_BASE = ''; // e.g. 'https://your-backend.onrender.com' once split from frontend
const NEARBY_RADIUS_METERS = 5000; // 5km — generous default so the demo is testable anywhere in Bangalore

let places = [];
let currentFilter = 'all';
let userLat = null, userLng = null;
let map, markersLayer, userMarker, userWatchId;
let pendingAction = null;

/* ---------- Auth helpers ---------- */
function isLoggedIn(){ return !!localStorage.getItem('token'); }
function authHeader(){ return { 'Authorization': 'Bearer ' + localStorage.getItem('token') }; }

function updateNavState(){
  document.getElementById('nav-logged-out').classList.toggle('hidden', isLoggedIn());
  document.getElementById('nav-logged-in').classList.toggle('hidden', !isLoggedIn());
  if (isLoggedIn()){
    const email = localStorage.getItem('email') || '';
    document.getElementById('user-pill').textContent = 'Hi, ' + (email.split('@')[0] || 'there');
  }
}

/* Fixed category artwork keeps every card attractive without repeated live-search photos. */
const CATEGORY_IMAGES = {
  'Food & Drink': 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=900&q=85',
  'Viewpoint': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85',
  'Stay': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=85',
  'Culture': 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=900&q=85',
  'Nature': 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=900&q=85',
  'Shop': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=85',
  'Other': 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=900&q=85'
};
function imageForCategory(category){ return CATEGORY_IMAGES[category] || CATEGORY_IMAGES.Other; }
function loadHeroImages(){
  [['hero-img-1', CATEGORY_IMAGES.Nature], ['hero-img-2', CATEGORY_IMAGES.Viewpoint], ['hero-img-3', CATEGORY_IMAGES['Food & Drink']]].forEach(([id, url]) => {
    const element = document.getElementById(id);
    if (element) element.style.backgroundImage = `url("${url}")`;
  });
}
/* ---------- Map (Leaflet, centered on Bangalore) ---------- */
function initMap(){
  map = L.map('map').setView([12.9716, 77.5946], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function renderMapPins(){
  markersLayer.clearLayers();
  places.forEach(p => {
    if (p.latitude && p.longitude){
      L.marker([p.latitude, p.longitude]).addTo(markersLayer)
        .bindPopup(`<b>${escapeHtml(p.name)}</b><br>${escapeHtml(p.category || '')}`);
    }
  });
}

/* ---------- Live "you are here" blue dot (Google Maps style), updates continuously ---------- */
const userDotIcon = L.divIcon({
  className: '',
  html: `<div class="user-dot-icon"><span class="halo"></span><span class="core"></span></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

function startLiveLocation(){
  if (!navigator.geolocation) return;
  let firstFix = true;
  userWatchId = navigator.geolocation.watchPosition(pos => {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;

    if (!userMarker){
      userMarker = L.marker([userLat, userLng], { icon: userDotIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarker.setLatLng([userLat, userLng]); // dynamic: moves live as your actual location changes
    }

    if (firstFix){ map.setView([userLat, userLng], 13); firstFix = false; }
    if (currentFilter === 'nearby') render();
  }, () => { /* permission denied or unavailable — nearby check will ask again on demand */ },
  { enableHighAccuracy: true, maximumAge: 5000 });
}

/* ---------- Geocode search (public endpoint, no auth needed) ---------- */
let geoTimeout;
const searchInput = document.getElementById('p-search');
const geoResultsEl = document.getElementById('geo-results');
const categoryInput = document.getElementById('p-cat');
const otherCategoryField = document.getElementById('other-category-field');
const otherCategoryInput = document.getElementById('p-other-category');
categoryInput.addEventListener('change', () => {
  const isOther = categoryInput.value === 'Other';
  otherCategoryField.classList.toggle('hidden', !isOther);
  otherCategoryInput.required = isOther;
  if (!isOther) otherCategoryInput.value = '';
});

searchInput.addEventListener('input', () => {
  clearTimeout(geoTimeout);
  const query = searchInput.value.trim();
  if (query.length < 3){ geoResultsEl.innerHTML = ''; return; }
  geoTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/geocode?query=${encodeURIComponent(query + ', Bangalore')}`);
      const results = await res.json();
      geoResultsEl.innerHTML = (results || []).map(r => `
        <div class="geo-result-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${escapeHtml(r.display_name)}">
          ${escapeHtml(r.display_name)}
        </div>
      `).join('');
    } catch(e){ geoResultsEl.innerHTML = ''; }
  }, 400);
});

geoResultsEl.addEventListener('click', (e) => {
  const item = e.target.closest('.geo-result-item');
  if (!item) return;
  document.getElementById('p-lat').value = item.dataset.lat;
  document.getElementById('p-lng').value = item.dataset.lon;
  searchInput.value = item.dataset.name.split(',')[0];
  geoResultsEl.innerHTML = '';
});

/* ---------- Wishlist data ---------- */
async function loadWishlist(){
  if (!isLoggedIn()){ places = []; render(); return; }
  try {
    const res = await fetch(`${API_BASE}/api/wishlist/all`, { headers: authHeader() });
    if (!res.ok) return;
    places = await res.json();
    render();
  } catch(e){ /* network error - leave grid as is */ }
}

/* ---------- Render place cards + stats ---------- */
const gridEl = document.getElementById('places-grid');

function render(){
  const total = places.length;
  const visited = places.filter(p => p.visited).length;
  document.querySelector('[data-stat="total"]').textContent = total;
  document.querySelector('[data-stat="visited"]').textContent = visited;
  document.querySelector('[data-stat="remaining"]').textContent = total - visited;
  document.querySelector('[data-stat="pct"]').textContent = total ? Math.round(visited/total*100) : 0;

  if (!isLoggedIn()){
    gridEl.innerHTML = `<div class="empty-state"><div class="icon">🔒</div>Log in or sign up to start building your wishlist.</div>`;
    renderMapPins();
    return;
  }

  let filtered = places;
  if (currentFilter === 'visited') filtered = places.filter(p => p.visited);
  if (currentFilter === 'notvisited') filtered = places.filter(p => !p.visited);
  if (currentFilter === 'nearby' && userLat != null){
    filtered = places
      .filter(p => distanceMeters(userLat, userLng, p.latitude, p.longitude) <= NEARBY_RADIUS_METERS)
      .sort((a,b) => distanceMeters(userLat,userLng,a.latitude,a.longitude) - distanceMeters(userLat,userLng,b.latitude,b.longitude));
  }

  if (filtered.length === 0){
    gridEl.innerHTML = `<div class="empty-state"><div class="icon">🗺️</div>No places here yet — search above to add your first one.</div>`;
    renderMapPins();
    return;
  }

  gridEl.innerHTML = filtered.map(p => `
    <article class="place" data-id="${p.id}">
      <div class="cover" style="background-image:url('${imageForCategory(p.category)}')">
        <span class="badge">${escapeHtml(p.category || 'Other')}</span>
        <span class="status ${p.visited ? 'visited' : ''}">
          <i></i>${p.visited ? 'Visited' : 'On the list'}
        </span>
      </div>
      <div class="body">
        <h4>${escapeHtml(p.name)}</h4>
        <div class="loc">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(p.city || 'Bangalore')}
        </div>
        <p class="notes">${escapeHtml(p.notes || '')}</p>
      </div>
      <div class="actions">
        <button class="btn btn-outline btn-sm" data-action="visit" ${p.visited ? 'disabled style="opacity:.5"' : ''}>
          ${p.visited ? '✓ Visited' : 'Mark visited'}
        </button>
        <button class="btn btn-outline btn-sm" data-action="maps">Open maps</button>
        <button class="btn btn-danger btn-sm" data-action="delete" aria-label="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6"/></svg>
        </button>
      </div>
    </article>
  `).join('');

  renderMapPins();
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function distanceMeters(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const dLat = (lat2-lat1) * Math.PI/180, dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDistance(m){
  return m < 1000 ? `${Math.round(m)} m away` : `${(m/1000).toFixed(1)} km away`;
}

/* ---------- Card actions ---------- */
gridEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const card = btn.closest('.place');
  const id = card.dataset.id;
  const action = btn.dataset.action;
  const place = places.find(p => String(p.id) === String(id));

  if (action === 'visit' && !place.visited){
    await fetch(`${API_BASE}/api/wishlist/${id}/visited`, { method: 'PUT', headers: authHeader() });
    await loadWishlist();
  }
  if (action === 'maps'){
    const url = place.googleMapsLink || `https://www.google.com/maps?q=${place.latitude},${place.longitude}`;
    window.open(url, '_blank');
  }
  if (action === 'delete'){
    if (!confirm(`Remove "${place.name}" from your map?`)) return;
    await fetch(`${API_BASE}/api/wishlist/${id}`, { method: 'DELETE', headers: authHeader() });
    await loadWishlist();
  }
});

/* ---------- Filter chips ---------- */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

/* ---------- Add place form (gated behind login) ---------- */
document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isLoggedIn()){ pendingAction = submitAddPlace; openAuth('signup'); return; }
  await submitAddPlace();
});

async function submitAddPlace(){
  const lat = document.getElementById('p-lat').value;
  const lng = document.getElementById('p-lng').value;
  if (!lat || !lng){ alert('Search for a place and select it from the dropdown first.'); return; }

  const name = searchInput.value.trim();
  const selectedCategory = categoryInput.value;
  const otherCategory = otherCategoryInput.value.trim();
  const category = selectedCategory === 'Other' && otherCategory ? `Other · ${otherCategory}` : selectedCategory;
  const payload = {
    name,
    notes: document.getElementById('p-notes').value.trim(),
    category,
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    city: 'Bangalore',
    country: 'India',
    googleMapsLink: `https://www.google.com/maps?q=${lat},${lng}`,
    imageUrl: imageForCategory(selectedCategory)
  };

  const res = await fetch(`${API_BASE}/api/wishlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(payload)
  });

  if (res.ok){
    document.getElementById('add-form').reset();
    document.getElementById('p-lat').value = '';
    document.getElementById('p-lng').value = '';
    await loadWishlist();
  } else {
    alert('Could not save this place — please try again.');
  }
}

/* ---------- MAIN FEATURE: "What's nearby?" — the actual point of this app ---------- */
const nearbyFab = document.getElementById('nearby-fab');
const nearbyModal = document.getElementById('nearby-modal');
const nearbyTitle = document.getElementById('nearby-title');
const nearbySub = document.getElementById('nearby-sub');
const nearbyList = document.getElementById('nearby-list');

nearbyFab.addEventListener('click', checkNearby);
document.querySelector('[data-close-nearby]').addEventListener('click', () => nearbyModal.classList.remove('open'));
nearbyModal.addEventListener('click', (e) => { if (e.target === nearbyModal) nearbyModal.classList.remove('open'); });

function checkNearby(){
  if (!isLoggedIn()){
    pendingAction = checkNearby;
    openAuth('login');
    return;
  }

  nearbyTitle.textContent = 'Checking your location…';
  nearbySub.textContent = 'One second — finding what\'s around you.';
  nearbyList.innerHTML = '';
  nearbyModal.classList.add('open');

  if (!navigator.geolocation){
    nearbyTitle.textContent = 'Location not available';
    nearbySub.textContent = 'Your browser doesn\'t support geolocation.';
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    userLat = lat; userLng = lng;

    // FIX (mobile bug): fetching + rendering results now happens in its own try/catch,
    // fully separate from the notification attempt below. Previously a single catch
    // wrapped both, so on mobile browsers where `new Notification()` throws (many
    // Android Chrome builds don't support the constructor), the catch fired AFTER
    // results had already rendered and overwrote the title with a misleading
    // "could not reach the server" message even though the backend worked fine.
    try {
      const res = await fetch(`${API_BASE}/api/wishlist/nearby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ currentLat: lat, currentLon: lng, radiusMeters: NEARBY_RADIUS_METERS })
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const results = await res.json();
      renderNearbyResults(results); // rendering the cards must succeed before we ever try the notification
    } catch (e){
      console.error('Nearby fetch/render error:', e);
      nearbyTitle.textContent = 'Something went wrong';
      nearbySub.textContent = e.message || 'Could not reach the server — check your connection.';
    }
  }, () => {
    nearbyTitle.textContent = 'Location permission needed';
    nearbySub.textContent = 'Allow location access in your browser to check what\'s nearby.';
  }, { enableHighAccuracy: true });
}

function renderNearbyResults(results){
  if (!results || results.length === 0){
    nearbyTitle.textContent = 'Nothing nearby yet';
    nearbySub.textContent = `No wishlisted places within ${(NEARBY_RADIUS_METERS/1000).toFixed(0)}km of you right now.`;
    nearbyList.innerHTML = `<div class="nearby-empty"><div class="icon">🧭</div>Save a few more places, then check again once you're out and about.</div>`;
    return;
  }

  nearbyTitle.textContent = `${results.length} place${results.length > 1 ? 's' : ''} nearby!`;
  nearbySub.textContent = 'You might want to visit and enjoy 👇';

  nearbyList.innerHTML = results.map(r => `
    <button class="nearby-item" type="button" data-nearby-place-id="${r.placeId}" aria-label="Get directions to ${escapeHtml(r.name)}">
      <div class="icon">📍</div>
      <div class="info">
        <h4>${escapeHtml(r.name)}</h4>
        <p>${escapeHtml(r.notes || 'On your wishlist')} · Tap for directions</p>
      </div>
      <div class="distance">${formatDistance(r.distanceMeters)}</div>
      <span class="directions">Directions ↗</span>
    </button>
  `).join('');

  // Also surface the closest one as a real OS-level notification, if permitted.
  // FIX: this runs in its own try/catch — on many mobile browsers `new Notification()`
  // throws (Illegal constructor) even when permission is "granted". That must never
  // be allowed to overwrite the results we already rendered above.
  const closest = results[0];
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted'){
      new Notification('WishMap', {
        body: `${closest.name} is ${formatDistance(closest.distanceMeters)} — you might visit and enjoy!`
      });
    }
  } catch (notifErr){
    console.log('Notification not supported on this device:', notifErr);
  }
}

nearbyList.addEventListener('click', (event) => {
  const item = event.target.closest('[data-nearby-place-id]');
  if (!item) return;
  const place = places.find(p => String(p.id) === item.dataset.nearbyPlaceId);
  if (!place) return;
  const destination = `${place.latitude},${place.longitude}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=walking`;
  // FIX: window.open() can be blocked or behave inconsistently on some mobile browsers.
  // window.location.href is more reliable for navigating away on mobile.
  window.location.href = url;
});
if (typeof Notification !== 'undefined' && Notification.permission === 'default'){
  Notification.requestPermission();
}

/* ---------- Auth modal ---------- */
const modal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authSub = document.getElementById('auth-sub');
const authSubmit = document.getElementById('auth-submit');
const authFoot = document.getElementById('auth-foot');
const authError = document.getElementById('auth-error');
const nameField = document.querySelector('[data-only="signup"]');

function openAuth(mode='login'){
  setAuthMode(mode);
  authError.textContent = '';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAuth(){
  modal.classList.remove('open');
  document.body.style.overflow = '';
  pendingAction = null;
}
function setAuthMode(mode){
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === mode));
  const isSignup = mode === 'signup';
  nameField.hidden = !isSignup;
  authTitle.textContent = isSignup ? 'Start your WishMap' : 'Welcome back';
  authSub.textContent = isSignup ? 'Save your first place in under a minute.' : 'Sign in to keep saving places.';
  authSubmit.textContent = isSignup ? 'Create account' : 'Log in';
  authFoot.innerHTML = isSignup
    ? `Already have an account? <a href="#" data-tab-link="login">Log in</a>`
    : `New here? <a href="#" data-tab-link="signup">Create an account</a>`;
}

document.querySelectorAll('[data-open-auth]').forEach(b => b.addEventListener('click', () => openAuth(b.dataset.openAuth)));
document.querySelector('[data-close-auth]').addEventListener('click', closeAuth);
modal.addEventListener('click', (e) => { if (e.target === modal) closeAuth(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape'){ closeAuth(); nearbyModal.classList.remove('open'); } });
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => setAuthMode(t.dataset.tab)));
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-tab-link]');
  if (link){ e.preventDefault(); setAuthMode(link.dataset.tabLink); }
});

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mode = document.querySelector('.tab.active').dataset.tab;
  const email = document.getElementById('a-email').value;
  const password = document.getElementById('a-pass').value;
  const name = document.getElementById('a-name').value;

  const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
  const body = mode === 'login' ? { email, password } : { email, password, name };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok){
      authError.textContent = data.message || 'Something went wrong. Please try again.';
      return;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('email', email);
    updateNavState();
    closeAuth();
    await loadWishlist();

    if (pendingAction){ const fn = pendingAction; pendingAction = null; fn(); }
  } catch (err){
    authError.textContent = 'Network error — is the backend running?';
  }
});

/* ---------- Logout ---------- */
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  updateNavState();
  places = [];
  render();
});

/* ---------- Initial paint ---------- */
initMap();
updateNavState();
loadWishlist();
loadHeroImages();
startLiveLocation();