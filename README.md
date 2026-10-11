# Goa Choice Order

Create an order management system for a cafe named "Goa Choice".

Key requirements and features:
- Responsive UI tailored for both Android mobile and tablet screens
- Table management across multiple tables with live status and active order tracking
- Product catalog: owner can add, edit, and delete products with photos, pricing, and categories
- Table order summary: select items, view active table orders, calculate totals, and settle bills
- Full day summary: daily revenue, order counts, and item breakdown
- Stored locally: keep the last 30 days of data on-device with efficient queries and state management
- Tech stack: React + Vite + Capacitor setup, using local storage/SQLite with browser-compatible local storage fallback so it works seamlessly both in web preview and when packaged for Android

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0787c5dd-539d-4af9-8b50-e40fe888f173).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
