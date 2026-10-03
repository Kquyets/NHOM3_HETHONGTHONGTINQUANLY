# Dashboard Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive, actionable Dashboard Overview for landlords and property managers showing occupancy rates, revenue/collection metrics, unpaid debt, upcoming contract expirations (30 days), and utility consumption.

**Architecture:** A dedicated `dashboard.service.ts` aggregates data across properties, rooms, contracts, invoices, and meter readings with strict role-based access control. An App Router endpoint `GET /api/dashboard` exposes filtered summary data. A modern, clean frontend view provides metric cards, visual progress indicators, and actionable alerts.

**Tech Stack:** Next.js App Router (TypeScript), Drizzle ORM / PostgreSQL, Vitest, Motion, Phosphor Icons.

**Spec:** `docs/superpowers/specs/2026-10-03-dashboard-overview-design.md`

## Global Constraints

- Do not introduce heavy third-party charting libraries; use clean CSS/SVG and Motion components.
- Scoping rule: Owners only access properties they own; managers only access properties they are actively assigned to; unauthorized property access must return 403 Forbidden.
- Handle zero division gracefully (occupancy rate = 0% when no rooms exist; collection rate = 100% when total billed is 0).
- Keep API responses consistent with `{ success: true, data: { ... } }` and centralized error handling.
- Preserve all existing tests and passing state (all Vitest suites must pass).

## Review Focus

- Empty state: User with zero properties or zero rooms must see a clean, informative zero-data state without crashes or NaN values. Tested in Task 1.
- Role boundaries: Manager attempting to filter by an unassigned property must receive `FORBIDDEN` error. Tested in Task 1.
- Expiring contracts filter: Contracts ended in the past or ending after 30 days must be excluded; only active contracts with `0 <= daysRemaining <= 30` should be listed. Tested in Task 1.
- Overdue computation: Invoices with `dueDate < today` must have `isOverdue: true` and positive `daysOverdue`. Tested in Task 1.
- Unauthenticated requests: Calling `/api/dashboard` without a valid token must return 401 Unauthorized. Tested in Task 2.

---

### Task 1: Implement Dashboard Service and Unit Tests

**Files:**
- Create: `src/modules/dashboard/dashboard.service.ts`
- Create: `src/modules/dashboard/dashboard.service.test.ts`

- [ ] Define types for `DashboardSummary`, `OccupancyStats`, `FinancialStats`, `UtilityStats`, `ExpiringContractItem`, `UnpaidInvoiceItem`, and `DashboardFilter`.
- [ ] Implement `getDashboardSummary({ userId, role, propertyId?, month?, year? })`:
  - Verify access rights to `propertyId` if provided; retrieve list of accessible properties.
  - Calculate room counts: total, occupied (active contracts), vacant, maintenance, and `occupancyRate`.
  - Calculate financial metrics for selected month/year: `totalBilled`, `totalCollected`, `totalDebt`, `unpaidInvoiceCount`, and `collectionRate`.
  - Calculate utility consumption for selected month/year: `electricityKwh`, `waterM3`.
  - Collect urgent lists: contracts expiring in <= 30 days, unpaid/partially paid invoices with overdue flags.
- [ ] Write unit tests in `src/modules/dashboard/dashboard.service.test.ts` verifying all metric calculations, zero-case handling, 30-day contract filtering, and access control scoping.
- [ ] Run `npm run test` and verify all tests pass.
- [ ] Git commit: `feat(dashboard): implement dashboard summary service with comprehensive calculations and tests`.

---

### Task 2: Create Dashboard API Route

**Files:**
- Create: `src/app/api/dashboard/route.ts`

- [ ] Implement `GET /api/dashboard`:
  - Extract and verify Bearer JWT token from `Authorization` header.
  - Parse query parameters: `propertyId` (UUID string), `month` (1-12 integer), `year` (2000-2100 integer). Defaults to current month & year if omitted.
  - Call `dashboardService.getDashboardSummary(...)`.
  - Return `{ success: true, data: summary }`.
  - Catch and format errors via `api-response` standard.
- [ ] Run `npm run typecheck` and `npm run test`.
- [ ] Git commit: `feat(dashboard): add GET /api/dashboard endpoint with auth and filter query params`.

---

### Task 3: Build Frontend Dashboard UI and Integration

**Files:**
- Create: `src/components/dashboard/dashboard-view.tsx`
- Create: `src/app/dashboard/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/layout/app-header.tsx`

- [ ] Build `DashboardView` component:
  - Top filter bar: Property selector dropdown (`Tất cả nhà trọ` or specific property), Month/Year selector, refresh button.
  - Metric cards row: Occupancy Rate, Monthly Billed & Collected, Outstanding Debt, Expiring Contracts, Utility consumption.
  - Visual breakdown: Room occupancy status bar (Occupied, Vacant, Maintenance) and Collection progress bar.
  - Two actionable panels:
    - **Hóa đơn cần thu / Quá hạn**: Table with room number, tenant name, amount, due date, overdue badges, action link to `/invoices`.
    - **Hợp đồng sắp hết hạn (30 ngày)**: Table with room number, tenant name, end date, days remaining badge (`< 7 ngày` red, `< 30 ngày` yellow), action link to `/contracts`.
  - Quick navigation shortcuts to manage rooms, tenants, contracts, meters, and invoices.
- [ ] Connect `src/app/dashboard/page.tsx` to render `DashboardView`.
- [ ] Update `src/app/page.tsx` so logged-in users get `DashboardView`, while guests get `LandingPage`.
- [ ] Update `src/components/layout/app-header.tsx` to ensure `Tổng quan` correctly points to `/` or `/dashboard` and reflects active state.
- [ ] Verify responsive styling, dark/light mode compatibility, and zero-data states.
- [ ] Git commit: `feat(dashboard): build modern dashboard overview page with metrics and actionable alerts`.

---

### Task 4: System Verification, Final Tests, and Git Push

- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test` (all test suites must pass).
- [ ] Run `npm run build` (Next.js production build must succeed).
- [ ] Ensure all working directory changes are cleanly committed.
- [ ] Push commits to `origin/main`.
