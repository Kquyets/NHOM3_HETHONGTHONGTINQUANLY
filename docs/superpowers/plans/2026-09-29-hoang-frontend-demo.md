# Hoàng Frontend Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a read-only, responsive property and room overview with local demo data on the existing `hoang_branch`.

**Architecture:** Fast-forward `hoang_branch` to the merged backend foundation, then add a small typed demo dataset, a pure occupancy-count helper, and one server-rendered overview page. The demo stays independent of PostgreSQL and APIs.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-thanh-hoang-demo.md`

## Global Constraints

- Work on existing branch `hoang_branch`; do not create a replacement.
- Fast-forward from `origin/feature/quyet-backend` only after confirming it is a descendant.
- Use local read-only demo data; do not add API calls, CRUD flows, auth, charts, or dependencies.
- Use the property/room concepts and room states from the Thanh demo schema.
- Commit this branch's work separately.

## Review Focus

- Occupancy totals must match the room list; test counts for each status.
- Empty input should produce zero counts; test the empty case.
- Room state labels must be understandable to Vietnamese users; review all three mappings in the UI.
- The room list must remain usable on narrow screens; review the mobile CSS breakpoint.
- The page must render without database configuration; verify a clean production build with no `.env.local`.

---

### Task 1: Add typed demo data and occupancy counts

**Files:**
- Create: `src/app/demo-data.ts`
- Test: `src/app/demo-data.test.ts`

**Interfaces:**
- `DemoProperty`: `id`, `name`, `address`.
- `DemoRoom`: `id`, `propertyId`, `roomNumber`, `monthlyRent`, and status `vacant | occupied | maintenance`.
- Exports `demoProperties`, `demoRooms`, and `getRoomCounts(rooms)` returning `{ vacant, occupied, maintenance, total }`.

- [ ] Add Vitest cases for status totals and empty input; assert total equals the sum of statuses.
- [ ] Run `npm test -- src/app/demo-data.test.ts`; confirm failure before implementation.
- [ ] Add two modest property records and a few rooms, plus the pure counting helper.
- [ ] Run the focused test, `npm run lint`, `npm run typecheck`, and `npm test`.
- [ ] Commit with `feat: add property room demo data`.

### Task 2: Build the property and room overview

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Read-only page at `/` with property names, total/vacant/occupied/maintenance counts, and a room table.
- Vietnamese labels for all room states; display rent as VND.
- Mobile layout keeps the status summary and room list readable.

- [ ] Render semantic landmarks, count cards, an occupancy legend, and the room table from Task 1 data.
- [ ] Add responsive styling and page metadata; do not add client-side state or API fetches.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Review the page at desktop and mobile widths; fix any layout or readability issues.
- [ ] Commit with `feat: add property and room overview demo`.
