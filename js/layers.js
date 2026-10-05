/* Basemap catalogue for the home-page globe.
   Satellite hybrid = satellite imagery + place names and borders.
   - With a MapTiler key (js/config.js): MapTiler "Satellite Plain" (satellite-v4).
   - Without one, or if MapTiler fails / runs out of free quota: Esri World Imagery.
   Place names and borders always come from the Esri reference layer. */
window.PORTFOLIO_LAYERS = (function () {
  const key = (window.PORTFOLIO_CONFIG && window.PORTFOLIO_CONFIG.maptilerKey || '').trim();
  const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  return {
    basemap: {
      provider: key ? 'maptiler' : 'esri',
      imagery: key ? 'https://api.maptiler.com/maps/satellite-v4/256/{z}/{x}/{y}.jpg?key=' + encodeURIComponent(key) : esri,
      imageryMaxzoom: key ? 19 : 18,
      imageryFallback: esri,
      labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      attribution: key
        ? 'Satellite © MapTiler, © Maxar/Vantor and other imagery providers · Labels © Esri'
        : 'Imagery © Esri, Vantor, Earthstar Geographics, GIS User Community'
    }
  };
})();
