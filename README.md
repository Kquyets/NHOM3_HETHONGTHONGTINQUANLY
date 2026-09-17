# Hệ thống thông tin quản lý

Dự án xây dựng hệ thống thông tin quản lý, bao gồm giao diện người dùng, API, cơ sở dữ liệu, thống kê báo cáo và kiểm thử tích hợp.

## 1. Phân công thành viên

| Member | Branch                      | Role                      | Responsibilities                                        |
| ------ | --------------------------- | ------------------------- | ------------------------------------------------------- |
| Q      | `feature/member1-frontend`  | Frontend                  | UI, pages, forms, API integration                       |
| H      | `feature/member2-backend`   | Backend                   | REST API, authentication, authorization, business logic |
| Thanh  | `feature/member3-data`      | Data / Database           | ERD, database schema, queries, migrations, seed data    |
| Hieu   | `feature/member4-analysis`  | Data Analysis & Reporting | Statistics, dashboard, charts, reports, data export     |
| Loan   | `feature/member5-devops-qa` | DevOps / QA               | Testing, integration, Git workflow, deployment          |

## 2. Architecture

```text
Frontend
    |
    | REST API
    v
Backend
    |
    v
Database
    |
    v
Analysis & Reporting
```

DevOps / QA chịu trách nhiệm kiểm thử và tích hợp toàn bộ hệ thống.

## 3. Git Branching

```text
main
└── develop
    ├── feature/member1-frontend
    ├── feature/member2-backend
    ├── feature/member3-data
    ├── feature/member4-analysis
    └── feature/member5-devops-qa
```

### Workflow

Mỗi thành viên làm việc trên branch riêng:

```bash
git checkout develop
git pull origin develop

git checkout -b feature/memberX-xxx
```

Sau khi hoàn thành:

```bash
git add .
git commit -m "feat: implement feature"
git push origin feature/memberX-xxx
```

Tạo Pull Request vào `develop`.

```text
feature branch
      |
      v
Pull Request
      |
      v
develop
      |
      v
main
```

## 4. Update branch

Trước khi bắt đầu công việc hoặc trước khi tạo Pull Request:

```bash
git checkout develop
git pull origin develop

git checkout feature/memberX-xxx
git merge develop
```

Nếu xảy ra conflict:

```bash
git status
```

Sau khi xử lý conflict:

```bash
git add .
git commit -m "fix: resolve merge conflicts"
git push origin feature/memberX-xxx
```

## 5. Commit Convention

Sử dụng Conventional Commits.

| Type       | Description                 |
| ---------- | --------------------------- |
| `feat`     | New feature                 |
| `fix`      | Bug fix                     |
| `refactor` | Code restructuring          |
| `docs`     | Documentation               |
| `test`     | Tests                       |
| `style`    | Code formatting             |
| `chore`    | Configuration, dependencies |

Examples:

```bash
git commit -m "feat: add user management"
git commit -m "fix: fix login validation"
git commit -m "refactor: simplify user service"
git commit -m "test: add user API tests"
git commit -m "docs: update API documentation"
```

## 6. Team Rules

* Không push trực tiếp vào `main`.
* Không push trực tiếp vào `develop` nếu nhóm sử dụng Pull Request.
* Mỗi thành viên làm việc trên branch được phân công.
* Pull Request phải được review trước khi merge.
* Cập nhật `develop` trước khi tạo Pull Request.
* Không tự ý thay đổi hoặc xóa code thuộc phần chính của thành viên khác.
* Thay đổi Database hoặc API dùng chung phải thông báo cho các thành viên liên quan.
* Không commit thông tin nhạy cảm như password, API key hoặc file `.env`.
* Commit message phải mô tả đúng nội dung thay đổi.

## 7. API

Frontend và Backend thống nhất API trước khi triển khai.

Ví dụ:

```text
GET    /api/users
GET    /api/users/{id}
POST   /api/users
PUT    /api/users/{id}
DELETE /api/users/{id}
```

Tài liệu API được lưu tại:

```text
docs/api/
```

## 8. Database

Database được quản lý bởi Member 3.

Các thành phần chính:

* ERD
* Database schema
* Primary key / Foreign key
* Migration
* Seed data
* SQL queries

Tài liệu Database:

```text
docs/database/
```

## 9. Testing

Các loại kiểm thử:

* Unit Test
* API Test
* Integration Test
* System Test

Test case và tài liệu kiểm thử:

```text
docs/testing/
```

## 10. Project Structure

```text
project/
├── frontend/
├── backend/
├── database/
├── analysis/
├── tests/
├── docs/
│   ├── api/
│   ├── database/
│   └── testing/
├── .env.example
├── .gitignore
└── README.md
```

Cấu trúc có thể thay đổi tùy theo framework và công nghệ được sử dụng.

## 11. Development Flow

```text
Requirement
     |
     v
Database / API Design
     |
     v
Backend + Frontend Development
     |
     v
Analysis & Reporting
     |
     v
Integration
     |
     v
Testing
     |
     v
Release
```

## 12. Team

| Member | Role                      |
| ------ | ------------------------- |
| Q      | Frontend Developer        |
| H      | Backend Developer         |
| Thanh  | Data / Database Developer |
| Hieu   | Data Analysis & Reporting |
| Loan   | DevOps / QA               |

## 13. Project Status

| Phase                | Status      |
| -------------------- | ----------- |
| Requirement Analysis | In Progress |
| Database Design      | Pending     |
| Backend Development  | Pending     |
| Frontend Development | Pending     |
| Analysis & Reporting | Pending     |
| Integration          | Pending     |
| Testing              | Pending     |
| Deployment           | Pending     |
