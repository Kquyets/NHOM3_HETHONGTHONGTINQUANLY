# Dashboard Overview Design Spec

## Goal

Provide property owners and managers with a centralized, actionable "Command Center" dashboard that displays occupancy rates, monthly revenue and collections, outstanding tenant debt, upcoming contract expirations (within 30 days), utility consumption, and quick management actions.

## Requirements

1. **Authorization & Multi-tenancy Scoping:**
   - Owners see data across all properties they own (or filtered to one selected property).
   - Managers see data only for active properties assigned to them in `property_members`.
   - Access denied (403) if a user requests a property they do not have rights to manage.

2. **Data Aggregations:**
   - **Occupancy & Rooms:**
     - Total properties, total rooms, occupied rooms (active contracts), vacant rooms, and maintenance rooms.
     - Occupancy percentage: `(occupiedRooms / totalRooms) * 100` (rounded to 1 decimal place; 0% if no rooms).
   - **Financials (Selected Month/Year):**
     - Total billed amount in period across invoices.
     - Total collected amount (sum of `paid_amount` or payments) in period.
     - Total outstanding debt across all active unpaid/partially paid invoices.
     - Count of unpaid/partially paid invoices.
     - Collection rate percentage: `(totalCollected / totalBilled) * 100`.
   - **Expiring Contracts:**
     - Active contracts ending within 30 days from the current date.
     - Includes tenant name, room number, property name, end date, and `daysRemaining`.
     - Sorted ascending by days remaining.
   - **Urgent / Unpaid Invoices:**
     - Invoices with status `issued` or `partially_paid`.
     - Flags whether it is overdue (`dueDate < today`) and calculated `daysOverdue`.
     - Sorted by most overdue first, then by remaining balance descending.
   - **Utilities:**
     - Sum of electricity consumed (kWh) and water consumed (m³) in the selected month/year.

3. **API Contract:**
   - `GET /api/dashboard?propertyId={uuid}&month={1-12}&year={YYYY}`
   - Header: `Authorization: Bearer <token>`
   - Success Response:
     ```json
     {
       "success": true,
       "data": {
         "filter": { "propertyId": null, "month": 10, "year": 2026 },
         "properties": [{ "id": "...", "name": "..." }],
         "occupancy": {
           "totalRooms": 20,
           "occupiedRooms": 17,
           "vacantRooms": 2,
           "maintenanceRooms": 1,
           "occupancyRate": 85.0
         },
         "financials": {
           "totalBilled": 45000000,
           "totalCollected": 38000000,
           "totalDebt": 7000000,
           "unpaidInvoiceCount": 3,
           "collectionRate": 84.4
         },
         "utilities": {
           "electricityKwh": 1250,
           "waterM3": 85
         },
         "expiringContracts": [
           {
             "id": "...",
             "contractNumber": "HD-101",
             "tenantName": "Nguyễn Văn A",
             "roomNumber": "101",
             "propertyName": "Nhà trọ Cầu Giấy",
             "endDate": "2026-10-15",
             "daysRemaining": 12,
             "isUrgent": false
           }
         ],
         "unpaidInvoices": [
           {
             "id": "...",
             "invoiceNumber": "HD-202610-001",
             "tenantName": "Trần Thị B",
             "roomNumber": "202",
             "propertyName": "Nhà trọ Cầu Giấy",
             "dueDate": "2026-10-05",
             "totalAmount": 3500000,
             "remainingAmount": 3500000,
             "isOverdue": false,
             "daysOverdue": 0
           }
         ]
       }
     }
     ```

4. **Frontend Experience:**
   - Dedicated clean UI on `/` (for logged-in users) and `/dashboard`.
   - Property selector dropdown and Month/Year picker.
   - Responsive KPI grid with color-coded badges and icons.
   - Actionable alert tables with direct links to contracts and invoices.
   - Dark/Light mode support.

5. **Exclusions:**
   - Real-time WebSocket streaming (polling or SWR refresh on filter change is sufficient).
   - Third-party chart heavy dependencies (use CSS/SVG animated progress bars and cards for lightweight, fast rendering).
