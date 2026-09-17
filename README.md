# Hệ thống thông tin quản lý

Dự án xây dựng hệ thống thông tin quản lý, bao gồm giao diện người dùng, API, cơ sở dữ liệu, thống kê báo cáo và kiểm thử tích hợp.

## 1. Thành viên và phân công

| Thành viên | Vai trò                   | Branch                   | Trách nhiệm chính                                             |
| ---------- | ------------------------- | ------------------------ | ------------------------------------------------------------- |
| Quyet      | Backend Developer         | `feature/quyet-backend`  | Xây dựng API, xử lý nghiệp vụ, xác thực và phân quyền         |
| Hoang      | Frontend Developer        | `feature/hoang-frontend` | Xây dựng giao diện và tích hợp API                            |
| Thanh      | Database Developer        | `feature/thanh-database` | Thiết kế, xây dựng và quản lý cơ sở dữ liệu                   |
| Hieu       | Data Analysis & Reporting | `feature/hieu-analysis`  | Phân tích dữ liệu, thống kê và xây dựng báo cáo               |
| Loan       | DevOps / QA / Integration | `feature/loan-devops-qa` | Tích hợp hệ thống, kiểm thử, quản lý môi trường và triển khai |

## 2. Cấu trúc Git

```text
main
└── develop
    ├── feature/quyet-backend
    ├── feature/hoang-frontend
    ├── feature/thanh-database
    ├── feature/hieu-analysis
    └── feature/loan-devops-qa
```

### Nguyên tắc

```text
Feature Branch
      ↓
Pull Request
      ↓
develop
      ↓
main
```

* Không push trực tiếp vào `main`.
* Không push trực tiếp vào `develop` nếu nhóm sử dụng Pull Request.
* Mỗi thành viên làm việc trên branch được phân công.
* Pull Request cần được kiểm tra trước khi merge.
* Trước khi tạo Pull Request, cần cập nhật branch với `develop`.

## 3. Quy trình làm việc

### Bước 1: Cập nhật `develop`

```bash
git checkout develop
git pull origin develop
```

### Bước 2: Chuyển sang branch cá nhân

Ví dụ Quyet:

```bash
git checkout feature/quyet-backend
```

### Bước 3: Thực hiện công việc

Sau khi hoàn thành một phần công việc:

```bash
git status
git add .
git commit -m "feat: implement user API"
git push origin feature/quyet-backend
```

### Bước 4: Cập nhật branch trước khi tạo Pull Request

```bash
git checkout develop
git pull origin develop

git checkout feature/quyet-backend
git merge develop
```

Nếu không có conflict:

```bash
git push origin feature/quyet-backend
```

Sau đó tạo Pull Request:

```text
feature/quyet-backend → develop
```

## 4. Quy ước Commit

Sử dụng Conventional Commits:

| Prefix     | Ý nghĩa              | Ví dụ                             |
| ---------- | -------------------- | --------------------------------- |
| `feat`     | Thêm chức năng       | `feat: add user API`              |
| `fix`      | Sửa lỗi              | `fix: fix login validation`       |
| `refactor` | Tái cấu trúc code    | `refactor: simplify auth service` |
| `docs`     | Cập nhật tài liệu    | `docs: update API documentation`  |
| `test`     | Thêm/sửa test        | `test: add login test cases`      |
| `style`    | Formatting           | `style: format backend code`      |
| `chore`    | Cấu hình, dependency | `chore: update dependencies`      |

## 5. Phân công kỹ thuật

### Quyet – Backend

* Xây dựng Backend.
* Thiết kế và triển khai REST API.
* Xử lý business logic.
* Xây dựng authentication và authorization.
* Xử lý validation và error handling.
* Kết nối Backend với Database.
* Hỗ trợ Frontend trong quá trình tích hợp API.

### Hoang – Frontend

* Xây dựng giao diện người dùng.
* Xây dựng các màn hình đăng nhập và quản lý.
* Xây dựng dashboard.
* Kết nối Frontend với Backend API.
* Xử lý dữ liệu nhận từ API.
* Kiểm tra giao diện và luồng sử dụng.

### Thanh – Database

* Phân tích dữ liệu cần lưu trữ.
* Thiết kế ERD.
* Xây dựng Database Schema.
* Tạo bảng và các quan hệ.
* Xây dựng các truy vấn cần thiết.
* Quản lý dữ liệu mẫu.
* Hỗ trợ Backend trong việc truy xuất dữ liệu.

### Hieu – Data Analysis & Reporting

* Chuẩn bị dữ liệu phục vụ phân tích.
* Xây dựng các thống kê cần thiết.
* Phân tích dữ liệu.
* Xây dựng biểu đồ và báo cáo.
* Phối hợp với Backend để lấy dữ liệu báo cáo.
* Kiểm tra tính chính xác của kết quả thống kê.

### Loan – DevOps / QA / Integration

* Quản lý cấu hình môi trường phát triển.
* Hỗ trợ tích hợp các thành phần hệ thống.
* Xây dựng kế hoạch kiểm thử.
* Thực hiện Functional Testing.
* Thực hiện API Testing và Integration Testing.
* Theo dõi và quản lý lỗi.
* Hỗ trợ triển khai và chuẩn bị bản Release.

## 6. Nguyên tắc phối hợp

### Backend – Frontend

Quyet chịu trách nhiệm API, Hoang chịu trách nhiệm giao diện.

Hai bên thống nhất trước về:

* Endpoint.
* HTTP Method.
* Request.
* Response.
* HTTP Status Code.
* Authentication.
* Cấu trúc dữ liệu.

### Backend – Database

Quyet và Thanh thống nhất:

* Database Schema.
* Tên bảng.
* Tên trường.
* Kiểu dữ liệu.
* Primary Key.
* Foreign Key.
* Quan hệ giữa các bảng.
* Các query/API cần thiết.

### Data Analysis – Backend

Hieu phối hợp với Quyet để xác định:

* Dữ liệu cần lấy.
* Bộ lọc.
* Chỉ số thống kê.
* Định dạng dữ liệu trả về.
* API phục vụ báo cáo.

### Integration – QA

Loan phối hợp với tất cả thành viên để:

* Kiểm tra các module sau khi tích hợp.
* Phát hiện lỗi.
* Theo dõi trạng thái xử lý lỗi.
* Kiểm tra lại sau khi fix.
* Xác nhận phiên bản trước khi Release.

## 7. Quy tắc quản lý Code

Không commit các thông tin nhạy cảm:

```text
.env
password
API key
token
secret
database credentials
```

Nên sử dụng `.gitignore`:

```gitignore
.env
__pycache__/
*.pyc
node_modules/
venv/
.venv/
dist/
build/
```

Không tự ý:

* Xóa code của thành viên khác.
* Đổi cấu trúc Database mà không thông báo.
* Thay đổi API đã thống nhất mà không trao đổi.
* Merge code chưa được kiểm tra.
* Commit code không liên quan đến task.

## 8. Quy trình xử lý Conflict

Khi xảy ra conflict:

```bash
git status
```

Mở các file bị conflict và xử lý các đoạn:

```text
<<<<<<< HEAD
code hiện tại
=======
code từ develop
>>>>>>> develop
```

Sau khi xử lý:

```bash
git add .
git commit -m "fix: resolve merge conflicts"
git push origin feature/ten-branch
```

## 9. Cấu trúc Pull Request

Tên Pull Request nên thể hiện rõ nội dung thay đổi.

Ví dụ:

```text
feat: implement user management API
```

Nội dung Pull Request:

```text
## Description
Mô tả ngắn gọn thay đổi.

## Changes
- Thêm API quản lý người dùng
- Thêm validation
- Thêm error handling

## Testing
- Test API GET
- Test API POST
- Test API PUT
- Test API DELETE

## Related Issue
#12
```

## 10. Quy trình phát triển tổng thể

```text
Requirements
     ↓
System Design
     ↓
Database Design
     ↓
Backend API
     ↓
Frontend
     ↓
Data Analysis & Reporting
     ↓
Integration
     ↓
Testing
     ↓
Deployment
     ↓
Release
```

## 11. Mục tiêu Branch

| Branch                   | Mục đích                      |
| ------------------------ | ----------------------------- |
| `main`                   | Phiên bản ổn định / Release   |
| `develop`                | Phiên bản phát triển tích hợp |
| `feature/quyet-backend`  | Phát triển Backend            |
| `feature/hoang-frontend` | Phát triển Frontend           |
| `feature/thanh-database` | Phát triển Database           |
| `feature/hieu-analysis`  | Phân tích dữ liệu và báo cáo  |
| `feature/loan-devops-qa` | DevOps, Integration và QA     |

## 12. Quy trình hoàn thành Task

```text
Nhận Task
   ↓
Cập nhật develop
   ↓
Làm việc trên Feature Branch
   ↓
Commit
   ↓
Push
   ↓
Pull Request
   ↓
Code Review
   ↓
Merge vào develop
   ↓
Integration Test
   ↓
Release vào main
```
