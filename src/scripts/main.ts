import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;

// Scroll suave
let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

const navOffset = () => ($('[data-subnav]') ? 150 : 90);
function scrollToTarget(target: HTMLElement) {
  if (lenis) lenis.scrollTo(target, { offset: -navOffset() + 40, duration: 1.2 });
  else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="#"]');
  if (!a) return;
  const link = new URL(a.href, location.href);
  if (link.pathname !== location.pathname || !link.hash) return;
  const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (!target) return;
  e.preventDefault();
  closeMenu();
  scrollToTarget(target);
  history.replaceState(null, '', link.hash);
});
if (location.hash) {
  const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (t) window.addEventListener('load', () => setTimeout(() => scrollToTarget(t), 150));
}

// Menú superior: se oculta al bajar y se muestra al subir
const nav = $('[data-nav]');
let lastY = window.scrollY;
function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  root.style.setProperty('--progress', String(max > 0 ? y / max : 0));
  if (!nav) return;
  nav.classList.toggle('is-scrolled', y > 30);
  const hide = y > 400 && y > lastY + 2 && !root.classList.contains('menu-open');
  const show = y < lastY - 2 || y < 400;
  if (hide) {
    nav.classList.add('is-hidden');
    root.classList.add('nav-hidden');
  } else if (show) {
    nav.classList.remove('is-hidden');
    root.classList.remove('nav-hidden');
  }
  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Menú móvil
const toggle = $('[data-menu-toggle]');
const menu = $('[data-menu]');
function openMenu() {
  root.classList.add('menu-open');
  toggle?.setAttribute('aria-expanded', 'true');
  toggle?.setAttribute('aria-label', 'Cerrar menú');
  menu?.setAttribute('aria-hidden', 'false');
  $$('a', menu!).forEach((a) => a.removeAttribute('tabindex'));
  lenis?.stop();
}
function closeMenu() {
  if (!root.classList.contains('menu-open')) return;
  root.classList.remove('menu-open');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.setAttribute('aria-label', 'Abrir menú');
  menu?.setAttribute('aria-hidden', 'true');
  $$('a', menu!).forEach((a) => a.setAttribute('tabindex', '-1'));
  lenis?.start();
}
toggle?.addEventListener('click', () => (root.classList.contains('menu-open') ? closeMenu() : openMenu()));
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

// Texto dividido en palabras
function splitWords(el: HTMLElement, wrapClass: string) {
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent!.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(document.createTextNode(' '));
            continue;
          }
          const w = document.createElement('span');
          w.className = wrapClass;
          if (wrapClass === 'word') {
            const inner = document.createElement('span');
            inner.textContent = part;
            w.append(inner);
          } else {
            w.textContent = part;
          }
          frag.append(w);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName !== 'BR') {
        walk(child);
      }
    }
  };
  walk(el);
}

$$('[data-split]').forEach((el) => {
  el.setAttribute('aria-label', el.textContent!.replace(/\s+/g, ' ').trim());
  splitWords(el, 'word');
  $$('.word', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
  if (reduced) return;
  gsap.fromTo(
    $$('.word > span', el),
    // y: 0 anula el translateY del CSS, que GSAP leería como píxeles fijos
    { yPercent: 130, y: 0 },
    {
      yPercent: 0,
      y: 0,
      duration: 1.05,
      ease: 'expo.out',
      stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    },
  );
});

// Apariciones al hacer scroll
if (!reduced) {
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%',
    once: true,
    onEnter: (els) =>
      gsap.to(els, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.08,
        overwrite: true,
        // .is-in fija el estado final y deja libres los transform de los :hover
        onComplete: () => {
          els.forEach((el) => el.classList.add('is-in'));
          gsap.set(els, { clearProps: 'opacity,transform' });
        },
      }),
  });
}

// Parallax
if (!reduced) {
  $$('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax || '0.2');
    gsap.to(el, {
      y: () => speed * 300,
      ease: 'none',
      // clamp: si la sección ya se ve al cargar, el parallax empieza en 0
      scrollTrigger: { trigger: el.closest('section') ?? el, start: 'clamp(top bottom)', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
  });
}

// Contadores
$$('[data-count]').forEach((el) => {
  const end = Number(el.dataset.count);
  if (!Number.isFinite(end) || reduced) return;
  const isYear = end > 1900 && end < 2100;
  const start = isYear ? end - 40 : 0;
  const obj = { v: start };
  el.textContent = String(start);
  gsap.to(obj, {
    v: end,
    duration: isYear ? 1.6 : 1.8,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    onUpdate: () => (el.textContent = String(Math.round(obj.v))),
  });
});

// Cintas de texto: aceleran con la velocidad del scroll
$$('[data-marquee]').forEach((track) => {
  const dir = Number(track.dataset.marquee) || 1;
  let x = 0;
  let boost = 0;
  let prevY = window.scrollY;
  const half = () => track.scrollWidth / 2;
  gsap.ticker.add((_, dt) => {
    const base = reduced ? 0 : 0.045 * dt;
    // funciona igual con rueda (Lenis) que con el dedo
    boost = reduced ? 0 : Math.max(boost * 0.92, Math.min(Math.abs(window.scrollY - prevY) * 0.6, 14));
    prevY = window.scrollY;
    x -= (base + boost * 0.35) * dir;
    const w = half();
    if (w > 0) {
      if (x <= -w) x += w;
      if (x > 0) x -= w;
    }
    track.style.transform = `translate3d(${x}px,0,0)`;
  });
});

// Tarjetas con inclinación 3D
if (finePointer && !reduced) {
  $$('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--rx', `${(px - 0.5) * 16}deg`);
      card.style.setProperty('--ry', `${(0.5 - py) * 16}deg`);
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

// Próximo partido + cuenta atrás
$$('[data-next-group]').forEach((group) => {
  const cards = $$('[data-next]', group);
  const now = Date.now();
  // El partido en juego (hasta 2 h después del inicio) o el siguiente
  const pick = cards.find((c) => new Date(c.dataset.iso!).getTime() > now - 2 * 3600e3) ?? null;
  if (!pick) {
    group.closest('[data-reveal]')?.setAttribute('hidden', '');
    return;
  }
  cards.forEach((c) => (c.hidden = c !== pick));
  const cd = $('[data-countdown]', pick);
  if (!cd) return;
  const target = new Date(cd.dataset.countdown!).getTime();
  const pad = (n: number) => String(n).padStart(2, '0');
  const tick = () => {
    const diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 864e5);
    const h = Math.floor((diff % 864e5) / 36e5);
    const m = Math.floor((diff % 36e5) / 6e4);
    const s = Math.floor((diff % 6e4) / 1e3);
    $('[data-d]', cd)!.textContent = pad(d);
    $('[data-h]', cd)!.textContent = pad(h);
    $('[data-m]', cd)!.textContent = pad(m);
    $('[data-s]', cd)!.textContent = pad(s);
    if (diff === 0) {
      cd.innerHTML = '<div style="grid-column:1/-1"><b>¡A jugar!</b><small>partido en curso</small></div>';
      return;
    }
    setTimeout(tick, 1000);
  };
  tick();
});

// Filtros (calendario / plantilla)
$$('[data-filter-group]').forEach((group) => {
  const target = $(`[data-filter-target="${group.dataset.filterGroup}"]`);
  if (!target) return;
  const buttons = $$('button[data-filter]', group);
  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter!;
      buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const items = [...target.children] as HTMLElement[];
      items.forEach((it) => {
        const show = f === 'all' || it.dataset.kind === f;
        it.hidden = !show;
      });
      const visible = items.filter((i) => !i.hidden);
      if (!reduced) {
        gsap.fromTo(visible, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.03, clearProps: 'transform' });
      }
      visible.forEach((v) =>
        $$('[data-reveal]', v)
          .concat(v.matches('[data-reveal]') ? [v] : [])
          .forEach((r) => {
            r.classList.add('is-in');
            gsap.set(r, { clearProps: 'opacity,transform' });
          }),
      );
      ScrollTrigger.refresh();
    }),
  );
});

// Sub-navegación activa
const subLinks = $$('[data-subnav-link]');
subLinks.forEach((link) => {
  const sec = document.getElementById(link.dataset.subnavLink!);
  if (!sec) return;
  ScrollTrigger.create({
    trigger: sec,
    start: 'top 50%',
    end: 'bottom 50%',
    onToggle: (self) => {
      if (!self.isActive) return;
      subLinks.forEach((l) => l.classList.toggle('is-active', l === link));
      link.scrollIntoView({ block: 'nearest', inline: 'center' });
    },
  });
});

// Portada
const hero = $('[data-hero]');
if (hero && !reduced) {
  const words = $$('[data-hero-word]', hero);
  const crests = $('[data-hero-crests]', hero);

  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    // la entrada anima yPercent y el scroll xPercent para no pisarse
    .from(words, { yPercent: (i) => (i === 0 ? -60 : 60), opacity: 0, duration: 1.6, stagger: 0.1 })
    .from($$('.hero__crest', hero), { scale: 0.5, rotate: -20, opacity: 0, duration: 1.6, stagger: 0.12 }, 0.15)
    .from($$('.hero-lemon', hero), { scale: 0, rotate: -180, duration: 1.4, stagger: 0.1 }, 0.4)
    .from($$('.hero__bottom > *', hero), { y: 30, opacity: 0, duration: 1, stagger: 0.08 }, 0.6);

  const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 };
  words.forEach((w) => gsap.to(w, { xPercent: Number(w.dataset.heroWord) * 22, ease: 'none', scrollTrigger: st }));
  gsap.to(crests, { scale: 1.25, rotate: 8, yPercent: 18, opacity: 0.2, ease: 'none', scrollTrigger: st });
}

// Manifiesto: las palabras se iluminan al hacer scroll
$$('[data-scrub-words]').forEach((el) => {
  splitWords(el, 'sw');
  const words = $$('.sw', el);
  if (reduced) {
    words.forEach((w) => (w.style.opacity = '1'));
    return;
  }
  gsap.to(words, {
    opacity: 1,
    ease: 'none',
    stagger: 0.1,
    scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
});

// Historia en scroll horizontal (solo escritorio)
const hs = $('[data-hscroll]');
if (hs && !reduced) {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px)', () => {
    root.classList.add('has-hscroll');
    const track = $('[data-hscroll-track]', hs)!;
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: hs,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });
    $$('.hcard', track).forEach((card) => {
      gsap.from(card, {
        rotate: 4,
        y: 60,
        opacity: 0.3,
        ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 100%', end: 'left 60%', scrub: true },
      });
    });
    return () => root.classList.remove('has-hscroll');
  });
}

// Línea de tiempo que se dibuja
const tl = $('[data-timeline]');
if (tl) {
  const fill = $('[data-timeline-fill]', tl)!;
  if (reduced) fill.style.setProperty('--tl', '1');
  else
    gsap.fromTo(
      fill,
      { '--tl': 0 },
      { '--tl': 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: true } },
    );
}

// Las fuentes e imágenes cambian las alturas al cargar
window.addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
