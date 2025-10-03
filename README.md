# Checkout with Stripe (Node.js + React)

Simple e‑commerce demo that lets users browse products, add to cart, and pay via Stripe Checkout.

Backend: `Express` + `stripe` + `sqlite3`

Frontend: `React` (CRA) + `react-router-dom`

## Features

- **Products list** from mock API `GET /api/products`
- **Cart** with item count, quantity updates, and totals
- **Checkout** with required email; creates a Stripe Checkout Session
- **Redirects** to Stripe Checkout; shows status on success/cancel pages
- **Webhooks** update order status in SQLite

## Prerequisites

- Node.js 18+
- Stripe account and API keys

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env` and set your keys:

   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...   # set after you run the webhook listener
   PORT=4242
   CLIENT_BASE_URL=http://localhost:3000
   ```

3. **Run servers in two terminals**

   - Terminal A (backend):
     ```bash
     npm run server
     ```
     Server starts at `http://localhost:4242`.

   - Terminal B (frontend):
     ```bash
     npm start
     ```
     App opens at `http://localhost:3000`.

4. **Stripe webhook (recommended)**

   For local testing, start the Stripe CLI in a third terminal to forward webhooks to the backend endpoint `POST /webhook`:

   ```bash
   stripe listen --forward-to localhost:4242/webhook
   ```

   Copy the printed signing secret and set `STRIPE_WEBHOOK_SECRET` in `.env`, then restart the server.

## How it works

- Backend `server/index.js` exposes:
  - `GET /api/products` returns mock products.
  - `POST /api/create-checkout-session` validates email + items, creates a Stripe Checkout Session, saves an order with `pending` status, and returns the session URL.
  - `GET /api/session-status?session_id=...` fetches the session from Stripe to display status on the success page.
  - `POST /webhook` updates the SQLite order status on `checkout.session.completed` and failure/expired events.

- Orders persistence in `server/ordersDb.js` using SQLite (`orders.db` stored next to it).

## Notes

- Prices are stored in cents (USD) in mock products.
- Email is required before creating a checkout session.
- Cart data is client-side only; order persistence happens server-side when a session is created and finalized via webhooks.

## Deploy

For production, ensure environment variables are set securely, and configure your domain in Stripe redirect URLs (`success_url`, `cancel_url`).
