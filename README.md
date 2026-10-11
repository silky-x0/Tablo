# Tablo

Tablo is an offline-first order-management product for cafes and restaurants.
Take table orders, manage the menu, settle bills, and track sales — on Android
mobile, tablet, or the web preview.

## Screenshots

> Drop screenshots in `docs/screenshots/` and they will show up below.

| Tables | Table order | Menu | Sales & reports |
| --- | --- | --- | --- |
| ![Tables](docs/screenshots/tables.png) | ![Table order](docs/screenshots/table-order.png) | ![Menu](docs/screenshots/menu.png) | ![Sales and reports](docs/screenshots/reports.png) |

Suggested captures: occupied/free table grid, category pills + order panel,
menu manager, daily/monthly reports (mobile + tablet if possible).

## Download

The installable Android build is published as an APK on
[GitHub Releases](../../releases).

- Download the latest `Tablo-debug.apk` (or versioned `Tablo-vX.Y.Z.apk`) from Releases
- Install it directly on Android (enable Install unknown apps if prompted)
- No server or account needed — all data stays on-device

Maintainer note: build with `npm run cap:apk`, then attach the resulting
`Tablo-debug.apk` to a new GitHub Release.

## Features

### Tables
- Live table grid with Occupied / Free status, running total, item count, and order start time
- Configurable table count (1–60) with add / remove controls
- Table aliases (e.g. Rahul, VIP Booth) with add, edit, and clear
- Tap a table to open its order

### Ordering & billing
- Category filter pills (All + every menu category) and fast-tap product grid with photos
- Quantity badges on items already in the order
- Active order panel with quantity steppers, line totals, and order total in INR
- Clear table and settle-bill flows with confirmation

### Menu management
- Add, edit, and delete products with name, price, category, and optional photo
- Category-grouped menu list
- Seeded demo menu on first run so the app is usable immediately

### Sales & reports
- Daily summary: revenue, orders, average bill, items sold, and settled bills, with day navigation (up to 180 days back)
- Monthly comparison: revenue, orders, and average ticket for the selected month vs the previous month, with diff and percent change
- Item performance comparison per product (quantity, revenue, change, trend indicators)
- Performance overview and growth commentary

### Offline-first storage
- On-device SQLite via `@capacitor-community/sqlite` on Android
- Same database on web via `jeep-sqlite` + IndexedDB, so the web preview works without native code
- In-memory UI state with write-through to SQLite for instant taps and survival across restarts
- 6-month (180-day) retention for settled bills, enforced with an indexed range delete

## Tech stack

- React 19 + Vite + TanStack Router / Start + TanStack Query
- Tailwind CSS 4
- Capacitor 8 for Android packaging
- TypeScript, Vitest

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Useful scripts:

```sh
npm test          # run Vitest suite
npm run build     # web / SSR build
npm run cap:apk   # mobile web build + Capacitor sync + Gradle debug APK (see scripts/build-apk.cjs)
```

## Credits

Tablo's UI was made with [Lovable](https://lovable.dev).
