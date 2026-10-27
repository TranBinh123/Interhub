# InternHub - Hướng dẫn triển khai

## 📋 Checklist triển khai

### 1. Firebase Setup ✅
- [x] Firebase project tạo
- [x] Google Sign-in cấu hình
- [x] Firestore database tạo
- [ ] **Cập nhật Security Rules** ← Làm ngay

### 2. Cập nhật Firestore Security Rules

#### Bước 1: Mở Firebase Console
1. Truy cập: https://console.firebase.google.com
2. Chọn project `bnc-interhub`
3. Vào **Firestore Database**

#### Bước 2: Cập nhật Rules
1. Tab **Rules** (bên phải)
2. Copy toàn bộ nội dung từ file `firestore.rules`
3. Dán vào Firebase Console
4. Click **Publish** để lưu

#### Bước 3: Kiểm tra
```
✓ Rules được publish thành công
✓ Không có lỗi validation
```

### 3. Collection Setup

Kiểm tra các collection đã tạo trong Firestore:
- [ ] `users` - Người dùng đã đăng ký
- [ ] `tickets` - Phiếu đánh giá
- [ ] `periods` - Kỳ đánh giá
- [ ] `departments` - Bộ phận
- [ ] `evaluation_items` - 15 tiêu chí
- [ ] `activity_logs` - Lịch sử thao tác

### 4. Khởi tạo dữ liệu

#### Departments
Tạo các bộ phận trong Firestore:
```json
{
  "id": "HR",
  "name": "Nhân sự & Đào tạo",
  "manager": "uid_của_manager"
}
{
  "id": "IT",
  "name": "Công nghệ Thông tin",
  "manager": "uid_của_manager"
}
// ... thêm các bộ phận khác
```

#### Periods
Tạo kỳ đánh giá:
```json
{
  "id": "EV-2026-10",
  "name": "Tháng 10 năm 2026",
  "status": "Đang mở",
  "dueDate": "2026-11-10",
  "createdAt": "2026-10-27"
}
```

#### Evaluation Items
Đã có trong `ticket-manager.js`, có thể import tự động khi cần.

### 5. Người dùng Test

#### Tài khoản Admin (Bean)
- Email: `dptbinh193@gmail.com`
- Role: `admin`
- Status: `approved`

#### Tài khoản HR Test
- Email: `hr@sunworld.vn` (tạo mới)
- Role: `hr`
- Status: `approved`
- Department: `HR`

#### Tài khoản Supervisor Test
- Email: `supervisor@sunworld.vn` (tạo mới)
- Role: `supervisor`
- Status: `approved`
- Department: `IT`

### 6. Cấu hình Deployment

#### Option 1: Firebase Hosting (Recommended)
```bash
# 1. Cài đặt Firebase CLI
npm install -g firebase-tools

# 2. Login Firebase
firebase login

# 3. Initialize project
firebase init hosting

# 4. Deploy
firebase deploy
```

#### Option 2: Static hosting (Apache, Nginx)
```bash
# Copy các file sau lên server:
# - index.html
# - app.html
# - admin.html
# - evaluation-form.html
# - JS/
# - assets/ (nếu có)
```

### 7. Kiểm tra bảo mật

#### Admin có thể:
- ✅ Xem tất cả users
- ✅ Phê duyệt/từ chối users
- ✅ Gán vai trò
- ✅ Xem tất cả tickets
- ✅ Tạo/sửa/xóa periods

#### HR có thể:
- ✅ Xem tất cả tickets
- ✅ Finalize (chốt) tickets
- ✅ Ghi nhận xét Phần V
- ❌ Không sửa được scores của người khác

#### Supervisor có thể:
- ✅ Xem tickets bộ phận mình
- ✅ Ghi nhận xét Phần IV
- ❌ Không xem bộ phận khác
- ❌ Không finalize

### 8. Các file cần phát hành

```
Interhub-main/
├── index.html              # Login page
├── admin.html              # Admin dashboard
├── app.html                # Main app (HR/Supervisor)
├── evaluation-form.html    # Evaluation scoring
├── JS/
│   ├── firebase-config.js
│   ├── auth.js
│   ├── db.js
│   ├── admin-panel.js
│   └── ticket-manager.js
├── data/
│   ├── firestore-schema.json
│   ├── firestore.rules     # ← Cập nhật vào Firebase
│   └── DEPLOYMENT_GUIDE.md
└── assets/                 # (nếu có)
```

## 🔐 Security Best Practices

1. **Never hardcode credentials** ✅ Config từ Firebase CDN
2. **Always validate input** ✅ Check scores 1-5, dates, etc.
3. **Check auth state** ✅ Redirect nếu not logged in
4. **Approve users first** ✅ Pending → Approved workflow
5. **Audit trail** ✅ activity_logs collection ghi lại mọi thao tác

## ⚠️ Known Limitations

1. Admin account hiện dùng hardcoded email (`dptbinh193@gmail.com`)
   - Thay đổi trong `JS/auth.js` nếu cần
   - Production: Dùng Firebase Admin SDK

2. Password tạm thời (hardcoded)
   - Sau: Dùng custom claims + backend validation

3. Không có rate limiting
   - Add sau nếu cần chống abuse

## 📞 Troubleshooting

### Lỗi: "Permission denied" khi access Firestore
- ❌ Rules chưa được publish
- ✅ Check rules syntax
- ✅ Verify user được approved

### Lỗi: Không tải được dữ liệu
- ❌ Collection không tồn tại
- ❌ User không có quyền read
- ✅ Check Firestore > Data tab

### Lỗi: Không redirect được sang app.html
- ❌ User status không phải "approved"
- ❌ Vai trò không đúng
- ✅ Check redirectToApp() logic

## 🎉 Next Steps

1. ✅ Cập nhật Firestore Rules
2. ⬜ Tạo/import test data
3. ⬜ Test từng vai trò
4. ⬜ Demo cho team
5. ⬜ Go live!
