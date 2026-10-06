# PostGradeVue

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
## Environment Configuration

The app needs one setting: where the Django API is.

| Variable | Example | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api/` | API root. A trailing `/` is optional. |

**Local development:** copy `.env.example` to `.env.local` (git-ignored). Without it, the app uses `http://127.0.0.1:8000/api/`.

```sh
cp .env.example .env.local
```

**Staging / production:** set the variable in the hosting platform's build settings. It is read at **build time** and baked into the bundle, so changing it needs a rebuild.

```sh
# API on its own domain
VITE_API_BASE_URL=https://api.postgrade.example.com/api/ npm run build
# API behind the same domain as the frontend (reverse proxy)
VITE_API_BASE_URL=/api/ npm run build
```

A production build **fails** unless the value is an `https://` URL or a same-origin path such as `/api/`, so a forgotten variable can never ship a bundle that calls `localhost`.

The backend must allow the frontend's origin (`CORS_ALLOWED_ORIGINS` in the Django `.env`) and serve HTTPS.

> **No secrets in `VITE_` variables.** Every `VITE_` value ends up in the public JavaScript that any visitor can read.

### Hosting

The router uses HTML5 history mode (`/courses/3`, not `/#/courses/3`). The host must answer every unknown path with `index.html` (an "SPA fallback"); otherwise opening or refreshing a nested page gives a 404. Most static hosts have a setting for this (e.g. a rewrite of `/*` to `/index.html`).

### Student-number recognition method

On an assessment, choose **Handwritten digits (OCR)** or **Filled bubbles** before selecting files. The upload queue keeps that choice for each file, even if the selector changes for later files. Retries keep the same choice. Bubble processing never reads handwritten digits; it recognizes one filled circle per column and suggests only an exact class enrollment match. Uncertain columns require manual review.

The backend bubble-recognition release must be deployed first (including migrations and the recognition worker). The UI checks `/api/submissions/recognition-methods/` and disables the bubble choice on older backends. The review panel shows the rectified grid, decoded number, ambiguity reasons and per-column readings. The supported layouts currently contain eight columns and rows 0–9.
