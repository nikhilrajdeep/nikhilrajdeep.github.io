/* Career story map. Coordinates locate cities rather than individual offices. */
(function () {
  'use strict';
  const container = document.getElementById('careerMap');
  if (!container) return;
  const fallback = document.getElementById('careerMapFallback');
  const steps = Array.from(document.querySelectorAll('.career-step'));
  const places = {
    gainesville: { center: [-82.3248, 29.6516], zoom: 9, color: '#2879b7', label: 'Gainesville, Florida, United States' },
    hyderabad: { center: [78.4867, 17.385], zoom: 8.5, color: '#7757bd', label: 'Hyderabad, Telangana, India' },
    kharagpur: { center: [87.3119, 22.346], zoom: 9, color: '#27856a', label: 'Kharagpur, West Bengal, India' },
    delhi: { center: [77.209, 28.6139], zoom: 9, color: '#ab4e6f', label: 'New Delhi, India' },
    ranchi: { center: [85.3096, 23.3441], zoom: 9, color: '#b07628', label: 'Ranchi, Jharkhand, India' }
  };
  const features = Object.entries(places).map(([id, p]) => ({ type: 'Feature', properties: { id, color: p.color }, geometry: { type: 'Point', coordinates: p.center } }));
  let map, loaded = false, active = 'overview', pending;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panel = document.querySelector('.career-map-panel');
  const caption = document.getElementById('careerLocation');
  const remote = document.getElementById('careerRemote');
  const links = Array.from(document.querySelectorAll('.career-legend a'));
  function update(id) {
    active = id;
    const place = places[id];
    const isRemote = id === 'remote';
    steps.forEach(step => step.classList.toggle('is-active', step.dataset.place === id));
    links.forEach(link => {
      if (link.hash === '#career-' + id) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    caption.textContent = place ? place.label : isRemote ? 'Remote projects across regions' : 'A world of experience';
    panel.style.setProperty('--active-place', place ? place.color : '#537586');
    remote.hidden = !isRemote;
    if (!loaded) return;
    clearTimeout(pending);
    panel.classList.add('is-changing');
    pending = setTimeout(() => {
      const selected = place ? features.filter(f => f.properties.id === id) : [];
      map.getSource('career-selected').setData({ type: 'FeatureCollection', features: selected });
      map.flyTo({ center: place ? place.center : [12, 19], zoom: place ? place.zoom : .65, bearing: 0, pitch: 0, duration: reduced ? 0 : 2200, essential: false });
      panel.classList.remove('is-changing');
    }, reduced ? 0 : 180);
  }
  try {
    if (!window.maplibregl) throw new Error('Map library unavailable');
    map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        sources: {
          base: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Imagery © Esri, Vantor, Earthstar Geographics and the GIS User Community', maxzoom: 18 },
          labels: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Labels and boundaries © Esri', maxzoom: 13 },
          'career-points': { type: 'geojson', data: { type: 'FeatureCollection', features } },
          'career-selected': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
        },
        layers: [
          { id: 'career-base', type: 'raster', source: 'base' },
          { id: 'career-labels', type: 'raster', source: 'labels' },
          { id: 'career-rings', type: 'circle', source: 'career-points', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 14, 5, 26, 9, 70], 'circle-color': ['get', 'color'], 'circle-opacity': .13, 'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1, 'circle-stroke-opacity': .4 } },
          { id: 'career-selected-ring', type: 'circle', source: 'career-selected', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 19, 9, 90], 'circle-color': ['get', 'color'], 'circle-opacity': .08, 'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-opacity': .55 } },
          { id: 'career-dots', type: 'circle', source: 'career-points', paint: { 'circle-radius': 5, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } }
        ]
      },
      center: [12, 19], zoom: .65, minZoom: .25, maxZoom: 14,
      attributionControl: false, scrollZoom: false, cooperativeGestures: true,
      dragRotate: false, pitchWithRotate: false, touchPitch: false
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => { loaded = true; update(active); });
    new ResizeObserver(() => map.resize()).observe(container);
    // Clicking a city on the map opens the corresponding role in the story.
    map.on('click', 'career-dots', event => {
      const id = event.features && event.features[0].properties.id;
      const step = document.getElementById('career-' + id);
      if (step) step.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
    map.on('mouseenter', 'career-dots', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'career-dots', () => { map.getCanvas().style.cursor = ''; });
  } catch (error) {
    fallback.hidden = false;
  }
  // A document scroll drives the map; the map never captures wheel scrolling.
  function selectStep() {
    const target = innerHeight * (innerWidth < 850 ? .66 : .46);
    let selected = steps[0];
    for (const step of steps) {
      if (step.getBoundingClientRect().top <= target) selected = step;
      else break;
    }
    if (selected.dataset.place !== active) update(selected.dataset.place);
  }
  let scheduled = false;
  addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; selectStep(); });
  }, { passive: true });
  addEventListener('resize', selectStep);
  update('overview');
  selectStep();
})();
