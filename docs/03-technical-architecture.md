# 03 · Technical Architecture

Validated 2026-09-07: single mobile application, no backend in Phase 1, infrastructure simplified. The training engine, explanation system, offline database, and data model are **not** simplified; they are the product.

## 1. Stack (verified against the npm registry on 2026-09-07)

| Concern | Choice | Version | Phase | Why |
|---|---|---|---|---|
| Framework | Expo (managed, CNG, EAS) | SDK 57 (`expo@57.0.20`) | 1 | Current stable. New Architecture only. React Native 0.86/0.87, React 19.2 |
| Language | TypeScript, strict | 5.x | 1 | |
| Routing | Expo Router | 57.x | 1 | File-based native stacks, typed routes, tabs |
| Local database | expo-sqlite + Drizzle ORM | 57.x / 0.45.x | 1 | Offline-first source of truth, typed schema, migrations, live queries |
| UI state | Zustand | 5.x | 1 | Active-session working copy, timer, ephemeral UI |
| Validation | Zod | 4.x | 1 | Domain schemas, seed validation, explanation templates |
| Lists | @shopify/flash-list | 2.x | 1 | History and exercise lists |
| Animation / gestures | react-native-reanimated 4, react-native-gesture-handler 3 | bundled | 1 | Sheets, timer, list transitions |
| Keyboard | react-native-keyboard-controller | 1.x | 1 | Numeric entry on the workout screen |
| Fast KV | expo-sqlite/kv-store | 57.x | 1 | Preferences, last route, flags. MMKV v4 needs Nitro modules and a prebuild; the built-in store is enough |
| Haptics / notifications | expo-haptics, expo-notifications | 57.x | 1 | Set complete, rest timer alert |
| Charts | decided by a one-day spike in M1: victory-native (Skia) vs a pure-JS SVG chart | | 1 | Three chart types; pick the simpler one that renders well in dark mode |
| Crash reporting | Sentry (opt-in) | | 1 | No product analytics SDK in Phase 1 |
| Server cache | TanStack Query | 5.x | 2 | Coach calls, sync |
| Backend | Supabase (Auth, Postgres, Edge Functions) | | 2 | Arrives with the coach; see 10 |
| AI | Anthropic TypeScript SDK on the server | `@anthropic-ai/sdk` 0.124.x | 2 | See 06 |
| Secure storage | expo-secure-store | 57.x | 2 | Session tokens |
| Health data | react-native-health, react-native-health-connect | 1.x / 4.x | 3 | Real integrations, explicit unavailable states |
| Testing | Jest + React Native Testing Library, Maestro for E2E | | 1 | Engine rules get exhaustive fixture tests |
| Tooling | npm, ESLint (expo config + import boundaries + React Compiler rules), Jest | Node 24 | 1 | |

**Styling:** typed `StyleSheet` with a theme object served by `useTheme()`. No Tailwind-style layer, no Expo UI primitives for the MVP.

**Web:** enabled only to preview the design system in a browser (`npm run web`, then `/dev/gallery`). `db.web.ts` and `DatabaseProvider.web.tsx` stub the database out; nothing else is web-specific and no feature is tested on web.

## 2. Repository layout (single Expo app)

```
FitnessApp/
├─ src/app/                      Expo Router routes (thin: params, layout, one screen component each)
│  ├─ _layout.tsx                providers: theme, database, session store, notifications
│  ├─ (tabs)/                    home.tsx · train.tsx · progress.tsx
│  ├─ onboarding/                goal · schedule · equipment · recommendation · personalise
│  ├─ workout/[sessionId].tsx    active session (modal stack, no tab bar)
│  ├─ exercise/[id].tsx
│  ├─ program/[id]/…             program detail, day edit
│  ├─ session/[id].tsx           history detail
│  ├─ recommendation/[id].tsx
│  └─ settings/…
├─ src/
│  ├─ domain/                    entity types, Zod schemas, Explanation type — imports nothing
│  ├─ engine/                    training rules, explanation templates, program selection — imports domain only
│  ├─ knowledge/                 knowledge items (markdown + frontmatter) and the bundled JSON build
│  ├─ exercises/                 exercise and program seed data (JSON) + validation script
│  ├─ data/                      Drizzle schema, migrations, repositories, seeding, live-query hooks
│  ├─ features/                  onboarding · home · programs · workout · history · progress · recommendations · settings
│  ├─ ui/                        design system: tokens, theme, components
│  ├─ store/                     zustand: sessionStore, timerStore, uiStore
│  ├─ services/                  notifications, export/import, (Phase 2: coach client, sync, auth)
│  ├─ lib/                       units, dates, ids, formatting, i18n string function
│  └─ config/                    feature flags, entitlements (all on in dev, core-only in prod)
├─ assets/
├─ docs/
├─ app.config.ts · eas.json · package.json · tsconfig.json
```

Import boundaries enforced by ESLint: `app → features → (engine | data | services | store | ui) → domain`. `engine` and `domain` never import React, Expo, or Drizzle. When the backend arrives in Phase 2, `domain`, `engine`, and `knowledge` are extracted into workspace packages so the coach function shares them; their internal structure is already package-shaped.

## 3. Feature modules

| Module | Responsibility |
|---|---|
| `onboarding` | Five-screen flow, profile creation, program recommendation via `engine.selectProgram` |
| `home` | Today card (sequential scheduling), progress snapshot, at most one recommendation card, bodyweight quick log |
| `programs` | Current program, day editing, template browsing and switching |
| `workout` | Active session: exercise list, input dock, set rows, rest timer, swap, notes, warm-ups, finish summary |
| `history` | Session list, session detail, per-exercise history, editing past sets |
| `progress` | Bodyweight trend, strength (e1RM), PRs, consistency, measurements |
| `recommendations` | Pending list with caps, detail, Apply / Keep |
| `settings` | Profile, units, RIR/RPE, theme, haptics, sound, advanced mode, export/import, notifications |

## 4. Layers

**Routes** hold no logic. **Features** compose repositories, engine calls, and stores into screen state via hooks. **Engine** is pure and returns `Result + Explanation` from every public function. **Data** owns SQLite: schema, migrations run before first render, repositories, seed loading with `catalog_version`, and `useLiveQuery` for reactive reads. **Stores** hold the working copy of the active session; every mutation is persisted to SQLite in the same tick and rehydrated on launch. SQLite is the truth; Zustand is the cache.

## 5. Offline-first (Phase 1) and sync-ready (Phase 2)

- Every user-owned table has `id` (UUID v7), `created_at`, `updated_at`, `deleted_at`, `version` from day one. These are cheap and make later sync a bolt-on.
- There is no outbox, no sync service, and no network dependency in Phase 1. Settings shows "Backup: use Export" with a one-line explanation that iOS and Android system backups include app data.
- **Export / import**: a versioned JSON file of all user data, shareable through the OS share sheet; import merges by id. This is the Phase 1 device-loss story and the Phase 2 migration path.
- Phase 2 adds an outbox table, a `SyncTransport` interface, Supabase tables mirroring the schema, and a one-time "enqueue everything" on first sign-in. Last-writer-wins on `updated_at` for a single device; multi-device merge is Phase 3.

## 6. Identity and authentication

Phase 1: a local `User` row created on first launch; `auth_user_id` is null. No sign-in anywhere in the app. Phase 2: Supabase Auth (Apple, Google, email code) links the local user to an account without migrating data. Sign-in remains optional forever for the core loop.

## 7. Backend (Phase 2)

Supabase: Postgres mirror tables with row-level security, a `coach` Edge Function (Anthropic SDK, streaming, structured actions), and the bundled knowledge JSON deployed alongside the function. The Anthropic key lives only in function secrets. The `CoachClient` interface in `services` is defined in Phase 2; nothing in Phase 1 references it.

## 8. Units and numbers

- Loads stored as canonical `load_kg` plus `entered_load` and `entered_unit` for audit. Display always rounds to the exercise increment in the user's unit, so 75 lb never becomes 74.99 lb.
- Bodyweight, measurements, and height in kg / cm. RIR canonical; RPE is display-only (10 − RIR). RIR may be null.
- Timestamps ISO-8601 UTC plus `local_date` (YYYY-MM-DD in the device zone at write time). A session belongs to the local date it **started**.
- All user-facing strings pass through one `t()` function from day one; English only at launch.

## 9. Performance and reliability

- Set entry path renders from the session store with no awaited I/O; SQLite writes happen after the UI update. Target under 16 ms per interaction on a mid-range Android phone.
- Rest timer stores a monotonic end timestamp; a scheduled local notification backs it up when the app is backgrounded.
- Migrations are additive only in Phases 1–2; CI tests migration from every shipped schema version with a fixture database.
- Exercise catalog slugs never change; renames are display names plus aliases; merges use a redirect table.
- Database opened once in the root layout with a branded loading state; seed runs inside a transaction on first launch.

## 10. Build and release

EAS Build profiles `development`, `preview`, `production`; `expo-dev-client` for internal builds; EAS Update for JS-only fixes. Environment via `app.config.ts`. iOS 16.4+, Android 8+, edge-to-edge on Android. Internal distribution to the lifter test group from M3.

## 11. Privacy

All data on device in Phase 1. Progress photos in the app's document directory. Crash reporting opt-in with a plain explanation. No advertising SDK in Phase 1 (see 10 §5 for the ads discussion).
