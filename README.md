DEMO — Hệ thống thông tin quản lý
👥 Phân công thành viên
Member	Branch	Phần phụ trách	Công việc chính
Member 1: Q	feature/member1-auth	🔐 Đăng nhập & phân quyền	Login, logout, register, session/JWT, phân quyền Admin/User
Member 2: H	feature/member2-user	👤 Quản lý người dùng	CRUD người dùng, hồ sơ, tìm kiếm, cập nhật/xóa
Member 3: Thanh	feature/member3-business	📦 Module nghiệp vụ chính	CRUD đối tượng chính của hệ thống, validation, database
Member 4: Hieu	feature/member4-report	📊 Thống kê & báo cáo	Dashboard, biểu đồ, thống kê, lọc dữ liệu, export
Member 5: Loan	feature/member5-admin	⚙️ Quản trị & tích hợp	Quản lý danh mục/cấu hình, API integration, kiểm thử và hỗ trợ tích hợp
🌿 Git Branch
main
└── develop
    ├── feature/member1-auth
    ├── feature/member2-user
    ├── feature/member3-business
    ├── feature/member4-report
    └── feature/member5-admin

Quy trình làm việc

Mỗi thành viên làm việc trên branch riêng:

git checkout develop
git pull origin develop

git checkout -b feature/member1-auth


Sau khi hoàn thành công việc:

git add .
git commit -m "feat: implement authentication"
git push origin feature/member1-auth


Sau đó tạo Pull Request vào branch develop.

feature/memberX-xxx
        ↓
     develop
        ↓
       main

📝 Quy ước Commit

Sử dụng Conventional Commits:

feat: thêm chức năng mới
fix: sửa lỗi
refactor: tối ưu/cải thiện code
docs: cập nhật tài liệu
test: thêm hoặc sửa test
style: thay đổi format/code style
chore: công việc cấu hình, dependency


Ví dụ:

git commit -m "feat: add user management"
git commit -m "fix: fix login validation"
git commit -m "docs: update README"

⚠️ Quy tắc làm việc nhóm
Không push trực tiếp vào main.
Không push trực tiếp vào develop nếu nhóm thống nhất làm việc qua Pull Request.
Mỗi member chỉ làm việc trên branch được phân công.
Trước khi tạo Pull Request, cần cập nhật code mới nhất từ develop.
Pull Request cần được review trước khi merge.
Không tự ý thay đổi/xóa code thuộc module của member khác.
Khi thay đổi database hoặc API dùng chung, cần thông báo cho các thành viên liên quan.
Commit message phải rõ ràng, mô tả đúng nội dung thay đổi.
🔄 Cập nhật branch trước khi làm việc
git checkout develop
git pull origin develop

git checkout feature/memberX-xxx
git merge develop


Nếu xảy ra conflict, xử lý conflict rồi:

git add .
git commit -m "fix: resolve merge conflicts"
git push origin feature/memberX-xxx

🚀 Mục tiêu dự án

Xây dựng Hệ thống thông tin quản lý với các chức năng chính:

🔐 Xác thực và phân quyền người dùng.
👤 Quản lý người dùng.
📦 Quản lý nghiệp vụ chính của hệ thống.
📊 Thống kê và báo cáo.
⚙️ Quản trị hệ thống và tích hợp API.
🧪 Kiểm thử và đảm bảo chất lượng hệ thống.
