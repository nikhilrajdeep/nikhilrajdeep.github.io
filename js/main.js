/* Nikhil Raj Deep — portfolio: navigation, theme, and the interactive globe. */
(function () {
  'use strict';

  const CFG = window.PORTFOLIO_LAYERS;
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  const reducedMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────────── Theme ───────────── */
  const root = document.documentElement;
  const savedTheme = store.get('nrd-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') root.setAttribute('data-theme', savedTheme);
  $('themeBtn').addEventListener('click', () => {
    const attr = root.getAttribute('data-theme');
    const isDark = attr ? attr === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('nrd-theme', next);
  });
  $('year').textContent = new Date().getFullYear();

  /* ───────────── Navigation ───────────── */
  const nav = $('nav');
  const hero = $('home');
  const menu = $('menu');
  const menuBtn = $('menuBtn');
  const navLinks = Array.from(document.querySelectorAll('#navLinks a, #menu a'));

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth >= 1060) setMenu(false); });

  let heroVisible = true;
  const solidCheck = () => nav.classList.toggle('nav--solid', window.scrollY > hero.offsetHeight - 80);
  window.addEventListener('scroll', solidCheck, { passive: true }); solidCheck();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      heroVisible = es[0].isIntersecting;
    }, { rootMargin: '-56px 0px 0px 0px', threshold: 0 }).observe(hero);

    const sections = ['about', 'experience', 'research', 'publication', 'news', 'teaching', 'blogs', 'youtube', 'contact', 'cv']
      .map((id) => $(id)).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => {
          if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach((s) => spy.observe(s));
    new IntersectionObserver((es) => {
      if (es[0].isIntersecting) navLinks.forEach((a) => a.removeAttribute('aria-current'));
    }, { threshold: 0.5 }).observe(hero);
  }

  // Optional portrait: shown only if assets/photo.jpg exists.
  const img = $('portraitImg');
  if (img) {
    img.addEventListener('load', () => { img.hidden = false; });
    img.addEventListener('error', () => { img.remove(); });
    if (img.complete && img.naturalWidth) img.hidden = false;
  }

  /* ───────────── Globe ───────────── */
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }
  if (!window.maplibregl || !hasWebGL()) return;   // no WebGL: the rest of the site still works

  const HOME = { lng: -82.3, lat: 24 };
  const isWide = () => window.innerWidth >= 1000;
  const isDesktop = () => window.innerWidth >= 700;
  function padding() {
    const w = window.innerWidth;
    // The globe has its own right-hand stage; reserve space above it on phones.
    if (isDesktop()) return { top: 0, bottom: 0, left: 0, right: 0 };
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  function fitZoom() {
    const w = $('map').clientWidth, h = $('map').clientHeight, p = padding();
    const usableW = w - p.left - p.right, usableH = h - p.top - p.bottom;
    const diameter = Math.min(usableW, usableH) * (isWide() ? 0.84 : 0.9);
    return Math.max(0.1, Math.log2(diameter / 163));
  }

  let imageryUrl = CFG.basemap.imagery, imageryMax = CFG.basemap.imageryMaxzoom, imageryAttr = CFG.basemap.attribution;
  const logo = $('maptilerLogo');
  if (logo) logo.hidden = CFG.basemap.provider !== 'maptiler';
  const landSrc = window.LAND_GEOJSON || new URL('data/land-110m.geojson', document.baseURI).href;

  const map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      projection: { type: 'globe' },
      sources: {
        land: { type: 'geojson', data: landSrc },
        imagery: { type: 'raster', tiles: [imageryUrl], tileSize: 256, maxzoom: imageryMax, attribution: imageryAttr },
        ref: { type: 'raster', tiles: [CFG.basemap.labels], tileSize: 256, maxzoom: 13 }
      },
      layers: [
        { id: 'ocean', type: 'background', paint: { 'background-color': '#0a2840' } },
        { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#2d4a3b' } },
        { id: 'imagery', type: 'raster', source: 'imagery', paint: { 'raster-fade-duration': 120 } },
        { id: 'labels', type: 'raster', source: 'ref', paint: { 'raster-fade-duration': 120 } }
      ]
    },
    center: [HOME.lng, HOME.lat],
    zoom: fitZoom(),
    minZoom: 0.1,
    maxZoom: 17,
    maxPitch: 65,
    attributionControl: false,
    fadeDuration: 150,
    canvasContextAttributes: { antialias: true }
  });
  window.__globe = map;   // handy for debugging in the console
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.touchZoomRotate.disableRotation();   // two-finger gestures stay pinch-zoom only on touch screens

  const ready = new Promise((res) => map.once('load', () => { map.setPadding(padding()); res(); }));

  /* ── auto-rotation: pauses while you touch the globe, resumes a few seconds later ── */
  let pointerDown = false, lastInteract = 0, lastT = 0, userZoomed = false;
  const rotateOn = !reducedMotion;
  const mapEl = $('map');
  const touch = () => { lastInteract = performance.now(); };
  mapEl.addEventListener('pointerdown', () => { pointerDown = true; touch(); });
  window.addEventListener('pointerup', () => { pointerDown = false; touch(); });
  window.addEventListener('pointercancel', () => { pointerDown = false; touch(); });
  mapEl.addEventListener('wheel', touch, { passive: true });
  map.on('movestart', (e) => { if (e.originalEvent) touch(); });
  map.on('zoomstart', (e) => { if (e.originalEvent) userZoomed = true; });

  function tick(t) {
    const dt = Math.min(64, t - (lastT || t));
    lastT = t;
    if (rotateOn && heroVisible && !document.hidden && !pointerDown && t - lastInteract > 3000 &&
        map.getZoom() < 4.5 && !map.isMoving()) {
      const c = map.getCenter();
      map.jumpTo({ center: [c.lng + dt * 0.008, c.lat] });   // gentle rotation: 8 degrees per second
    }
    requestAnimationFrame(tick);
  }
  ready.then(() => requestAnimationFrame(tick));

  /* ── if MapTiler fails (key missing / blocked / over the free quota) switch to free Esri imagery ── */
  let baseLoaded = false, baseErrors = 0;
  map.on('data', (e) => { if (e.sourceId === 'imagery' && e.tile) baseLoaded = true; });
  map.on('error', (e) => {
    if (!e || e.sourceId !== 'imagery' || baseLoaded || CFG.basemap.provider !== 'maptiler') return;
    if (++baseErrors < 3) return;
    CFG.basemap.provider = 'esri';
    map.removeLayer('imagery'); map.removeSource('imagery');
    map.addSource('imagery', { type: 'raster', tiles: [CFG.basemap.imageryFallback], tileSize: 256, maxzoom: 18,
      attribution: 'Imagery © Esri, Vantor, Earthstar Geographics, GIS User Community' });
    map.addLayer({ id: 'imagery', type: 'raster', source: 'imagery', paint: { 'raster-fade-duration': 120 } }, 'labels');
    if (logo) logo.hidden = true;
  });

  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      map.resize();
      map.setPadding(padding());
      if (!userZoomed) map.setZoom(fitZoom());
    }, 120);
  });
})();
