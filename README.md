# Earth Toy 🌍

A little 3D toy globe for curious kids, made for iPad. Spin it, pinch to zoom, and tap a country, city or ocean to hear all about it.

Inspired by [My Earth Toy](https://myearthtoy.com/).

## Run it

```
npm install
npm run dev      # http://localhost:5173 (also on your Wi-Fi network for the iPad)
npm run build    # production build into dist/
```

Pushing to `main` builds and publishes to GitHub Pages automatically
(Settings → Pages → Source: **GitHub Actions**).

On the iPad, open the site in Safari → Share → **Add to Home Screen** for a full-screen app that works offline.

## Map of the code

```
src/
  main.ts              buttons, country card, startup
  speech.ts            read-aloud with the iPad's voices
  data/countries.ts    borders (Natural Earth), kid-friendly names, flags, picking
  data/facts.json      capitals, population, languages… (built by scripts/build-facts.mjs)
  data/kid.ts          hand-written kid content: greetings, foods, fun facts, oceans, continents
  data/cards.ts        turns facts into fact cards and read-aloud text
  data/oceans.ts       works out which ocean or sea you tapped
  data/palette.ts      toy colours
  globe/GlobeApp.ts    camera, touch controls, fly-to, render loop, auto quality
  globe/mapTextures.ts paints the country, picking and land-height textures
  globe/earth.ts       puffy land shell + tap highlight, atmosphere glow
  globe/ocean.ts       animated water shader (waves, sparkles, foam, shallows)
  globe/sky.ts         puffy clouds and twinkling stars
  globe/labels.ts      names that fade in as you zoom, without overlapping
```

## Roadmap

1. ✅ Setup: Vite + TypeScript + three.js, installable app, GitHub Pages
2. ✅ Toy globe: countries, puffy land, ocean, clouds, stars, tap a country
3. ✅ Names that fade in with zoom, camera tilt up close, fact cards with read-aloud
4. Landmarks and animals
5. Planes, ships and trains on real routes
6. Games, stickers and an animal book
7. The Moon and Mars
8. Sound, music and a parent settings page

## Data

- Country borders and capital cities: [Natural Earth](https://www.naturalearthdata.com/) (public domain)
- Population: World Bank, via [datasets/population](https://github.com/datasets/population)
- Capitals, languages, regions: [world-countries](https://github.com/mledoze/countries) (ODbL)

To refresh the facts: `node scripts/build-facts.mjs`
