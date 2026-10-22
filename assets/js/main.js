'use strict';
const email = document.querySelector('#email-link');
email.href = 'mailto:' + ['zhao0537', 'e.ntu.edu.sg'].join('@');
email.hidden = false;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const loops = [...document.querySelectorAll('.media:not(.media-carousel) video')];
const dialog = document.querySelector('#video-dialog'), fullVideo = dialog.querySelector('video');
const visible = new Set(), userPaused = new Set(), manualPlay = new Set(), autoplayFailed = new Set();
const carouselSync = [];
function updateButton(video) {
  const button = video.parentElement.querySelector('.loop-toggle');
  button.hidden = !reduceMotion.matches && !autoplayFailed.has(video);
  button.setAttribute('aria-pressed', String(!video.paused));
  button.setAttribute('aria-label', (video.paused ? 'Play' : 'Pause') + ' preview: ' + video.getAttribute('aria-label'));
  button.firstElementChild.textContent = video.paused ? '▶' : 'Ⅱ';
}
function play(video) {
  if (!video.hasAttribute('src')) video.src = video.dataset.src;
  video.play().then(() => { autoplayFailed.delete(video); updateButton(video); }).catch(error => {
    if (error.name !== 'AbortError') autoplayFailed.add(video);
    updateButton(video);
  });
}
function syncPlayback() {
  loops.forEach(video => {
    if (visible.has(video) && (!reduceMotion.matches || manualPlay.has(video)) && !document.hidden && !dialog.open && !userPaused.has(video) && !autoplayFailed.has(video)) play(video);
    else video.pause();
    updateButton(video);
  });
  carouselSync.forEach(sync => sync());
}
const mediaObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.isIntersecting && entry.intersectionRatio >= 0.2 ? visible.add(entry.target) : visible.delete(entry.target));
  syncPlayback();
}, {threshold: [0, 0.2]});
loops.forEach(video => {
  updateButton(video); mediaObserver.observe(video);
  ['play', 'pause'].forEach(event => video.addEventListener(event, () => updateButton(video)));
  video.parentElement.querySelector('.loop-toggle').addEventListener('click', () => {
    if (video.paused) { userPaused.delete(video); manualPlay.add(video); autoplayFailed.delete(video); play(video); }
    else { userPaused.add(video); manualPlay.delete(video); video.pause(); }
  });
});
// Carousel: retain visible dwell time across viewport, tab and dialog pauses.
document.querySelectorAll('.media-carousel').forEach(carousel => {
  const slides = [...carousel.querySelectorAll('.carousel-slide')], dots = [...carousel.querySelectorAll('.carousel-dots button')];
  let current = 0, inView = false, manual = false, timer = null, started = 0, remaining = 4000;
  const videoAt = index => slides[index].querySelector('video');
  const running = () => inView && !document.hidden && !dialog.open;
  function stop() {
    if (timer !== null) { clearTimeout(timer); remaining = Math.max(0, remaining - (performance.now() - started)); timer = null; }
    videoAt(current)?.pause();
  }
  function sync() {
    if (!running()) { stop(); return; }
    const video = videoAt(current);
    if (video && (!reduceMotion.matches || manual)) {
      if (!video.hasAttribute('src')) video.src = video.dataset.src;
      video.play().catch(() => {});
    }
    if (!reduceMotion.matches && timer === null) {
      started = performance.now();
      timer = setTimeout(() => show((current + 1) % slides.length), remaining);
    }
  }
  function show(index, clicked = false) {
    stop();
    const previous = videoAt(current);
    if (previous?.hasAttribute('src')) { previous.removeAttribute('src'); previous.load(); }
    current = index; manual = clicked; remaining = videoAt(current) ? 12000 : 4000;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === current);
      slide.setAttribute('aria-hidden', String(i !== current));
      dots[i].setAttribute('aria-pressed', String(i === current));
    });
    sync();
  }
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i, true)));
  slides.forEach((slide, i) => videoAt(i)?.addEventListener('ended', () => {
    if (i === current && running() && !reduceMotion.matches) show((current + 1) % slides.length);
  }));
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.2; sync();
  }, {threshold: [0, 0.2]});
  observer.observe(carousel.closest('article'));
  reduceMotion.addEventListener('change', () => show(0));
  carouselSync.push(sync);
  remaining = videoAt(0) ? 12000 : 4000;
});
// End carousel.
reduceMotion.addEventListener('change', () => { manualPlay.clear(); syncPlayback(); });
document.addEventListener('visibilitychange', syncPlayback);
document.querySelectorAll('[data-full-video]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  document.querySelector('#video-title').textContent = link.dataset.title;
  fullVideo.setAttribute('aria-label', link.dataset.title); fullVideo.src = link.getAttribute('href');
  dialog.showModal(); syncPlayback(); fullVideo.play().catch(() => {});
}));
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  fullVideo.pause(); fullVideo.removeAttribute('src'); fullVideo.load(); syncPlayback();
});
const nav = document.querySelector('.section-nav'), navLinks = [...nav.querySelectorAll('a')];
const sections = navLinks.map(link => document.querySelector(link.hash));
function markSection(id) {
  navLinks.forEach(link => {
    const active = link.hash === '#' + id;
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
    if (active && matchMedia('(max-width: 899px)').matches) nav.scrollTo({left: link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2, behavior: 'instant'});
  });
}
function syncSection() {
  const atTop = window.scrollY <= 2, atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  const current = atTop ? sections[0] : atBottom ? sections[sections.length - 1] : sections.filter(section => section.getBoundingClientRect().top <= 120).pop() || sections[0];
  markSection(current.id);
}
let scrollScheduled = false;
window.addEventListener('scroll', () => {
  if (scrollScheduled) return;
  scrollScheduled = true; requestAnimationFrame(() => { syncSection(); scrollScheduled = false; });
}, {passive: true});
window.addEventListener('resize', syncSection);
syncSection();
navLinks.forEach(link => link.addEventListener('click', () => markSection(link.hash.slice(1))));
// Visitors: local sample preview, daily country data and a live public total.
(() => {
  const section = document.querySelector('#visitors'), data = window.VISITORS;
  if (!section) return;
  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  const code = section.dataset.goatcounterCode;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) return;
  const base = `https://${code}.goatcounter.com`, script = document.createElement('script');
  script.dataset.goatcounter = `${base}/count`; script.async = true;
  script.src = 'https://gc.zgo.at/count.js'; document.head.append(script);
  // Tracking starts even while public sample data keeps the entire section hidden.
  if (!data || (data.sample !== false && !local)) return;
  const number = new Intl.NumberFormat('en-US'), ns = 'http://www.w3.org/2000/svg';
  const make = (tag, cls, text) => {
    const node = document.createElement(tag); node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const layout = make('div', 'visitors-layout'), summary = make('div', 'visitors-summary');
  const total = make('p', 'visitors-total'), label = make('p', 'visitors-label', 'total visits');
  const showTotal = value => {
    const valid = (typeof value === 'number' || (typeof value === 'string' && /^\d[\d,]*$/.test(value)));
    const count = valid ? Number(String(value).replaceAll(',', '')) : NaN;
    total.hidden = !Number.isFinite(count) || count < 0; label.hidden = total.hidden;
    total.textContent = total.hidden ? '' : number.format(count);
  };
  showTotal(data.total); summary.append(total, label);
  if (data.since) summary.append(make('p', 'visitors-meta', `since ${data.since.replace('-', '.')}`));
  if (data.updated) summary.append(make('p', 'visitors-meta', `updated ${data.updated}`));
  if (data.sample) summary.append(make('p', 'visitors-meta visitors-sample', 'Sample data · local preview'));
  const detail = make('div', 'visitors-detail'), map = make('div', 'visitor-map');
  const svg = document.querySelector('#visitor-map-template').content.firstElementChild.cloneNode(true), tooltip = make('span', 'visitor-tooltip');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Visitor locations on a world map'); tooltip.hidden = true;
  const items = (data.items || []).filter(item => Number.isFinite(item.count) && item.count >= 0).sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...items.map(item => item.count)), sum = items.reduce((n, item) => n + item.count, 0);
  items.forEach(item => {
    const point = window.COUNTRY_CENTROIDS?.[item.code];
    if (!point || !item.count) return;
    const dot = document.createElementNS(ns, 'circle'), title = document.createElementNS(ns, 'title');
    const text = `${item.name} · ${number.format(item.count)}`;
    dot.setAttribute('cx', point[0]); dot.setAttribute('cy', point[1]);
    dot.setAttribute('r', Math.max(3, 14 * Math.sqrt(item.count / max)));
    dot.setAttribute('tabindex', '0'); dot.setAttribute('role', 'img'); dot.setAttribute('aria-label', text);
    title.textContent = text; dot.append(title); svg.append(dot);
    ['mouseenter', 'focus'].forEach(event => dot.addEventListener(event, () => { tooltip.textContent = text; tooltip.hidden = false; }));
    ['mouseleave', 'blur'].forEach(event => dot.addEventListener(event, () => { tooltip.hidden = true; }));
  });
  map.append(svg, tooltip);
  const list = make('ol', 'visitor-ranking'), rows = items.slice(0, 8);
  list.setAttribute('aria-label', 'Visits by country');
  rows.forEach(item => {
    const row = make('li', 'visitor-row'), track = make('span', 'visitor-track'), bar = make('span', 'visitor-bar');
    track.setAttribute('aria-hidden', 'true'); bar.style.width = `${sum ? item.count / sum * 100 : 0}%`;
    track.append(bar); row.append(make('span', 'visitor-country', item.name), track, make('span', 'visitor-count', number.format(item.count)));
    list.append(row);
  });
  detail.append(summary, list); layout.append(detail, map); section.append(layout); section.hidden = false;
  fetch(`${base}/counter/TOTAL.json`, {credentials: 'omit', signal: AbortSignal.timeout(5000)})
    .then(response => { if (!response.ok) throw new Error('Counter unavailable'); return response.json(); })
    .then(live => { if (/^\d[\d,]*$/.test(String(live.count))) showTotal(live.count); }).catch(() => {});
})();
// End visitors.
