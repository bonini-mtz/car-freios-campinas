/* Car Freios: interações progressivas; nenhum conteúdo depende de animação. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  document.documentElement.classList.add('motion-enabled');
  let motionObserver;
  const seen = new WeakSet();
  const mobile = matchMedia('(max-width: 700px)');
  const running = new Set();
  const ease = 'cubic-bezier(.2,.65,.25,1)';
  function animate(element, frames, options) {
    if (typeof element.animate !== 'function') return Promise.resolve();
    try {
      const animation = element.animate(frames, { easing:ease, fill:'both', ...options });
      running.add(animation);
      return animation.finished.catch(() => {}).finally(() => {
        running.delete(animation);
        animation.cancel();
      });
    } catch { return Promise.resolve(); }
  }
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');
  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (open) animate(nav, [{ opacity:0, transform:'translateY(-6px)' }, { opacity:1, transform:'none' }], { duration:200 });
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a') && mobile.matches) closeMenu();
    const link = event.target.closest('a[href^="#"]');
    const destination = link && document.querySelector(link.hash);
    if (destination) {
      destination.querySelectorAll('[data-motion-state]').forEach(element => {
        seen.delete(element);
        delete element.dataset.motionState;
      });
      setupEntrances();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu(); toggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.header')) closeMenu();
  });
  mobile.addEventListener('change', closeMenu);

  // A seção atual é calculada pela posição real, sem controlar a rolagem.
  const navLinks = [...nav.querySelectorAll('a')];
  const sections = navLinks.map(link => document.querySelector(link.hash));
  const header = document.querySelector('.header');
  const progress = document.querySelector('.reading-progress span');
  let queued = false;
  function updateNavigation() {
    const total = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${total > 0 ? Math.min(1, scrollY / total) : 0})`;
    const edge = header.getBoundingClientRect().height + Math.min(innerHeight * .25, 180);
    let active = -1;
    sections.forEach((section, index) => {
      if (section.getBoundingClientRect().top <= edge) active = index;
    });
    navLinks.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    queued = false;
  }
  function queueNavigation() {
    if (!queued) { queued = true; requestAnimationFrame(updateNavigation); }
  }
  addEventListener('scroll', queueNavigation, { passive:true });
  addEventListener('resize', queueNavigation);
  addEventListener('load', queueNavigation);
  updateNavigation();

  const copy = document.querySelector('.copy-address');
  const copyStatus = document.querySelector('.copy-status');
  if (navigator.clipboard?.writeText) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('Rua João Carlos Amaral, 277, Jardim Aparecida, Campinas – SP, CEP 13068-617');
        copyStatus.textContent = 'Endereço copiado.';
      } catch { copyStatus.textContent = 'Não foi possível copiar. Use o endereço acima.'; }
    });
  }

  const dialog = document.querySelector('.lightbox');
  const image = document.getElementById('expanded-photo');
  const caption = document.getElementById('photo-caption');
  const count = document.getElementById('photo-count');
  const status = dialog.querySelector('.gallery-status');
  const photos = [
    { src:'assets/oficina-fachada.png', caption:'Fachada · Rua João Carlos Amaral, 277 · Registro do Google Maps' },
    { src:'assets/oficina-interior.png', caption:'Interior da oficina · Registro do Google Maps' },
    { src:'assets/oficina-caminhoes.png', caption:'Caminhões no galpão · Registro do Google Maps' }
  ];
  let photoIndex = 0, opener, scrollPosition = 0, revision = 0, closing = false;
  async function renderPhoto(direction = 0) {
    const ticket = ++revision;
    const photo = photos[photoIndex];
    status.textContent = 'Carregando imagem…';
    dialog.setAttribute('aria-busy', 'true');
    const prepared = new Image();
    prepared.src = photo.src;
    try { await prepared.decode(); }
    catch {
      if (ticket === revision) {
        status.textContent = 'Não foi possível carregar a imagem. Tente outra foto.';
        dialog.removeAttribute('aria-busy');
      }
      return;
    }
    if (ticket !== revision || !dialog.open) return;
    if (direction) await animate(image, [{ opacity:1 }, { opacity:.15 }], { duration:110 });
    if (ticket !== revision || !dialog.open) return;
    image.src = photo.src;
    image.alt = photo.caption;
    caption.textContent = photo.caption;
    count.textContent = `${photoIndex + 1} de ${photos.length}`;
    status.textContent = '';
    dialog.removeAttribute('aria-busy');
    await animate(image, [{ opacity:0, transform:`translateX(${direction * 10}px)` }, { opacity:1, transform:'none' }], { duration:260 });
  }
  function movePhoto(direction) {
    if (closing) return;
    photoIndex = (photoIndex + direction + photos.length) % photos.length;
    renderPhoto(direction);
  }
  async function closeGallery() {
    if (closing || !dialog.open) return;
    closing = true;
    revision++;
    await animate(dialog, [{ opacity:1, transform:'none' }, { opacity:0, transform:'translateY(8px) scale(.99)' }], { duration:180 });
    dialog.close();
    closing = false;
  }
  if (typeof dialog.showModal === 'function') {
    document.querySelectorAll('[data-photo]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      opener = link;
      photoIndex = Number(link.dataset.photo);
      scrollPosition = scrollY;
      closing = false;
      image.removeAttribute('src');
      caption.textContent = photos[photoIndex].caption;
      count.textContent = `${photoIndex + 1} de ${photos.length}`;
      document.body.classList.add('gallery-open');
      dialog.showModal();
      renderPhoto();
      animate(dialog, [{ opacity:0, transform:'translateY(12px) scale(.985)' }, { opacity:1, transform:'none' }], { duration:280 });
    }));
    dialog.querySelector('.gallery-close').addEventListener('click', closeGallery);
    dialog.querySelector('.gallery-prev').addEventListener('click', () => movePhoto(-1));
    dialog.querySelector('.gallery-next').addEventListener('click', () => movePhoto(1));
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeGallery(); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button:not([disabled])')];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus({ preventScroll:true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus({ preventScroll:true });
        }
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); movePhoto(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
    dialog.addEventListener('close', () => {
      revision++;
      document.body.classList.remove('gallery-open');
      scrollTo({ top:scrollPosition, behavior:'instant' });
      opener?.focus({ preventScroll:true });
    });
    let touchStart;
    const imageArea = dialog.querySelector('.lightbox-image');
    imageArea.addEventListener('touchstart', event => {
      touchStart = event.touches.length === 1 ? { x:event.touches[0].clientX, y:event.touches[0].clientY } : null;
    }, { passive:true });
    imageArea.addEventListener('touchend', event => {
      if (!touchStart || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) movePhoto(dx < 0 ? 1 : -1);
      touchStart = null;
    }, { passive:true });
    imageArea.addEventListener('touchcancel', () => { touchStart = null; }, { passive:true });
  }

  // O conteúdo permanece visível por padrão. A entrada só existe enquanto anima.
  function setupEntrances() {
    motionObserver?.disconnect();
    if (!('IntersectionObserver' in window)) return;
    const targets = document.querySelectorAll('.hero-copy > *, .hero-space, .section-head > *, .service, .service-note, .workshop-intro > *, .workshop-main, .workshop-side > *, .workshop-foot, .reviews-layout > *, .location-grid > *, .contact-copy > *, .contact-buttons');
    const services = [...document.querySelectorAll('.service')];
    const hero = [...document.querySelectorAll('.hero-copy > *')];
    function delayFor(element) {
      const serviceIndex = services.indexOf(element);
      if (serviceIndex >= 0) {
        const columns = getComputedStyle(element.parentElement).gridTemplateColumns.split(' ').length;
        return (serviceIndex % columns) * 70;
      }
      const heroIndex = hero.indexOf(element);
      if (heroIndex >= 0) return heroIndex * 65;
      if (element.matches('.workshop-side > figure')) return 70;
      if (element.matches('.workshop-detail')) return 140;
      return 0;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        const element = entry.target;
        seen.add(element);
        observer.unobserve(element);
        element.dataset.motionState = 'entering';
        animate(element, [{ opacity:0, transform:'translateY(22px)' }, { opacity:1, transform:'none' }], { duration:600, delay:delayFor(element) }).then(() => {
          element.dataset.motionState = 'complete';
        });
      });
    }, { threshold:0, rootMargin:'0px 0px -64px 0px' });
    motionObserver = observer;
    targets.forEach(element => { if (!seen.has(element)) observer.observe(element); });
  }
  setupEntrances();
  document.addEventListener('focusin', event => {
    // Foco sempre torna a ação imediatamente legível e disponível.
    running.forEach(animation => {
      const target = animation.effect?.target;
      if (target instanceof Element && (target === event.target || target.contains(event.target))) animation.cancel();
    });
  });
})();

