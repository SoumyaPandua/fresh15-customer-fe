# Fresh15 — Customer App Specification

A production-ready frontend for a 15-minute grocery delivery app (Blinkit / Zepto / Instamart class). This document is the single reference a backend / mobile / QA engineer needs to understand **what the app does, how data flows, and what a real backend must expose** to replace the current mock layer.

---

## 1. Product overview

Fresh15 is a hyperlocal grocery ordering app for Indian users. Value proposition: **groceries at your door in 15 minutes**, with transparent pricing, a wide catalogue (fruits, veggies, dairy, snacks, staples), and a modern app-like UX on web.

Personas:
- **Guest shopper** — browses catalogue, adds to cart, must sign up before checkout.
- **Registered customer** — full flow: order, track, reorder, review, manage addresses.
- **(Future) Admin / Rider** — out of scope for this app; backend must still leave room for these.

---

## 2. Tech stack (frontend)

| Layer | Tech |
|---|---|
| Framework | TanStack Start v1 (React 19, Vite 7, file-based routing under `src/routes/`) |
| Styling | Tailwind CSS v4 + semantic design tokens in `src/styles.css` |
| State (client) | Zustand with `persist` middleware (localStorage) |
| Data fetching | TanStack Query against `src/lib/api.ts` (currently mock, swap for real API) |
| UI primitives | shadcn/ui (`src/components/ui/*`) |
| Notifications | `sonner` toasts |

All backend interactions today go through **`src/lib/api.ts`** — one file, one place to swap mocks for real HTTP calls.

---

## 3. Screen inventory (routes)

| Path | Purpose |
|---|---|
| `/` | Home: location, search, categories, banners, flash offers, best sellers, seasonal, recommended |
| `/search` | Debounced full-text search, recent + trending queries |
| `/category/$slug` | Category listing with sort & filter |
| `/product/$id` | Product details, variants, reviews, similar products |
| `/cart` | Line items, coupon apply, price breakdown |
| `/checkout` | Address select, payment method, place order |
| `/orders` | Order history + active tracking entry point |
| `/orders/$id` | Order tracking with multi-step status |
| `/wishlist` | Saved products |
| `/notifications` | Full notifications list (dialog version lives in `TopBar`) |
| `/addresses` | Address CRUD |
| `/profile` | Profile edit, logout |
| `/help`, `/privacy`, `/terms` | Static |
| `/auth/login`, `/auth/signup`, `/auth/otp`, `/auth/forgot-password`, `/auth/reset-password` | Auth flow |

Global chrome: `TopBar` (location, search, notifications dialog, wishlist, cart, profile), `BottomNav` (mobile).

---

## 4. Core domain model

Types are defined in `src/lib/types.ts`. Backend schemas should mirror these one-for-one.

### Product
```
id, name, categoryId, emoji, gradient, price, mrp, unit, stock, rating,
reviews, etaMinutes, brand?, description, variants?[], images?[], tags?[]
```
- `price` = sell price, `mrp` = strike-through price; discount % is derived.
- `variants[]` supports pack sizes (e.g. 500 ml / 1 L / 2 L) each with own `price`, `mrp`, `unit`.
- `stock <= 0` means "Out of stock" — hide Add-to-cart.
- `etaMinutes` is per-product delivery ETA shown on cards.

### Category
`id, slug, name, emoji, gradient`

### Address
`id, label ("Home"|"Work"|"Other"), name, line1, line2?, city, state, pincode, phone, isDefault?`

### Cart item (client-only until checkout)
`productId, name, emoji, gradient, price, mrp, unit, qty`

### Order
```
id, createdAt, status, items[OrderItem], subtotal, discount, deliveryFee,
taxes, total, address, paymentMethod ("cod"|"razorpay"), etaMinutes
```
`status` is one of: `placed | packed | out_for_delivery | delivered | cancelled`.

### Coupon
`code, description, type ("flat"|"percent"), value, minOrder, maxDiscount?`

### AppNotification
`id, title, body, time, read, icon ("order"|"offer"|"system")`

### Review (new — see §7)
`id, productId, userId, userName, rating (1–5), text, createdAt`

---

## 5. Client-side stores (Zustand, persisted)

| Store | Persist key | Purpose |
|---|---|---|
| `useAuth` | `fresh15-auth` | Logged-in user or guest flag |
| `useCart` | `fresh15-cart` | Cart items + applied coupon |
| `useWishlist` | `fresh15-wishlist` | Array of product IDs |
| `useLocation` | `fresh15-location` | Pincode, city, saved addresses, active address |
| `useTheme` | `fresh15-theme` | `"light" \| "dark"` |
| `useRecent` | `fresh15-recent` | Recently viewed product IDs |
| `useReviews` | `fresh15-reviews` | User-submitted reviews (see §7) |

All persist to `localStorage` and rehydrate on mount. When wiring a real backend, keep the same shapes but replace mutators with API calls and let React Query own the server cache.

---

## 6. Business rules

### 6.1 Pricing (implemented in `selectCartTotals`)
- `subtotal = Σ price × qty`
- `mrpTotal = Σ mrp × qty`
- `savings = mrpTotal − subtotal`
- `couponDiscount = appliedCoupon.discount || 0`
- `taxable = max(0, subtotal − couponDiscount)`
- `taxes = round(taxable × 5%)`
- `deliveryFee = subtotal === 0 ? 0 : subtotal >= 199 ? 0 : 25`
- `total = taxable + deliveryFee + taxes`

### 6.2 Coupons
`api.validateCoupon(code, subtotal)` returns `{ coupon, discount, error? }`.
- Reject if code not found → "Invalid coupon code".
- Reject if `subtotal < coupon.minOrder`.
- `discount = type==='flat' ? value : round(subtotal × value / 100)`, then clamp to `maxDiscount` if set.

### 6.3 Serviceability
`api.checkPincode(pincode)` returns `{ serviceable, etaMinutes }`. Current mock rule: serviceable if pincode matches `/^4\d{5}$/`. Backend must return real geo-fenced serviceability + dark-store ETA.

### 6.4 Auth
- OTP is mocked to `1234` (`api.sendOtp`, `api.verifyOtp`). Real backend must integrate an SMS provider (MSG91 / Twilio) and issue a JWT / session cookie.
- Guest mode is client-only (`isGuest: true`); checkout must upgrade the user to a real account before placing an order.

### 6.5 Order placement
`api.placeOrder(payload)` currently returns a random ID. Real backend must:
1. Re-validate cart prices, stock, coupon, and delivery fee server-side (never trust client totals).
2. Reserve stock atomically.
3. Create order row, return `{ id, etaMinutes }`.
4. Emit an order-placed event so notifications, rider assignment, and tracking can update in real time.

### 6.6 Reviews (see §7 for full spec)
Only **verified buyers** (users with a `delivered` order containing the product) can post a review, and only once per product per user.

### 6.7 Notifications
- Red dot on the bell whenever `unreadCount > 0`.
- Clicking the bell opens a **modal** (Dialog), not a page — the `/notifications` page still exists for "View all".
- Mark-as-read should happen server-side when a notification is opened.

### 6.8 Wishlist
- Heart icon on any product card / details page toggles wishlist membership.
- `TopBar` shows a numeric badge with the current wishlist count.

---

## 7. Reviews — feature spec

### UX
On `/product/:id`:
- Section "Customer reviews" lists all reviews for that product.
- If the current user has a **delivered** order containing this product, a "Write a review" panel is shown (star selector 1–5 + textarea).
- If the user is not logged in → CTA to log in.
- If logged in but never purchased → info: "Only verified buyers can review".
- If already reviewed → "You've already reviewed this product".
- Each review renders name, star rating, text, and a **Verified** badge.

### Client store
`src/lib/store/reviews.ts` (`useReviews`) — persisted list; enforces one review per `(productId, userId)`.

### Required backend endpoints
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/products/:id/reviews?cursor=…` | Paginated reviews, newest first |
| `POST` | `/products/:id/reviews` | Body `{ rating, text }`. Auth required. Server must verify a `delivered` order exists for this user + product and that no prior review exists. |
| `DELETE` | `/reviews/:id` | Author-only. |
| (Derived) | Update `product.rating` and `product.reviews` count via aggregation. |

### Data model (suggested SQL)
```
reviews(
  id uuid pk,
  product_id fk,
  user_id fk,
  rating smallint check (rating between 1 and 5),
  text text,
  created_at timestamptz default now(),
  unique (product_id, user_id)
)
```

---

## 8. API surface (backend contract)

Everything currently in `src/lib/api.ts` must be exposed as HTTP endpoints. Suggested REST layout:

### Catalog
- `GET /categories`
- `GET /banners`
- `GET /products?categoryId=&q=&cursor=`
- `GET /products/:id`
- `GET /products/:id/similar`
- `GET /home` → `{ flashOffers, bestSellers, recommended, seasonal }`

### Cart / Coupons
- Cart lives client-side; server only needs:
- `GET /coupons`
- `POST /coupons/validate` → `{ code, subtotal }` → `{ coupon?, discount, error? }`

### Orders
- `POST /orders` (auth) → place order; validates cart server-side
- `GET /orders` (auth)
- `GET /orders/:id` (auth) — must support live status updates (WS/SSE or polling)

### Auth
- `POST /auth/otp/send` `{ target }`
- `POST /auth/otp/verify` `{ target, otp }` → session
- `POST /auth/login` (email/password)
- `POST /auth/signup`
- `POST /auth/forgot-password`, `POST /auth/reset-password`
- `GET /me`, `PATCH /me`

### Addresses
- `GET /addresses`, `POST /addresses`, `PATCH /addresses/:id`, `DELETE /addresses/:id`
- `POST /addresses/:id/default`

### Serviceability
- `GET /serviceability?pincode=` → `{ serviceable, etaMinutes }`

### Notifications
- `GET /notifications`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- (Push) FCM / APNs tokens: `POST /devices`

### Wishlist
- `GET /wishlist`, `POST /wishlist/:productId`, `DELETE /wishlist/:productId`

### Reviews (see §7)
- `GET /products/:id/reviews`
- `POST /products/:id/reviews`

### Payments
- `POST /payments/razorpay/order` → returns Razorpay order id
- Webhook: `POST /webhooks/razorpay` (verify signature)
- COD is settled on delivery.

---

## 9. Non-functional requirements

- **Performance**: skeletons for every async section; images/emoji art render instantly; product & category grids virtualise for >200 items.
- **Responsiveness**: mobile-first, breakpoints `sm / md / lg`. `BottomNav` on mobile, `TopBar` search on desktop.
- **A11y**: every icon-only button has `aria-label`; dialogs use focus-trap (shadcn `Dialog`).
- **SEO**: every route file defines its own `head()` with title, description, og tags.
- **Theming**: light/dark via `useTheme` store + `.dark` class on `<html>`, hydrated by a small inline script in `__root.tsx` to prevent FOUC.
- **Error handling**: root `notFoundComponent` (custom 404), `errorComponent` with retry; toasts for user-facing failures.

---

## 10. How to plug a real backend in

1. Keep `src/lib/api.ts` as the only network boundary — replace each `async` mock with a `fetch()` call to the endpoints in §8.
2. Introduce an HTTP client (`src/lib/http.ts`) that attaches the auth token from `useAuth`, handles refresh, and normalises errors.
3. For live order tracking, subscribe via WebSocket / SSE in `orders.$id.tsx` and invalidate the `["order", id]` query on each update.
4. Replace the mock OTP flow with a real SMS provider; delete the `otp: "1234"` fallback.
5. Move reviews from `useReviews` store to server; keep the store only as an optimistic-update cache if desired.
6. Add Razorpay checkout in `checkout.tsx` — create order server-side, open the SDK, on success call `POST /orders` with the payment id.
7. Add server-side price + stock revalidation on `POST /orders` — never trust `total` from the client.

---

## 11. Test scenarios (acceptance)

1. **Guest browses → adds to cart → is forced to sign up at checkout.**
2. **Login → apply coupon `FRESH50` → total updates → place COD order → order appears in `/orders` with status `placed`.**
3. **Change delivery address → cart's delivery ETA updates.**
4. **Enter unserviceable pincode → home shows "not serviceable" banner and disables checkout.**
5. **Toggle heart on product → wishlist badge in top bar increments; item appears in `/wishlist`.**
6. **Receive notification (mock) → red dot on bell → click bell → modal opens with list → open `/notifications` for full page.**
7. **Only verified buyer sees "Write a review" on `/product/p7` (Alphonso Mangoes, seeded delivered order).** Non-buyers see the info message; already-reviewed users see the acknowledgement.
8. **Dark mode toggle persists across reloads with no FOUC.**

---

## 12. Out of scope (v1)

- Rider app, admin console, inventory management.
- Real-time chat with support (currently static Help page).
- Loyalty / referral program.
- Multi-language (English only for now).
- Native mobile apps (this is a responsive web app; wrap in Capacitor if needed).
