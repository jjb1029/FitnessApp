# Forma

A strength-training app whose promise is: tell it what you want, it handles the complexity, and it can always explain why.

- Product, UX, technical, and engine architecture: [`docs/`](docs/00-overview.md)
- Phase 1 screen specification: [`docs/13-phase1-ux-spec.md`](docs/13-phase1-ux-spec.md)

## Develop

```bash
npm install
npm run typecheck && npm run lint && npm test
```

Run on a device or emulator with a development build (SQLite migrations and notifications need native code):

```bash
npx expo run:android
```

```bash
npx expo run:ios
```

Preview the design system in a browser (web is not a product target):

```bash
npm run web
```

Then open `http://localhost:8081/dev/gallery`.

## Status

M1 (foundation) complete: design system, domain model, database schema and migrations, exercise and program seed, explanation engine registry. See `docs/08-mvp-roadmap.md` for what comes next.
