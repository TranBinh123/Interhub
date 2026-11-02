# InternHub — Hướng dẫn triển khai

Tài liệu này khớp với `README.md` (cấu trúc mới: `css/`, `JS/components/`, `JS/modules/`). Dự án là HTML và ES modules thuần, **không có bước build**.

## 1. Checklist

- [ ] Firebase project có Authentication (Email/Password và Google) và Firestore
- [ ] Cấu hình web trong `JS/firebase-config.js` đúng project
- [ ] Email Admin đúng ở `JS/auth.js` và `JS/state.js` (`ADMIN_EMAIL`), và trong `admin.html` (hàm `resolveRole`)
- [ ] Đã publish `data/firestore.rules`
- [ ] Upload đủ các file ở mục 3, đặc biệt `assets/logo.png`
- [ ] Thử đăng nhập từng vai trò (mục 5)

## 2. Firebase

1. Mở https://console.firebase.google.com và chọn project của bạn.
2. **Authentication → Sign-in method**: bật Email/Password và Google. Thêm tên miền triển khai vào *Authorized domains*.
3. **Firestore Database**: tạo database (chế độ production).
4. **Firestore → Rules**: dán nội dung `data/firestore.rules` và bấm **Publish**.
5. Cấu trúc dữ liệu dự kiến xem `data/firestore-schema.json`.

Hiện chỉ collection `users` (hồ sơ, trạng thái duyệt) được dùng thực tế. Kỳ, SVTT, bộ phận và phiếu nằm trong `localStorage` (xem README mục 9), nên chưa cần tạo các collection `periods`, `tickets`, `departments`.

> **Lưu ý rules:** `firestore.rules` mới nhận biết vai trò `hr`. Ứng dụng đã có thêm vai trò `committee` (Tổ Công tác sinh viên). Cần bổ sung trước khi chuyển phiếu lên Firestore.

## 3. Các file cần đưa lên hosting

```
index.html  app.html  admin.html  evaluation-form.html  print-ticket.html
css/app.css
JS/            (toàn bộ, gồm components/ và modules/)
assets/        (logo.png, cablecar.jpg)
```

`data/` và `README.md` là tài liệu, không bắt buộc phải đưa lên máy chủ.

## 4. Cách triển khai

**Chạy cục bộ**

```bash
cd Interhub
python3 -m http.server 8000
# http://localhost:8000/index.html
```

**Firebase Hosting**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # public directory: thư mục Interhub, không cấu hình SPA rewrite
firebase deploy
```

**Hosting tĩnh khác (Vercel, Nginx, Apache)**: đưa thư mục lên, không đặt build command. Đảm bảo máy chủ trả đúng `Content-Type: text/javascript` cho file `.js` (bắt buộc với ES modules).

## 5. Kiểm tra sau triển khai

| Vai trò | Kiểm tra |
|---|---|
| Admin | Đăng nhập Google → vào `admin.html` → duyệt tài khoản, gán vai trò và bộ phận |
| Phòng Nhân sự | Thấy Tổng quan, Phiếu, Phân công, Thực tập sinh, Chấm công, Báo cáo; mở được `admin.html`; mở lại phiếu đã chốt |
| Trưởng bộ phận | Chỉ thấy phiếu bộ phận mình; phân công, duyệt/trả về, tự chấm |
| Người hướng dẫn | Chỉ thấy phiếu được giao; chấm điểm, chấm công, gửi |
| Tổ CTSV | Chỉ thấy phiếu được giao theo Trường; chấm điểm Tổ, trả về, chốt |

In thử một phiếu đã chốt: logo hiển thị, bỏ tick "Headers and footers" trong hộp thoại in.

## 6. Bảo mật

- Phân quyền nghiệp vụ hiện chỉ kiểm tra ở client; không dùng cho dữ liệu thật trước khi có Firestore Rules/máy chủ tương ứng.
- `apiKey` Firebase là khóa công khai theo thiết kế của Firebase; bảo vệ dữ liệu bằng Security Rules và danh sách *Authorized domains*.
- Đặt `SKIP_EMAIL_VERIFICATION = false` trong `JS/auth.js` khi dùng thật.
- Không đưa tài khoản và mật khẩu thử nghiệm vào mã nguồn.

## 7. Xử lý sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| Trang trắng, console báo lỗi `import`/CORS | Đang mở bằng `file://`. Chạy qua web server tĩnh |
| `Missing or insufficient permissions` | Chưa publish `firestore.rules`, hoặc tài khoản chưa được duyệt |
| Đăng nhập xong quay lại `index.html` | Tài khoản chưa `approved` hoặc `isActive = false`; nhờ Admin duyệt |
| Admin không thấy danh sách tài khoản | Email không trùng `ADMIN_EMAIL`, hoặc rules chưa cho phép đọc `users` |
| Phiếu in không có logo | Thiếu `assets/logo.png` |
| Mất dữ liệu SVTT/kỳ/phiếu | Đã xóa dữ liệu trình duyệt (dữ liệu mô phỏng nằm trong `localStorage`) |
| Dữ liệu khác nhau giữa các máy | Đúng như thiết kế của bản mô phỏng |
