# ClearCut — Frontend

Frontend for **ClearCut**, a background-remover SaaS for photographers (a project with Chris). Built with **React + Vite + Tailwind CSS** and **react-router-dom**. Dark, monochrome, Montserrat aesthetic.

The backend doesn't exist yet — auth and background removal are mocked in `src/context/AuthContext.jsx` and `src/lib/api.js` so the full flow (sign up → log in → dashboard → tool) is clickable end to end.

## Run it (day to day)

```bash
npm run dev
```

Starts the Vite dev server with hot reload, usually at http://localhost:5173.

Other commands:

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

## First-time setup

Requires Node.js 18+. From this folder:

```bash
npm install       # install dependencies (only needed once)
npm run dev
```

## Project structure

```
src/
  components/   Navbar, Footer, Logo, AuthLayout, SocialRail, ScrollCue, ProtectedRoute
  context/      AuthContext.jsx — mock auth (localStorage session)
  lib/          api.js — mock removeBackground() job
  pages/        Landing, Login, Signup, Dashboard, Tool, NotFound
  index.css     theme: bg-stage, buttons, underline inputs, checkerboard
App.jsx         routes
```

## Theming

The whole app is monochrome and re-skinnable from two places:

- `tailwind.config.js` — the `ink` color palette + Montserrat font.
- `src/index.css` — `.bg-stage`, button/input/card styles.
