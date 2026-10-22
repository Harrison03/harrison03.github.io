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
// Carousel: native touch scrolling; only mouse dragging and deliberate paging are animated.
document.querySelectorAll('.media-carousel').forEach(carousel => {
  const track = carousel.querySelector('.carousel-track'), slides = [...track.children];
  const bars = [...carousel.querySelectorAll('.carousel-progress i')], status = carousel.querySelector('.carousel-status');
  let current = 0, target = 0, inView = false, manual = false, hovered = false, settled = true;
  let width = track.getBoundingClientRect().width;
  let elapsed = 0, clock = 0, frame = 0, tween = null, drag = null, debounce, suppressUntil = 0;
  const videoAt = i => slides[i].querySelector('video'), limit = () => videoAt(current) ? 12000 : 4000;
  const running = () => inView && !document.hidden && !dialog.open && !hovered;
  const automatic = () => !manual && !reduceMotion.matches;
  // Invert the x component of cubic-bezier(.22,1,.36,1), then evaluate y.
  const ease = x => {
    if (x === 0 || x === 1) return x;
    let low = 0, high = 1, t = x;
    for (let i = 0; i < 12; i++) { t = (low + high) / 2; const v = 3 * (1 - t) ** 2 * t * .22 + 3 * (1 - t) * t * t * .36 + t ** 3; if (v < x) low = t; else high = t; }
    return 1 - (1 - t) ** 3;
  };
  function progress() {
    const video = videoAt(current), fraction = Math.max(elapsed / limit(), video?.duration ? video.currentTime / video.duration : 0);
    bars.forEach((bar, i) => { bar.style.transform = `scaleX(${i === current ? automatic() ? Math.min(1, fraction) : 1 : 0})`; });
  }
  function account() { if (clock) elapsed += performance.now() - clock; clock = 0; }
  function sync() {
    cancelAnimationFrame(frame); account();
    if (settled && running() && automatic() && videoAt(current)?.ended) { go(current + 1); return; }
    const video = videoAt(current), playing = settled && running() && (!reduceMotion.matches || manual);
    if (video) {
      video.loop = manual;
      if (playing) { if (!video.hasAttribute('src')) video.src = video.dataset.src; if (video.paused) video.play().catch(() => {}); }
      else video.pause();
    }
    progress();
    if (settled && running() && automatic()) clock = performance.now();
    if (clock || tween) frame = requestAnimationFrame(tick);
  }
  function moving() {
    settled = false; sync();
    slides.forEach(slide => slide.classList.remove('is-settled'));
  }
  function settle() {
    if (tween || drag) return;
    clearTimeout(debounce);
    const index = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / width)));
    if (index !== current) elapsed = 0;
    current = target = index; settled = true;
    slides.forEach((slide, i) => {
      if (i !== current && slide.contains(document.activeElement)) track.focus({preventScroll: true});
      slide.setAttribute('aria-hidden', String(i !== current)); slide.inert = i !== current;
      slide.classList.toggle('is-settled', i === current);
      // Unload only once another slide has settled, so a cancelled swipe resumes in place.
      const video = slide.querySelector('video');
      if (i !== current && video?.hasAttribute('src')) { video.pause(); video.removeAttribute('src'); video.load(); }
    });
    status.textContent = `Slide ${current + 1} of ${slides.length}: ${slides[current].querySelector('.slide-caption').textContent}`;
    sync();
  }
  function go(index, user = false, instant = false) {
    if (user) manual = true;
    clearTimeout(debounce); moving(); target = (index + slides.length) % slides.length;
    track.style.scrollSnapType = 'none';
    tween = {from: track.scrollLeft, to: target * width, start: performance.now(), duration: !user && current === slides.length - 1 && target === 0 ? 650 : 450};
    if (reduceMotion.matches || instant) tween.duration = 0;
    sync(); if (!tween.duration) tick(performance.now());
  }
  function tick(now) {
    account();
    if (tween) {
      const p = tween.duration ? Math.min(1, (now - tween.start) / tween.duration) : 1;
      track.scrollLeft = p === 1 ? tween.to : tween.from + (tween.to - tween.from) * ease(p);
      if (p === 1) { tween = null; track.style.scrollSnapType = ''; settle(); return; }
    } else if (elapsed >= limit() || videoAt(current)?.ended) { go(current + 1); return; }
    progress(); if (settled && running() && automatic()) clock = now;
    frame = requestAnimationFrame(tick);
  }
  function interrupt() {
    if (!tween) return;
    tween = null; track.style.scrollSnapType = ''; sync();
    clearTimeout(debounce); debounce = setTimeout(settle, 120);
  }
  track.addEventListener('scroll', () => {
    if (tween || drag || (settled && Math.abs(track.scrollLeft - current * width) < 1)) return;
    clearTimeout(debounce); manual = true; if (settled) moving();
    if (!('onscrollend' in track)) debounce = setTimeout(settle, 120);
  }, {passive: true});
  track.addEventListener('scrollend', settle);
  track.addEventListener('wheel', event => { if (event.deltaX || event.shiftKey) interrupt(); }, {passive: true});
  track.addEventListener('pointerdown', event => {
    suppressUntil = 0; interrupt();
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = {id: event.pointerId, x: event.clientX, last: event.clientX, time: performance.now(), velocity: 0, left: track.scrollLeft, index: Math.round(track.scrollLeft / width), moved: false};
  });
  track.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const now = performance.now(), dx = event.clientX - drag.x;
    drag.velocity = (event.clientX - drag.last) / Math.max(1, now - drag.time); drag.last = event.clientX; drag.time = now;
    if (!drag.moved && Math.abs(dx) <= 6) return;
    if (!drag.moved) { drag.moved = true; manual = true; moving(); track.setPointerCapture(event.pointerId); track.style.scrollSnapType = 'none'; track.classList.add('is-dragging'); }
    event.preventDefault(); track.scrollLeft = drag.left - dx;
  });
  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const d = drag, dx = event.clientX - d.x, velocity = performance.now() - d.time < 80 ? d.velocity : 0;
    drag = null; track.classList.remove('is-dragging');
    if (track.hasPointerCapture(d.id)) track.releasePointerCapture(d.id);
    if (!d.moved) { settle(); return; }
    suppressUntil = performance.now() + 500;
    const direction = Math.abs(velocity) > .4 ? -Math.sign(velocity) : Math.abs(dx) > width * .15 ? -Math.sign(dx) : 0;
    go(d.index + (event.type === 'pointerup' ? direction : 0), true);
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(event => track.addEventListener(event, release));
  track.addEventListener('pointerleave', event => { if (drag && !drag.moved) release(event); });
  track.addEventListener('dragstart', event => event.preventDefault());
  track.addEventListener('click', event => { if (performance.now() < suppressUntil) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  track.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); go(target + (event.key === 'ArrowRight' ? 1 : -1), true); } });
  ['prev', 'next'].forEach((name, i) => {
    const button = carousel.querySelector('.carousel-' + name); button.hidden = false;
    button.addEventListener('click', () => go(target + (i ? 1 : -1), true));
  });
  carousel.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; sync(); } });
  carousel.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; sync(); } });
  const observer = new IntersectionObserver(entries => {
    const next = entries[0].isIntersecting && entries[0].intersectionRatio >= .2;
    if (next && !inView) manual = false;
    inView = next; sync();
  }, {threshold: [0, .2]});
  observer.observe(carousel.closest('article'));
  new ResizeObserver(entries => { width = entries[0].contentRect.width; go(current, false, true); }).observe(track);
  reduceMotion.addEventListener('change', () => { manual = false; go(current, false, true); });
  carousel.classList.add('is-enhanced'); carouselSync.push(sync); settle();
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
const sections = navLinks.map(link => document.querySelector(link.hash)), indicator = nav.querySelector('.nav-indicator');
let lockedSection = null, scrollScheduled = false, scrollStop;
function positionIndicator() {
  const link = nav.querySelector('[aria-current]');
  if (link) { indicator.style.width = link.offsetWidth + 'px'; indicator.style.transform = `translateX(${link.offsetLeft}px)`; }
}
function markSection(id) {
  navLinks.forEach(link => {
    const active = link.hash === '#' + id, changed = active && !link.hasAttribute('aria-current');
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
    if (changed && matchMedia('(max-width: 899px)').matches) nav.scrollLeft = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
  });
  positionIndicator();
}
function syncSection() {
  if (lockedSection) return;
  const atTop = window.scrollY <= 2, atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  const current = atTop ? sections[0] : atBottom ? sections[sections.length - 1] : sections.filter(section => section.getBoundingClientRect().top <= 120).pop() || sections[0];
  markSection(current.id);
}
function unlockSection() { clearTimeout(scrollStop); lockedSection = null; syncSection(); }
window.addEventListener('scroll', () => {
  clearTimeout(scrollStop); scrollStop = setTimeout(unlockSection, 150);
  if (scrollScheduled) return;
  scrollScheduled = true; requestAnimationFrame(() => { syncSection(); scrollScheduled = false; });
}, {passive: true});
window.addEventListener('scrollend', unlockSection);
window.addEventListener('resize', syncSection);
navLinks.forEach(link => link.addEventListener('click', () => {
  lockedSection = link.hash.slice(1); markSection(lockedSection);
  clearTimeout(scrollStop); scrollStop = setTimeout(unlockSection, 150);
}));
new ResizeObserver(positionIndicator).observe(nav);
document.fonts.ready.then(positionIndicator);
syncSection(); requestAnimationFrame(() => nav.classList.add('is-ready'));
// Observe the large avatar once per crossing; never measure it in the scroll handler.
const header = document.querySelector('.site-header'), miniAvatar = header.querySelector('.mini-avatar');
const mobile = matchMedia('(max-width: 899px)');
let avatarObserver;
function observeAvatar() {
  avatarObserver?.disconnect(); header.classList.remove('is-condensed'); miniAvatar.tabIndex = -1;
  if (!mobile.matches) return;
  avatarObserver = new IntersectionObserver(entries => {
    const condensed = !entries[0].isIntersecting && entries[0].boundingClientRect.bottom <= 48;
    header.classList.toggle('is-condensed', condensed); miniAvatar.tabIndex = condensed ? 0 : -1;
  }, {rootMargin: '-48px 0px 0px', threshold: 0});
  avatarObserver.observe(document.querySelector('.avatar'));
}
mobile.addEventListener('change', observeAvatar); observeAvatar();
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
// Run after synchronous page content (including the visitor layout) has been created.
// Hide only below-fold content; hash destinations and the initial viewport stay visible.
(() => {
  const selector = 'main h2,.publication,.project,.timeline li,.awards,.visitors-layout';
  const reveal = element => { element.classList.replace('reveal-pending', 'reveal-visible'); observer.unobserve(element); };
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); }));
  document.querySelectorAll(selector).forEach(element => {
    if (reduceMotion.matches || !element.getClientRects().length || element.getBoundingClientRect().top < innerHeight || element.closest(':target')) return;
    element.classList.add('reveal-pending'); observer.observe(element);
  });
  const showViewport = () => document.querySelectorAll('.reveal-pending').forEach(element => {
    const rect = element.getBoundingClientRect();
    if (rect.top < innerHeight && rect.bottom > 0) { element.classList.remove('reveal-pending'); observer.unobserve(element); }
  });
  window.addEventListener('hashchange', showViewport);
  window.addEventListener('pageshow', showViewport);
  document.addEventListener('focusin', event => {
    const element = event.target.closest('.reveal-pending');
    if (element) { element.classList.remove('reveal-pending'); observer.unobserve(element); }
  });
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) { document.querySelectorAll('.reveal-pending').forEach(element => element.classList.remove('reveal-pending')); observer.disconnect(); }
  });
})();
