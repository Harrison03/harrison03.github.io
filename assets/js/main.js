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
const sections = [...document.querySelectorAll('main > section')];
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
