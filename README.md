# Buksh Landscapes website

Static site for Buksh Landscapes (Edmonton). No framework, no dependencies: plain HTML, CSS and JS, built by a ~150-line Node script and served from `docs/` on GitHub Pages.

## Edit and rebuild

```bash
node build.mjs          # src/ -> docs/
cd docs && python3 -m http.server 8765   # preview at http://localhost:8765
```

- Pages: `src/pages/**/index.html` (front-matter JSON comment at the top sets title, description, hero image)
- Shared shell: `src/layout.html`, partials in `src/partials/` (`{{> quote}}` is the 3-step quote form)
- Styles: `src/assets/css/site.css` · Behaviour + scroll engine: `src/assets/js/site.js`
- Images: `src/assets/img/*-{480,960,1600}.webp`, listed in `images.json` (name, category, alt text). Use `{{img name="patio-sunset" sizes="50vw"}}` in pages; the gallery page is generated from `images.json`.

## Before going live on bukshlandscapes.com

1. **Quote form delivery.** By default the form opens the visitor's email app pre-filled to info@bukshlandscapes.com. To receive submissions directly, set `FORM_ENDPOINT` at the top of `src/assets/js/site.js` to a form backend (e.g. Formspree, or `https://formsubmit.co/ajax/info@bukshlandscapes.com`, which needs a one-time activation from that inbox), then rebuild.
2. **Search indexing.** Pages carry `noindex` so this preview never competes with the live site. When it moves to the real domain, build with `SITE_URL=https://bukshlandscapes.com/ INDEXABLE=true node build.mjs`.
3. **Reviews.** No customer reviews are shown because none could be verified publicly. Add real Google reviews (with permission) to the homepage proof strip when available.
4. **Facts to confirm with the owner:** BBB A+ rating, "since 2017", 20+ years combined experience, warranty terms (copied from the current site's FAQ), typical base depths in the patio cross-section.

## Motion

Scroll-linked 3D (depth-zoom hero, pinned exploded patio cross-section, curved photo wall, 3D card rise, perspective text) runs from one passive scroll listener + one `requestAnimationFrame`, writing CSS custom properties only for on-screen elements. Rotations are capped at roughly 15° and zoom deltas at roughly 0.2. `prefers-reduced-motion` turns all of it off. On phones the photo wall becomes a native swipe carousel.
