# 📋 HỆ THỐNG THÔNG TIN QUẢN LÝ

> **Demo Project — Information Management System**

Dự án xây dựng một **Hệ thống thông tin quản lý** nhằm hỗ trợ quản lý dữ liệu, xử lý nghiệp vụ, thống kê và báo cáo trên một nền tảng tập trung.

Dự án được phát triển theo mô hình làm việc nhóm sử dụng **Git/GitHub**, trong đó mỗi thành viên đảm nhiệm một vai trò kỹ thuật riêng: **Frontend, Backend, Data, Analysis & Reporting, DevOps/QA**.

---

## 🎯 1. Mục tiêu dự án

Hệ thống hướng tới các mục tiêu:

* 🔐 Xác thực và phân quyền người dùng.
* 👤 Quản lý thông tin người dùng.
* 📦 Quản lý các đối tượng nghiệp vụ chính.
* 🗄️ Lưu trữ và quản lý dữ liệu tập trung.
* 📊 Thống kê và trực quan hóa dữ liệu.
* 📑 Xây dựng báo cáo từ dữ liệu hệ thống.
* 🔌 Cung cấp và tích hợp REST API.
* 🧪 Kiểm thử các chức năng của hệ thống.
* 🚀 Đảm bảo hệ thống có thể tích hợp và triển khai.

---

# 👥 2. Phân công thành viên

Dự án được chia thành **5 vai trò chính**.

| Member    | Branch                      | Vai trò                       | Phần phụ trách                        |
| --------- | --------------------------- | ----------------------------- | ------------------------------------- |
| **Q**     | `feature/member1-frontend`  | 🎨 Frontend Developer         | Giao diện và tương tác người dùng     |
| **H**     | `feature/member2-backend`   | ⚙️ Backend Developer          | API, authentication và business logic |
| **Thanh** | `feature/member3-data`      | 🗄️ Data / Database Developer | Database, ERD, schema và dữ liệu      |
| **Hieu**  | `feature/member4-analysis`  | 📊 Data Analysis & Reporting  | Thống kê, dashboard và báo cáo        |
| **Loan**  | `feature/member5-devops-qa` | 🧪 DevOps / QA / Integration  | Kiểm thử, tích hợp và triển khai      |

---

## 🎨 Member 1 — Frontend Developer

**Branch:**

```text
feature/member1-frontend
```

### Công việc

* Xây dựng giao diện hệ thống.
* Trang Login/Register.
* Dashboard.
* Giao diện quản lý người dùng.
* Form thêm/sửa dữ liệu.
* Bảng hiển thị dữ liệu.
* Tìm kiếm và lọc dữ liệu.
* Hiển thị biểu đồ.
* Gọi REST API từ Frontend.
* Hiển thị thông báo lỗi/thành công.
* Responsive giao diện.

### Kết quả cần đạt

Frontend có thể:

```text
User
 ↓
Web Interface
 ↓
REST API
 ↓
Backend
```

---

# ⚙️ Member 2 — Backend Developer

**Branch:**

```text
feature/member2-backend
```

### Công việc

* Xây dựng Backend Server.
* Xây dựng REST API.
* Login / Register / Logout.
* Authentication.
* Authorization.
* Phân quyền Admin/User.
* CRUD nghiệp vụ.
* Validation dữ liệu.
* Xử lý Business Logic.
* Error Handling.
* Kết nối Database.
* Cung cấp API cho Frontend.
* Cung cấp API phục vụ thống kê và báo cáo.

### Kiến trúc API dự kiến

```text
Frontend
    ↓
REST API
    ↓
Controller / Route
    ↓
Service / Business Logic
    ↓
Repository / Database
```

---

# 🗄️ Member 3 — Data / Database Developer

**Branch:**

```text
feature/member3-data
```

### Công việc

* Phân tích yêu cầu dữ liệu.
* Thiết kế ERD.
* Thiết kế Database Schema.
* Tạo bảng.
* Thiết lập Primary Key.
* Thiết lập Foreign Key.
* Xây dựng quan hệ giữa các bảng.
* Migration.
* Tạo dữ liệu mẫu.
* Viết và kiểm tra SQL Query.
* Đảm bảo tính toàn vẹn dữ liệu.
* Hỗ trợ tối ưu truy vấn.

### Mô hình dữ liệu

```text
Application
     ↓
Backend
     ↓
Database
 ┌───────────────┐
 │ Users         │
 │ Categories    │
 │ Business Data │
 │ Reports Data  │
 └───────────────┘
```

ERD của hệ thống được lưu trong thư mục:

```text
/docs/database/
```

---

# 📊 Member 4 — Data Analysis & Reporting

**Branch:**

```text
feature/member4-analysis
```

### Công việc

* Xây dựng Dashboard.
* Thống kê dữ liệu.
* Phân tích dữ liệu nghiệp vụ.
* Xây dựng biểu đồ.
* Lọc dữ liệu theo điều kiện.
* Thống kê theo thời gian.
* Thống kê theo danh mục.
* Tổng hợp dữ liệu.
* Xây dựng báo cáo.
* Export Excel/PDF nếu có.
* Chuẩn bị dữ liệu phục vụ Demo.

### Luồng xử lý

```text
Database
    ↓
Backend API
    ↓
Data Processing
    ↓
Statistics
    ↓
Dashboard / Report
```

---

# 🧪 Member 5 — DevOps / QA / Integration

**Branch:**

```text
feature/member5-devops-qa
```

### Công việc

* Quản lý Git workflow.
* Hỗ trợ tích hợp các branch.
* Review Pull Request.
* Kiểm tra Frontend – Backend.
* Kiểm tra Backend – Database.
* API Testing.
* Functional Testing.
* Integration Testing.
* Viết Test Case.
* Theo dõi và báo cáo lỗi.
* Hỗ trợ xử lý Merge Conflict.
* Kiểm tra môi trường chạy.
* Cấu hình deployment.
* Kiểm tra hệ thống trước khi Demo.

### Luồng kiểm thử

```text
Frontend
    ↓
Backend API
    ↓
Database
    ↓
Reporting
    ↓
Integration Test
    ↓
System Test
```

---

# 🏗️ 3. Kiến trúc hệ thống

Hệ thống được tổ chức theo kiến trúc nhiều tầng:

```text
┌─────────────────────────────────────┐
│              FRONTEND               │
│        Member 1 — Q                 │
│      UI / Dashboard / Forms         │
└─────────────────┬───────────────────┘
                  │
                  │ REST API
                  ↓
┌─────────────────────────────────────┐
│              BACKEND                │
│        Member 2 — H                 │
│ Authentication / API / Logic        │
└─────────────────┬───────────────────┘
                  │
                  ↓
┌─────────────────────────────────────┐
│              DATABASE               │
│       Member 3 — Thanh              │
│       Data / Schema / Query         │
└─────────────────┬───────────────────┘
                  │
                  ↓
┌─────────────────────────────────────┐
│       ANALYSIS & REPORTING          │
│        Member 4 — Hieu              │
│ Dashboard / Chart / Report          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│          DEVOPS / QA                │
│          Member 5 — Loan            │
│ Test / Integration / Deployment     │
└─────────────────────────────────────┘
```

---

# 🔄 4. Git Workflow

Dự án sử dụng mô hình:

```text
main
└── develop
    ├── feature/member1-frontend
    ├── feature/member2-backend
    ├── feature/member3-data
    ├── feature/member4-analysis
    └── feature/member5-devops-qa
```

Quy trình phát triển:

```text
Feature Branch
      ↓
Pull Request
      ↓
Code Review
      ↓
develop
      ↓
Testing
      ↓
main
```

---

# 🌿 5. Tạo Feature Branch

Trước khi bắt đầu làm việc:

```bash
git checkout develop
git pull origin develop
```

Tạo branch:

```bash
git checkout -b feature/member1-frontend
```

Ví dụ đối với các thành viên khác:

```bash
git checkout -b feature/member2-backend
git checkout -b feature/member3-data
git checkout -b feature/member4-analysis
git checkout -b feature/member5-devops-qa
```

---

# 🔄 6. Cập nhật branch

Trước khi tiếp tục phát triển:

```bash
git checkout develop
git pull origin develop
```

Sau đó quay lại branch cá nhân:

```bash
git checkout feature/member1-frontend
```

Merge code mới từ `develop`:

```bash
git merge develop
```

Nếu xảy ra conflict:

```bash
git status
```

Xử lý các file conflict, sau đó:

```bash
git add .
git commit -m "fix: resolve merge conflicts"
git push origin feature/member1-frontend
```

---

# 🚀 7. Commit & Push

Sau khi hoàn thành chức năng:

```bash
git status
git add .
git commit -m "feat: add user management interface"
git push origin feature/member1-frontend
```

Sau đó tạo **Pull Request vào `develop`**.

---

# 📝 8. Quy ước Commit

Dự án sử dụng **Conventional Commits**.

| Type       | Ý nghĩa                                     |
| ---------- | ------------------------------------------- |
| `feat`     | Thêm chức năng mới                          |
| `fix`      | Sửa lỗi                                     |
| `refactor` | Cải thiện cấu trúc code                     |
| `docs`     | Cập nhật tài liệu                           |
| `test`     | Thêm/sửa kiểm thử                           |
| `style`    | Thay đổi format/code style                  |
| `chore`    | Cấu hình, dependency hoặc công việc phụ trợ |

### Ví dụ

```bash
git commit -m "feat: add login page"
```

```bash
git commit -m "feat: implement user CRUD API"
```

```bash
git commit -m "feat: create database schema"
```

```bash
git commit -m "feat: add statistics dashboard"
```

```bash
git commit -m "test: add user API tests"
```

```bash
git commit -m "fix: fix login validation"
```

```bash
git commit -m "docs: update README"
```

---

# 🔀 9. Pull Request

Mỗi thành viên **không merge trực tiếp code vào `main`**.

Quy trình:

```text
feature/memberX-xxx
          ↓
     Pull Request
          ↓
       Review
          ↓
       develop
          ↓
     Integration
          ↓
        Testing
          ↓
         main
```

### Pull Request cần có

* Tiêu đề rõ ràng.
* Mô tả chức năng đã thực hiện.
* Danh sách các thay đổi.
* Test đã thực hiện.
* Screenshot nếu có thay đổi giao diện.
* Thông báo các thay đổi liên quan đến API/Database.

---

# ⚠️ 10. Quy tắc làm việc nhóm

### Git

* ❌ Không push trực tiếp vào `main`.
* ❌ Không tự ý push vào `develop`.
* ✅ Mỗi thành viên sử dụng branch riêng.
* ✅ Pull Request trước khi merge.
* ✅ Review code trước khi merge.
* ✅ Cập nhật `develop` trước khi làm việc.
* ✅ Commit message phải rõ ràng.

### Code

* ❌ Không tự ý xóa/sửa code quan trọng của thành viên khác.
* ✅ Tuân thủ cấu trúc project.
* ✅ Đặt tên biến, hàm và file thống nhất.
* ✅ Không commit code không sử dụng.
* ✅ Không commit thông tin bảo mật.

### Database & API

Khi thay đổi Database hoặc API dùng chung, phải thông báo cho các thành viên liên quan.

Đặc biệt:

```text
Database
    ↕
Backend
    ↕
Frontend
    ↕
Analysis
```

Mọi thay đổi lớn trong một tầng có thể ảnh hưởng đến các tầng còn lại.

---

# 🔌 11. API Contract

Frontend và Backend cần thống nhất API trước khi triển khai.

Ví dụ:

```text
GET    /api/users
GET    /api/users/{id}
POST   /api/users
PUT    /api/users/{id}
DELETE /api/users/{id}
```

Response mẫu:

```json
{
    "success": true,
    "data": [],
    "message": "Success"
}
```

Thông tin API nên được lưu tại:

```text
/docs/api/
```

hoặc:

```text
/docs/API.md
```

---

# 🧪 12. Kiểm thử

Các loại kiểm thử dự kiến:

### Unit Test

Kiểm tra từng hàm hoặc thành phần nhỏ.

```text
Function
   ↓
Unit Test
   ↓
Pass / Fail
```

### API Test

Kiểm tra REST API:

```text
Request
   ↓
API
   ↓
Response
   ↓
Validate
```

### Integration Test

Kiểm tra sự kết hợp:

```text
Frontend
   ↓
Backend
   ↓
Database
```

### System Test

Kiểm tra toàn bộ hệ thống từ đầu đến cuối.

```text
Login
 ↓
Dashboard
 ↓
CRUD
 ↓
Statistics
 ↓
Report
```

---

# 📁 13. Cấu trúc thư mục dự kiến

```text
project/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── assets/
│
├── backend/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── routes/
│   └── middleware/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema/
│
├── analysis/
│   ├── dashboard/
│   ├── reports/
│   └── charts/
│
├── tests/
│   ├── unit/
│   ├── api/
│   └── integration/
│
├── docs/
│   ├── database/
│   ├── api/
│   └── report/
│
├── .gitignore
├── README.md
└── .env.example
```

Cấu trúc thực tế có thể thay đổi tùy theo Framework và công nghệ được nhóm lựa chọn.

---

# 🔐 14. Bảo mật

Không commit các thông tin nhạy cảm lên Git:

```text
.env
password
API_KEY
SECRET_KEY
JWT_SECRET
Database password
```

Sử dụng:

```text
.env
```

để lưu cấu hình môi trường.

Tạo file mẫu:

```text
.env.example
```

Ví dụ:

```env
DATABASE_URL=
API_URL=
SECRET_KEY=
```

---

# 📚 15. Tài liệu dự án

Các tài liệu quan trọng được lưu trong thư mục:

```text
docs/
```

Dự kiến gồm:

```text
docs/
├── database/
│   └── ERD.png
│
├── api/
│   └── API.md
│
├── testing/
│   └── TEST_CASE.md
│
└── report/
    └── PROJECT_REPORT.md
```

---

# 🚀 16. Hướng dẫn chạy dự án

## Bước 1 — Clone repository

```bash
git clone <repository-url>
cd <project-folder>
```

## Bước 2 — Chuyển sang develop

```bash
git checkout develop
```

## Bước 3 — Cài đặt dependencies

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd backend
npm install
```

> Các lệnh trên có thể thay đổi tùy Framework được sử dụng.

## Bước 4 — Cấu hình môi trường

Tạo file:

```text
.env
```

từ:

```text
.env.example
```

Sau đó cấu hình Database, API và các biến môi trường cần thiết.

## Bước 5 — Khởi động Database

Thiết lập Database theo hướng dẫn trong:

```text
docs/database/
```

## Bước 6 — Chạy Backend

Ví dụ:

```bash
npm run dev
```

## Bước 7 — Chạy Frontend

Mở terminal mới:

```bash
cd frontend
npm run dev
```

## Bước 8 — Truy cập hệ thống

Frontend và Backend URL sẽ được cập nhật trong tài liệu cấu hình của dự án.

---

# 📌 17. Tiến độ phát triển

| Giai đoạn | Nội dung              | Trạng thái |
| --------- | --------------------- | ---------- |
| Phase 1   | Phân tích yêu cầu     | ⬜          |
| Phase 2   | Thiết kế Database     | ⬜          |
| Phase 3   | Thiết kế API          | ⬜          |
| Phase 4   | Phát triển Backend    | ⬜          |
| Phase 5   | Phát triển Frontend   | ⬜          |
| Phase 6   | Dashboard & Reporting | ⬜          |
| Phase 7   | Integration           | ⬜          |
| Phase 8   | Testing               | ⬜          |
| Phase 9   | Deployment            | ⬜          |
| Phase 10  | Demo & Report         | ⬜          |

---

# 🏁 18. Kết quả mong đợi

Sau khi hoàn thành, hệ thống có thể cung cấp các nhóm chức năng:

```text
┌─────────────────────────────┐
│    HỆ THỐNG QUẢN LÝ        │
└──────────────┬──────────────┘
               │
       ┌───────┴────────┐
       ↓                ↓
   Authentication    User Management
       │                │
       └───────┬────────┘
               ↓
       Business Management
               │
               ↓
          Database
               │
       ┌───────┴────────┐
       ↓                ↓
  Statistics         Reports
       │                │
       └───────┬────────┘
               ↓
          Final System
```

Hệ thống sau khi hoàn thành cần đảm bảo:

* Có giao diện sử dụng được.
* Có Backend/API hoạt động.
* Có Database lưu trữ dữ liệu.
* Có chức năng CRUD nghiệp vụ.
* Có thống kê và báo cáo.
* Có kiểm thử các chức năng chính.
* Các thành phần Frontend – Backend – Database hoạt động đồng bộ.
* Code được quản lý bằng Git theo đúng quy trình nhóm.

---

# 👨‍💻 19. Team

| Thành viên | Vai trò                       |
| ---------- | ----------------------------- |
| **Q**      | 🎨 Frontend Developer         |
| **H**      | ⚙️ Backend Developer          |
| **Thanh**  | 🗄️ Data / Database Developer |
| **Hieu**   | 📊 Data Analysis & Reporting  |
| **Loan**   | 🧪 DevOps / QA / Integration  |

---

## 📄 License

Dự án được thực hiện với mục đích **học tập và demo môn học**.
