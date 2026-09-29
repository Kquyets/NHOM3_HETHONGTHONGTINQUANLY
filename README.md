# Hệ thống Quản lý Nhà trọ Thông minh tích hợp AI Agent

Hệ thống thông tin quản lý nhà trọ dành cho chủ nhà và quản lý, hỗ trợ toàn bộ luồng nghiệp vụ từ quản lý phòng, khách thuê, hợp đồng, điện/nước, hóa đơn đến thanh toán. Có thêm AI Agent giúp chủ nhà tương tác và khai thác thông tin bằng ngôn ngữ tự nhiên.

---

## Mục lục

1. [Thành viên & Phân công](#1-thành-viên--phân-công)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Module nghiệp vụ](#3-module-nghiệp-vụ)
4. [Công nghệ sử dụng](#4-công-nghệ-sử-dụng)
5. [Database](#5-database)
6. [Backend – Phạm vi của Quyết](#6-backend--phạm-vi-của-quyết)
7. [API Contract](#7-api-contract)
8. [AI Agent](#8-ai-agent)
9. [Dashboard & Thống kê](#9-dashboard--thống-kê)
10. [Git Workflow](#10-git-workflow)
11. [Quy ước Commit](#11-quy-ước-commit)
12. [Phối hợp giữa các thành viên](#12-phối-hợp-giữa-các-thành-viên)
13. [Thứ tự triển khai](#13-thứ-tự-triển-khai)
14. [Definition of Done](#14-definition-of-done)
15. [Cách chạy project](#15-cách-chạy-project)
16. [Environment Variables](#16-environment-variables)
17. [Quy tắc quản lý Code](#17-quy-tắc-quản-lý-code)

---

## 1. Thành viên & Phân công

| Thành viên | Vai trò                   | Branch                   | Trách nhiệm chính                                                                   |
| ---------- | ------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| **Quyết**  | Backend Developer (Lead)  | `feature/quyet-backend`  | API, business logic, auth/authz, validation, error handling, tích hợp DB & AI Agent |
| Hoàng      | Frontend Developer        | `feature/hoang-frontend` | Giao diện, tích hợp API, dashboard UI                                               |
| Thanh      | Database Developer        | `feature/thanh-database` | Thiết kế ERD, schema PostgreSQL, migration, query                                   |
| Hiếu       | Data Analysis & Reporting | `feature/hieu-analysis`  | Thống kê, báo cáo, phân tích dữ liệu, biểu đồ                                      |
| Loan       | DevOps / QA / Integration | `feature/loan-devops-qa` | CI/CD, Docker, triển khai, kiểm thử tích hợp, quản lý môi trường                   |

---

## 2. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                        Người dùng                           │
│              (Chủ nhà / Quản lý / Admin)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    Cloudflare (DNS, SSL)
                           │
           ┌───────────────┴────────────────┐
           │                                │
     Vercel (Frontend)              Railway (Backend)
     Next.js App                   Next.js API
           │                                │
           │          API Calls             │
           └───────────────────────────────►│
                                            │
                             ┌──────────────┴──────────────┐
                             │                             │
                      PostgreSQL                    MongoDB Atlas
                  (Dữ liệu nghiệp vụ)        (AI log, notification log)
```

**Luồng nghiệp vụ cốt lõi:**

```
Nhà trọ → Phòng → Khách thuê → Hợp đồng → Điện/Nước → Hóa đơn → Thanh toán → Thống kê/Báo cáo
```

---

## 3. Module nghiệp vụ

### Core MVP — Phải hoàn thành trước

| # | Module                        | Mô tả                                                                  |
| - | ----------------------------- | ---------------------------------------------------------------------- |
| 1 | Authentication & Authorization | Đăng ký, đăng nhập, phân quyền theo role                              |
| 2 | Quản lý nhà trọ               | CRUD thông tin nhà trọ                                                 |
| 3 | Quản lý phòng                 | CRUD phòng, trạng thái phòng (trống / đang thuê / bảo trì)            |
| 4 | Quản lý khách thuê            | CRUD khách thuê, thông tin cá nhân, CCCD                               |
| 5 | Quản lý hợp đồng              | Tạo, gia hạn, kết thúc hợp đồng, cảnh báo sắp hết hạn                |
| 6 | Quản lý điện/nước             | Nhập chỉ số điện/nước theo tháng, tính phí                            |
| 7 | Quản lý hóa đơn               | Tạo hóa đơn tổng, theo dõi trạng thái (chưa / đã thanh toán)         |
| 8 | Quản lý thanh toán            | Ghi nhận thanh toán, lịch sử thanh toán                               |
| 9 | Dashboard / Thống kê          | Tổng quan tình trạng phòng, doanh thu, hóa đơn chưa thanh toán        |

### Advanced — Làm sau khi Core MVP hoàn thành

| #  | Module                    | Mô tả                                                      |
| -- | ------------------------- | ---------------------------------------------------------- |
| 10 | Email / Telegram          | Thông báo hóa đơn, hợp đồng sắp hết hạn                   |
| 11 | Thanh toán MoMo / VNPAY   | Tích hợp cổng thanh toán điện tử                           |
| 12 | QR thanh toán             | Tạo QR thanh toán riêng cho từng khách thuê                |
| 13 | AI Agent                  | Trợ lý ngôn ngữ tự nhiên cho chủ nhà / quản lý            |

> **Quan trọng**: Các module Advanced không phải dependency bắt buộc của Core MVP.

---

## 4. Công nghệ sử dụng

| Lớp               | Công nghệ        | Mục đích                                                  |
| ----------------- | ---------------- | --------------------------------------------------------- |
| Frontend          | Next.js          | Giao diện người dùng, Server-Side Rendering               |
| Backend / API     | Next.js API      | REST API, business logic, xử lý nghiệp vụ                |
| Database chính    | PostgreSQL       | Dữ liệu nghiệp vụ có tính quan hệ                        |
| Database phụ      | MongoDB Atlas    | AI conversation log, notification log, dữ liệu linh hoạt |
| ORM               | TODO: Chưa quyết định (Prisma / Drizzle) | Kết nối và migration PostgreSQL    |
| Auth              | TODO: Chưa quyết định (NextAuth.js / JWT) | Xác thực và phân quyền           |
| Container         | Docker           | Đóng gói ứng dụng, chuẩn hóa môi trường                  |
| Quản lý mã nguồn  | Git + GitHub     | Version control, phối hợp phát triển                     |
| Triển khai backend| Railway          | Host backend và database PostgreSQL production            |
| Triển khai frontend| Vercel          | Host frontend Next.js                                     |
| DNS / Bảo mật     | Cloudflare       | DNS, SSL/TLS, bảo vệ cơ bản                              |
| AI Model          | TODO: Chưa quyết định (Gemini API / OpenAI) | Xử lý ngôn ngữ tự nhiên cho AI Agent |
| Payment           | TODO: Chưa quyết định | MoMo / VNPAY (giai đoạn Advanced)               |
| Notification      | TODO: Chưa quyết định | Email / Telegram (giai đoạn Advanced)           |

---

## 5. Database

### Nguyên tắc phân chia dữ liệu

**PostgreSQL** lưu toàn bộ dữ liệu nghiệp vụ có tính quan hệ, cần tính nhất quán (ACID):

| Bảng (dự kiến) | Dữ liệu                                                    |
| -------------- | ---------------------------------------------------------- |
| `users`        | Tài khoản người dùng hệ thống, role                        |
| `properties`   | Thông tin nhà trọ (tên, địa chỉ, chủ nhà)                 |
| `rooms`        | Thông tin phòng (số phòng, diện tích, giá, trạng thái)    |
| `tenants`      | Thông tin khách thuê (họ tên, CCCD, SĐT, ngày sinh)       |
| `contracts`    | Hợp đồng thuê (phòng, khách, thời gian, giá)              |
| `meters`       | Chỉ số điện/nước theo tháng (kỳ, chỉ số đầu/cuối)         |
| `invoices`     | Hóa đơn tổng (phòng, tháng, tổng tiền, trạng thái)        |
| `payments`     | Lịch sử thanh toán (hóa đơn, ngày, số tiền, phương thức)  |

> Schema chi tiết (tên trường, kiểu dữ liệu, quan hệ) do **Thanh** thiết kế và thống nhất với **Quyết** trước khi triển khai.

**MongoDB Atlas** chỉ dùng cho dữ liệu thực sự phù hợp với mô hình document:

| Collection (dự kiến) | Dữ liệu                                                    |
| -------------------- | ---------------------------------------------------------- |
| `ai_conversations`   | Lịch sử hội thoại với AI Agent (session, messages)        |
| `ai_logs`            | Log hành động và tool calls của AI Agent                   |
| `notification_logs`  | Log thông báo gửi đi (email, Telegram)                    |
| `activity_logs`      | Nhật ký hoạt động hệ thống (audit log)                    |

> **Không duplicate dữ liệu nghiệp vụ PostgreSQL sang MongoDB** chỉ để sử dụng cả hai database.

---

## 6. Backend – Phạm vi của Quyết

### Phụ trách chính

- API structure và module structure
- Service layer và business logic
- Authentication (đăng ký, đăng nhập, refresh token)
- Authorization (phân quyền theo role)
- Validation đầu vào
- Error handling chuẩn hoá
- Kết nối và query PostgreSQL
- Kết nối MongoDB (cho AI log)
- Tích hợp AI Agent tools/API
- Phối hợp tích hợp với Frontend
- Phối hợp tích hợp notification/payment khi đến giai đoạn tương ứng

### Không phụ trách chính (nhưng cần phối hợp)

| Lĩnh vực                         | Người phụ trách chính |
| -------------------------------- | --------------------- |
| UI/UX, giao diện                 | Hoàng                 |
| Thiết kế database schema / ERD   | Thanh                 |
| Dashboard phân tích chuyên sâu   | Hiếu                  |
| CI/CD, deployment, QA chính      | Loan                  |

---

## 7. API Contract

### Quy ước chung

Mỗi API tuân theo format:

```
Method   : GET | POST | PATCH | DELETE
Endpoint : /api/{resource}[/{id}]
Auth     : Bearer Token (nếu cần)
Request  : JSON body hoặc query params
Response : JSON
Status   : 200 | 201 | 400 | 401 | 403 | 404 | 500
```

**Format response thành công:**

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 50 }
}
```

**Format response lỗi:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mô tả lỗi",
    "details": [ ... ]
  }
}
```

### Danh sách API theo module

| Module      | Endpoints              | Method                       | Status          |
| ----------- | ---------------------- | ---------------------------- | --------------- |
| Auth        | `/api/auth/*`          | TODO                         | Chưa triển khai |
| Property    | `/api/properties`      | TODO                         | Chưa triển khai |
| Room        | `/api/rooms`           | TODO                         | Chưa triển khai |
| Tenant      | `/api/tenants`         | TODO                         | Chưa triển khai |
| Contract    | `/api/contracts`       | TODO                         | Chưa triển khai |
| Meter       | `/api/meters`          | TODO                         | Chưa triển khai |
| Invoice     | `/api/invoices`        | TODO                         | Chưa triển khai |
| Payment     | `/api/payments`        | TODO                         | Chưa triển khai |
| Dashboard   | `/api/dashboard`       | TODO                         | Chưa triển khai |
| AI Agent    | `/api/ai/*`            | TODO                         | Chưa triển khai |
| Notification| `/api/notifications`   | TODO                         | Chưa triển khai |

> Endpoint cụ thể, request/response schema sẽ được cập nhật khi từng module được thiết kế và thống nhất với Frontend.

---

## 8. AI Agent

AI Agent là **trợ lý cho chủ nhà / quản lý**, không thay thế business logic của Backend.

### Luồng hoạt động

```
Người dùng nhập yêu cầu ngôn ngữ tự nhiên
        ↓
AI Agent nhận yêu cầu → xác định intent
        ↓
Chọn tool/function phù hợp
        ↓
Gọi Backend API (có auth)
        ↓
Nhận dữ liệu từ Backend
        ↓
Trả kết quả cho người dùng
```

### Ví dụ tương tác

| Câu hỏi của chủ nhà                            | AI Agent làm gì                         |
| ----------------------------------------------- | --------------------------------------- |
| "Phòng 203 đang ai thuê?"                       | Gọi API tra cứu tenant theo phòng       |
| "Hợp đồng phòng 203 còn bao nhiêu ngày?"        | Gọi API lấy thông tin hợp đồng         |
| "Tháng này có bao nhiêu phòng chưa thanh toán?" | Gọi API thống kê hóa đơn               |
| "Doanh thu tháng này là bao nhiêu?"             | Gọi API thống kê doanh thu             |
| "Thêm phòng 204"                                | Gọi API tạo phòng (yêu cầu xác nhận)   |

### Nguyên tắc bắt buộc

- AI Agent **không truy cập trực tiếp database**.
- Mọi thao tác đi qua **Backend API** với authentication và authorization đầy đủ.
- Các thao tác ghi dữ liệu quan trọng phải có **bước xác nhận** từ người dùng trước khi thực hiện.
- AI Agent tuân thủ **validation và business rules** của Backend.

### Tools dự kiến cấp cho AI Agent

```
TODO: Xác định danh sách tools cụ thể khi bắt đầu Phase 6
```

---

## 9. Dashboard & Thống kê

Dashboard phục vụ chủ nhà / quản lý. Các thông tin dự kiến hiển thị:

| Thông tin              | Mô tả                                         |
| ---------------------- | --------------------------------------------- |
| Tổng số phòng          | Tổng phòng trong nhà trọ                      |
| Phòng đang thuê        | Số phòng có người thuê                        |
| Phòng trống            | Số phòng chưa có người thuê                   |
| Tỷ lệ lấp đầy         | % phòng đang được thuê                        |
| Doanh thu tháng        | Tổng tiền thu được trong tháng                |
| Hóa đơn chưa thanh toán | Danh sách / số lượng hóa đơn quá hạn        |
| Hợp đồng sắp hết hạn  | Danh sách hợp đồng sắp hết hạn trong 30 ngày |
| Thống kê điện/nước     | Tiêu thụ điện/nước theo tháng                 |

> Thiết kế biểu đồ và giao diện dashboard do **Hoàng** và **Hiếu** phối hợp thực hiện. Backend cung cấp API dữ liệu tổng hợp.

---

## 10. Git Workflow

### Cấu trúc branch

```text
main          ← Phiên bản ổn định / Release
└── develop   ← Phiên bản tích hợp đang phát triển
    ├── feature/quyet-backend
    ├── feature/hoang-frontend
    ├── feature/thanh-database
    ├── feature/hieu-analysis
    └── feature/loan-devops-qa
```

| Branch                   | Mục đích                           |
| ------------------------ | ---------------------------------- |
| `main`                   | Phiên bản ổn định / Release        |
| `develop`                | Phiên bản tích hợp đang phát triển |
| `feature/quyet-backend`  | Backend                            |
| `feature/hoang-frontend` | Frontend                           |
| `feature/thanh-database` | Database                           |
| `feature/hieu-analysis`  | Phân tích & Báo cáo               |
| `feature/loan-devops-qa` | DevOps, QA, Integration            |

### Quy trình làm việc

**Bước 1: Cập nhật develop**

```bash
git checkout develop
git pull origin develop
```

**Bước 2: Chuyển sang branch cá nhân**

```bash
git checkout feature/quyet-backend
git merge develop
```

**Bước 3: Làm việc và commit**

```bash
git add .
git commit -m "feat: add room management API"
git push origin feature/quyet-backend
```

**Bước 4: Tạo Pull Request**

```text
feature/quyet-backend → develop
```

Pull Request phải được review trước khi merge.

**Quy tắc bắt buộc:**
- Không push trực tiếp vào `main`.
- Không push trực tiếp vào `develop`.
- Không tự ý merge code của thành viên khác chưa được review.
- Không thay đổi API/schema đã thống nhất mà không trao đổi.

### Xử lý conflict

```bash
git status
# Mở file conflict, xử lý đoạn <<<<<<< HEAD ... >>>>>>> develop
git add .
git commit -m "fix: resolve merge conflicts"
git push origin feature/ten-branch
```

### Pull Request template

```text
## Description
Mô tả ngắn gọn thay đổi.

## Changes
- Thêm/sửa gì

## Testing
- Đã test gì

## Related Issue
#<số>
```

---

## 11. Quy ước Commit

Sử dụng Conventional Commits:

| Prefix       | Ý nghĩa              | Ví dụ                                  |
| ------------ | -------------------- | -------------------------------------- |
| `feat:`      | Thêm chức năng mới   | `feat: add room management API`        |
| `fix:`       | Sửa lỗi              | `fix: validate tenant contract`        |
| `refactor:`  | Tái cấu trúc code    | `refactor: simplify auth middleware`   |
| `docs:`      | Cập nhật tài liệu    | `docs: update API contract`            |
| `test:`      | Thêm / sửa test      | `test: add invoice calculation test`   |
| `style:`     | Formatting           | `style: format backend code`           |
| `chore:`     | Cấu hình, dependency | `chore: update dependencies`           |

---

## 12. Phối hợp giữa các thành viên

### Backend ↔ Frontend

Trước khi Frontend gọi bất kỳ API nào, hai bên thống nhất:

- Endpoint và HTTP Method
- Request body / query params
- Response schema
- HTTP Status codes
- Authentication header
- Error format

### Backend ↔ Database

Quyết và Thanh thống nhất trước khi triển khai:

- Tên bảng, tên trường, kiểu dữ liệu
- Primary key, Foreign key
- Quan hệ giữa các bảng
- Query và index cần thiết
- Migration strategy

### Backend ↔ Data Analysis

Quyết và Hiếu thống nhất:

- Chỉ số thống kê cần tính
- Bộ lọc (theo tháng, theo nhà trọ, v.v.)
- Định dạng dữ liệu API trả về cho báo cáo

### Backend ↔ DevOps/QA

Quyết và Loan thống nhất:

- Cấu trúc environment variables
- Cách build và chạy ứng dụng
- Cấu trúc Docker
- Endpoint cần test trong integration test
- Acceptance criteria cho từng module

---

## 13. Thứ tự triển khai

### Phase 1 — Foundation

- [ ] Khởi tạo repository và branch strategy
- [ ] Cấu trúc thư mục project
- [ ] Thiết lập `.env.example`
- [ ] Thiết kế database schema (Thanh phụ trách, Quyết review)
- [ ] Authentication foundation (đăng ký, đăng nhập, JWT/session)

### Phase 2 — Core Backend

- [ ] Property API (Nhà trọ)
- [ ] Room API (Phòng)
- [ ] Tenant API (Khách thuê)
- [ ] Contract API (Hợp đồng)
- [ ] Meter API (Điện/Nước)
- [ ] Invoice API (Hóa đơn)
- [ ] Payment API (Thanh toán)

### Phase 3 — Frontend Integration

- [ ] Kết nối Frontend với Backend API
- [ ] Form và trang quản lý từng module
- [ ] Authentication flow giao diện

### Phase 4 — Dashboard & Reporting

- [ ] API thống kê tổng quan
- [ ] Doanh thu, tỷ lệ lấp đầy, hóa đơn chưa thanh toán
- [ ] Hợp đồng sắp hết hạn
- [ ] Biểu đồ và báo cáo (Hiếu phụ trách)

### Phase 5 — Notification & Payment

- [ ] Email / Telegram notification
- [ ] Tích hợp MoMo / VNPAY
- [ ] QR thanh toán

### Phase 6 — AI Agent

- [ ] Xác định intent và tools
- [ ] Tích hợp AI model
- [ ] Kết nối AI Agent với Backend API
- [ ] Read operations (tra cứu, thống kê)
- [ ] Controlled write operations (có confirmation)
- [ ] Lưu conversation log vào MongoDB

### Phase 7 — QA & Deployment

- [ ] Integration test (Loan phụ trách)
- [ ] Bug fixing
- [ ] Docker build
- [ ] Triển khai Railway (backend)
- [ ] Triển khai Vercel (frontend)
- [ ] Cấu hình Cloudflare

---

## 14. Definition of Done

Một module chỉ được xem là **hoàn thành** khi đủ tất cả điều kiện sau:

- [ ] Requirement rõ ràng, đã được thống nhất trong team
- [ ] Database schema đã được Thanh thiết kế và Quyết review
- [ ] API contract đã được thống nhất với Frontend
- [ ] Backend xử lý đúng business logic
- [ ] Validation đầu vào đầy đủ
- [ ] Error handling chuẩn hoá
- [ ] Authentication / Authorization áp dụng đúng
- [ ] Frontend tích hợp thành công
- [ ] Có test cơ bản (unit test hoặc API test)
- [ ] Code đã được review
- [ ] Đã merge vào `develop`

---

## 15. Cách chạy project

**Yêu cầu môi trường:**

```
Node.js >= 20.9
Docker Desktop
Git
npm
```

**Bước 1: Cài dependencies**

```bash
npm ci
```

**Bước 2: Tạo cấu hình local**

```bash
cp .env.example .env.local
```

Điền `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` và `DATABASE_URL` trong `.env.local`. Dùng cùng user, password và database trong cả `DATABASE_URL` lẫn ba biến `POSTGRES_*`.

**Bước 3: Khởi động PostgreSQL**

```bash
docker compose --env-file .env.local config
docker compose --env-file .env.local up -d postgres
```

Compose cấu hình health check cho PostgreSQL. Khi container ở trạng thái `healthy`, kiểm tra kết nối Drizzle:

```bash
npm run db:check
```

Khởi tạo schema Core trên PostgreSQL local (migration từ chối host bên ngoài máy local và ghi nhận lần chạy để không áp dụng lặp):

```bash
npm run db:migrate
```

Chạy API backend ở chế độ phát triển:

```bash
npm run dev
```

Các lệnh kiểm tra trước khi bàn giao:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Foundation hiện chỉ cấu hình kết nối PostgreSQL/Drizzle và định dạng response API. Chưa có bảng, migration hay endpoint nghiệp vụ; cần thống nhất schema với Thanh trước. Tích hợp Auth.js là bước riêng tiếp theo.

---

## 16. Environment Variables

Sao chép `.env.example` thành `.env.local` và điền giá trị local. Không commit `.env.local`.

```env
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DATABASE_URL=
```

Các biến xác thực, MongoDB, AI và thanh toán sẽ được bổ sung khi triển khai các phần tương ứng.

---

## 17. Quy tắc quản lý Code

**Không commit thông tin nhạy cảm:**

```
.env
.env.local
password / secret / API key / token
database credentials
```

**`.gitignore` tối thiểu:**

```gitignore
.env
.env.local
node_modules/
.next/
dist/
build/
*.log
```

**Không tự ý:**

- Xoá code của thành viên khác
- Đổi database schema mà không thông báo
- Thay đổi API đã thống nhất mà không trao đổi
- Merge code chưa được review
- Commit code không liên quan đến task
- Thêm công nghệ / framework / dependency mới mà chưa thống nhất với team
