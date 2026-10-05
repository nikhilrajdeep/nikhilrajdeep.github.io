# Nikhil Raj Deep — portfolio

Static site (no build step) with an interactive MapLibre globe on the home page.

```
index.html               page + all ten sections (edit text here)
css/style.css            styling, light/dark themes
js/config.js             your MapTiler API key goes here
js/layers.js             basemap definition (MapTiler or Esri imagery + labels)
js/main.js               navigation, theme, globe, swipe compare
data/land-110m.geojson   tiny offline coastline fallback
assets/                  put photo.jpg and Nikhil_Raj_Deep_CV.pdf here
.github/workflows/pages.yml   deploys the site to GitHub Pages on every push
```

## Publish on GitHub Pages
1. Create the repository and push these files to the `main` branch.
2. Settings → Pages → **Build and deployment → Source: GitHub Actions**.
3. In MapTiler Cloud → Account → Keys, open your key and add your site address (for example `yourusername.github.io`) under **Allowed HTTP origins**, then save.

## The globe
- **Satellite hybrid** – MapTiler *Satellite Plain* (`satellite-v4`) plus Esri place names and borders. If the key is missing, blocked, or over the free monthly quota, the site falls back to Esri World Imagery automatically.
- It rotates slowly, pauses while you touch it, and zooms with scroll, pinch or the + / − buttons.

Items marked with orange **ADD** badges in `index.html` are placeholders for you to fill in.
