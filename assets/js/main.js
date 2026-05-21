/* ===== NAVBAR ===== */
const navbar = document.querySelector('.navbar');
const ham    = document.querySelector('.ham');
const navMob = document.querySelector('.nav-mobile');

window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 10);
});
ham?.addEventListener('click', () => navMob?.classList.toggle('open'));
document.addEventListener('click', e => {
  if (navbar && !navbar.contains(e.target)) navMob?.classList.remove('open');
});

// Active link
document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
  const href = a.getAttribute('href');
  if (href && (location.pathname.endsWith(href) || location.href === a.href))
    a.classList.add('active');
});

/* ===== FAQ ===== */
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-wrap');
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-wrap').forEach(i => i.classList.remove('open'));
    if (!open) item.classList.add('open');
  });
});

/* ===== DATA ===== */
let carsData = [];

async function loadCars() {
  if (carsData.length) return carsData;
  try {
    const r = await fetch('assets/data/cars.json');
    carsData = await r.json();
  } catch(e) { console.error('cars.json load failed', e); }
  return carsData;
}

function fmt(n) {
  return 'Rp\u202F' + n.toLocaleString('id-ID');
}

/* ===== RENDER CAR CARD ===== */
function makeCard(car) {
  const el = document.createElement('div');
  el.className = 'car-card';
  el.dataset.id       = car.id;
  el.dataset.category = car.category;
  el.dataset.seats    = car.seats;
  el.dataset.trans    = car.transmission;
  el.innerHTML = `
    <div class="car-img">
      <img src="${car.images.exterior}" alt="${car.name}" loading="lazy">
      <span class="car-chip">${car.category}</span>
    </div>
    <div class="car-body">
      <h3 class="car-name">${car.name}</h3>
      <div class="car-pills">
        <span class="car-pill">👥 ${car.seats} seats</span>
        <span class="car-pill">⚙️ ${car.transmission}</span>
        <span class="car-pill">⛽ ${car.fuel_type}</span>
        <span class="car-pill">🧳 ${car.luggage} bags</span>
      </div>
      <p class="car-desc">${car.description}</p>
    </div>
    <div class="car-footer">
      <div>
        <div class="car-price-val">${fmt(car.base_price)}</div>
        <div class="car-price-sub">/ day · self drive</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openModal('${car.id}')">Check Availability</button>
    </div>`;
  return el;
}

async function renderFleet(id, limit) {
  const el = document.getElementById(id);
  if (!el) return;
  const cars = await loadCars();
  const list = limit ? cars.slice(0, limit) : cars;
  el.innerHTML = '';
  list.forEach(c => el.appendChild(makeCard(c)));
}

/* ===== FILTERS ===== */
function initFilters() {
  document.querySelectorAll('.f-btn[data-filter]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.f-btn[data-filter]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      applyFilters();
    });
  });
  ['#filter-trans','#filter-seats'].forEach(sel => {
    document.querySelector(sel)?.addEventListener('change', applyFilters);
  });
}

function applyFilters() {
  const cat   = document.querySelector('.f-btn[data-filter].active')?.dataset.filter || 'all';
  const trans = document.querySelector('#filter-trans')?.value || 'all';
  const seats = document.querySelector('#filter-seats')?.value || 'all';
  const grid  = document.getElementById('fleet-grid');
  if (!grid) return;
  let visible = 0;
  grid.querySelectorAll('.car-card').forEach(c => {
    const ok =
      (cat   === 'all' || c.dataset.category === cat) &&
      (trans === 'all' || c.dataset.trans     === trans) &&
      (seats === 'all' || parseInt(c.dataset.seats) >= parseInt(seats));
    c.style.display = ok ? '' : 'none';
    if (ok) visible++;
  });
  const ct = document.querySelector('.fleet-ct');
  if (ct) ct.textContent = `${visible} vehicle${visible !== 1 ? 's' : ''} found`;
}

/* ===== MODAL ===== */
const overlay = document.getElementById('booking-modal');

function openModal(carId) {
  const car = carsData.find(c => c.id === carId);
  if (!car || !overlay) return;
  overlay.querySelector('#modal-car-name').textContent = car.name;
  overlay.querySelector('#modal-car-cat').textContent  = `${car.category} · ${car.seats} seats`;
  overlay.querySelector('#modal-car-img').src          = car.images.exterior;
  overlay.querySelector('#modal-car-img').alt          = car.name;
  overlay.dataset.carId = carId;
  const today = new Date().toISOString().split('T')[0];
  const pi = overlay.querySelector('#pickup-date');
  const ri = overlay.querySelector('#return-date');
  pi.min = today; pi.value = today;
  ri.min = today; ri.value = '';
  updateEstimate();
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay?.classList.remove('open');
  document.body.style.overflow = '';
}

if (overlay) {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  ['#pickup-date','#return-date','#driver-option'].forEach(s => {
    overlay.querySelector(s)?.addEventListener('change', updateEstimate);
  });
  document.getElementById('booking-form')?.addEventListener('submit', submitBooking);
}

function updateEstimate() {
  const car = carsData.find(c => c.id === overlay?.dataset.carId);
  if (!car) return;
  const pu   = overlay.querySelector('#pickup-date')?.value;
  const re   = overlay.querySelector('#return-date')?.value;
  const drv  = overlay.querySelector('#driver-option')?.value;
  let days   = 1;
  if (pu && re) { const d = (new Date(re)-new Date(pu))/86400000; if (d > 0) days = Math.ceil(d); }
  const base = car.base_price * days;
  const dFee = drv === 'with_driver' ? car.driver_price * days : 0;
  overlay.querySelector('#calc-dur').textContent   = `${days} day${days>1?'s':''}`;
  overlay.querySelector('#calc-base').textContent  = fmt(base);
  overlay.querySelector('#calc-drv').textContent   = fmt(dFee);
  overlay.querySelector('#calc-tot').textContent   = fmt(base + dFee);
  const dr = overlay.querySelector('#drv-row');
  if (dr) dr.style.display = drv === 'with_driver' ? 'flex' : 'none';
}

function submitBooking(e) {
  e.preventDefault();
  const car = carsData.find(c => c.id === overlay?.dataset.carId);
  if (!car) return;
  const f   = e.target;
  const get = id => f.querySelector(`#${id}`)?.value || '';
  const name = get('cust-name'), phone = get('cust-phone');
  const pu   = get('pickup-date'), re = get('return-date');
  const drv  = get('driver-option'), loc = get('pickup-loc'), notes = get('notes');
  const dur  = overlay.querySelector('#calc-dur')?.textContent  || '1 day';
  const tot  = overlay.querySelector('#calc-tot')?.textContent  || '—';
  const svc  = drv === 'with_driver' ? 'With Driver' : 'Self Drive';
  const msg  =
`Hello, I would like to check availability 

*Vehicle:* ${car.name}
*Pickup Date:* ${pu}
*Return Date:* ${re || pu}
*Duration:* ${dur}
*Service:* ${svc}
*Pickup Location:* ${loc}${notes ? `\n*Notes:* ${notes}` : ''}

*Estimated Price:* ${tot}
*Name:* ${name}
*WhatsApp:* ${phone}

Please confirm availability. Thank you!`;
  window.open(`https://wa.me/628115490273?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ===== MARQUEE duplicate ===== */
const track = document.querySelector('.band-track');
if (track) track.innerHTML += track.innerHTML;

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadCars();
  renderFleet('fleet-preview', 3);
  renderFleet('fleet-grid');
  initFilters();
  applyFilters();
});
