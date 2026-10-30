# InternHub — Hệ thống đánh giá thực tập sinh (SVTT)

InternHub là web app nội bộ giúp Phòng Nhân sự, Trưởng bộ phận và Người hướng dẫn đánh giá thực tập sinh theo từng kỳ (tháng). Mỗi SVTT trong một kỳ có một **phiếu đánh giá**; phiếu đi qua các bước chấm, duyệt và chốt, sau đó có thể in.

> **Trạng thái hiện tại: prototype (dữ liệu mô phỏng).**
> Phần đăng nhập và hồ sơ người dùng dùng Firebase. Toàn bộ dữ liệu SVTT, bộ phận, kỳ đánh giá và phiếu chỉ lưu trong `localStorage` của trình duyệt (xem mục 9). Dữ liệu không đồng bộ giữa các máy hoặc trình duyệt.

---

## 1. Cấu trúc thư mục

```
Interhub/
├── index.html            Đăng nhập (tab SVTT/người dùng và tab Admin), đăng ký, quên mật khẩu
├── app.html              Ứng dụng chính: Tổng quan, Phiếu đánh giá, Phân công, Kỳ đánh giá
├── evaluation-form.html  Form chấm điểm một phiếu, gửi/duyệt/trả/chốt, khung lịch sử
├── print-ticket.html     Trang in phiếu đã chốt (mở ở tab mới)
├── admin.html            Quản lý tài khoản, bộ phận, kỳ đánh giá, SVTT (Admin và Phòng Nhân sự)
├── JS/
│   ├── demo-store.js     Kho dữ liệu mô phỏng + toàn bộ quy tắc nghiệp vụ và phân quyền
│   ├── auth.js           Đăng nhập/đăng ký/quên mật khẩu, hồ sơ người dùng (Firebase Auth)
│   ├── admin-panel.js    Giao diện trang quản trị (admin.html)
│   └── firebase-config.js  Cấu hình Firebase, tên collection, vai trò, trạng thái tài khoản
├── assets/
│   └── logo.png          Logo công ty, dùng trên phiếu in
├── data/
│   ├── firestore.rules       Security Rules cho Firestore
│   ├── firestore-schema.json Cấu trúc dữ liệu Firestore dự kiến
│   └── DEPLOYMENT_GUIDE.md   Hướng dẫn triển khai (cần cập nhật theo README này)
└── README.md
```

**File không được trang nào sử dụng** (có thể xóa an toàn sau khi kiểm tra lại):
- `JS/db.js`, `JS/ticket-manager.js`: không được import ở bất kỳ trang nào.
- `vite.config.js`: không có `package.json` và không có bước build, nên file này không có tác dụng.

Lưu ý về logo: file phải nằm đúng tại `assets/logo.png` ở thư mục gốc. Nếu thiếu, phiếu in vẫn chạy nhưng không có logo.

---

## 2. Vai trò và quyền hạn

Vai trò được lưu trong hồ sơ người dùng và có thể được Admin chỉnh trên trang quản trị.

| Vai trò | Ý nghĩa | Có thể làm |
|---|---|---|
| **Admin** | Quản trị hệ thống | Duyệt/từ chối tài khoản, đổi vai trò và bộ phận, quản lý danh mục bộ phận, kỳ đánh giá và SVTT. Đăng nhập bằng Google với email được khai báo trong `JS/auth.js` (hằng `ADMIN_EMAIL`). |
| **Phòng Nhân sự (HR)** | Đơn vị kiểm tra và chốt phiếu | Xem toàn bộ phiếu; xác nhận, trả về bổ sung, chốt, mở lại phiếu đã chốt; in phiếu đã chốt. Riêng SVTT thuộc bộ phận PNS (mã `PNS`): phân công người hướng dẫn và tự chấm. |
| **Trưởng bộ phận** | Quản lý một bộ phận | Xem phiếu của bộ phận mình; phân công người hướng dẫn hoặc tự đánh giá; duyệt phiếu do người hướng dẫn gửi; trả về người hướng dẫn; tự chấm và gửi thẳng khi phiếu do mình đánh giá. |
| **Người hướng dẫn** | Chấm phiếu được giao | Chấm điểm và viết nhận xét phần IV của phiếu được giao; gửi lên Trưởng bộ phận duyệt. |

Quy tắc phân quyền chính nằm trong hàm `permissionsFor` của `JS/demo-store.js`.

---

## 3. Đăng nhập và tài khoản

- **Người dùng thường** (Trưởng bộ phận, người hướng dẫn, HR): đăng ký bằng email và mật khẩu, tab "Người dùng" trên `index.html`. Hệ thống có chức năng quên mật khẩu.
- **Admin**: đăng nhập bằng Google, tab "Admin" trên `index.html`.
- Tài khoản phải được Admin **duyệt** (`status = approved`, `isActive = true`) mới vào được ứng dụng. Chưa duyệt thì quay về trang đăng nhập.
- Khi đăng ký, người dùng chỉ chọn được bộ phận có trong danh mục do Admin tạo.
- Cờ `SKIP_EMAIL_VERIFICATION = true` trong `JS/auth.js` đang bỏ qua xác minh email (phục vụ demo). Đặt `false` để bật lại.

---

## 4. Kỳ đánh giá, SVTT và phiếu

- **Kỳ đánh giá** được tạo theo tháng (định dạng `YYYY-MM`, ví dụ `2026-10`). Khi tạo kỳ, hệ thống sinh phiếu cho các SVTT đang hoạt động trong kỳ đó.
- **SVTT** được thêm từng người trên `admin.html` hoặc nhập hàng loạt bằng file CSV với các cột: `internId, fullName, school, department, startDate, endDate`. Khi nhập, SVTT đã có sẵn không bị ghi đè.
- **Ngày tháng**: lưu dạng `yyyy-mm-dd`, hiển thị và nhập dạng `dd/mm/yyyy`.
- **Cảnh báo SVTT sắp về**: hệ thống cảnh báo trước 14 ngày (hằng `FOLLOW_UP_DAYS`).
- **Bộ phận**: danh mục chính thức gồm 21 bộ phận (ví dụ `CT` Bếp Căn tin, `XXX` Phòng Sản xuất, `PNS` Phòng Nhân sự). Admin có thể thêm, sửa tên, hoặc xóa bộ phận không còn SVTT.

---

## 5. Hạng mục đánh giá và cách tính điểm

Phiếu có **15 hạng mục** chia thành 3 phần:

| Phần | Tên | Số hạng mục |
|---|---|---|
| I | Thái độ & Tinh thần thực tập | 5 (I.1 – I.5) |
| II | Tinh thần phối hợp | 4 (II.1 – II.4) |
| III | Chuyên môn nghiệp vụ | 6 (III.1 – III.6) |

- Mỗi hạng mục chấm từ **0 đến 10**, bước **0.5**.
- **Điểm từng phần** = trung bình các hạng mục của phần đó (hiển thị 2 chữ số thập phân).
- **Điểm cuối** = trung bình ba phần. Điểm cuối chỉ hiện khi đã chấm đủ 15 hạng mục.
- **Xếp loại**: chưa hiển thị vì thang xếp loại chưa được xác định (xem mục 10).
- Phiếu có các ô nhận xét: phần IV (người hướng dẫn), phần V (Phòng Nhân sự) và ý kiến hội đồng.

---

## 6. Luồng trạng thái phiếu

| Trạng thái | Mã | Ai đang xử lý | Bước tiếp theo |
|---|---|---|---|
| Chưa bắt đầu | `chua_bat_dau` | Người đánh giá | Chấm điểm, lưu nháp, gửi |
| Đang thực hiện | `dang_thuc_hien` | Người đánh giá | Gửi |
| Chờ Trưởng bộ phận duyệt | `cho_truong_bo_phan` | Trưởng bộ phận | Duyệt (gửi HR) hoặc trả về người hướng dẫn |
| Chờ Phòng Nhân sự xác nhận | `cho_xac_nhan` | HR | Chốt hoặc trả về bổ sung |
| Trả về bổ sung | `tra_ve` | Người đánh giá | Bổ sung và gửi lại |
| Đã chốt | `da_chot` | — | Có thể in. HR có thể mở lại (kèm lý do) |

**Ai gửi đi đâu:**
- Người hướng dẫn gửi → **Chờ Trưởng bộ phận duyệt**. Trưởng bộ phận duyệt → **Chờ Phòng Nhân sự xác nhận**.
- Trưởng bộ phận tự chấm (phiếu không giao người hướng dẫn, hoặc chính mình chấm) → gửi **thẳng** lên Phòng Nhân sự.
- Phòng Nhân sự trả về → **Trả về bổ sung**, người đánh giá nhận lại phiếu. Bắt buộc có lý do.
- Phòng Nhân sự chốt → **Đã chốt**.

Mọi thao tác đều ghi vào **lịch sử phiếu** (ai làm, lúc nào, ghi chú).

**Phân công người đánh giá:** Trưởng bộ phận vào mục "Phân công đánh giá", chọn người hướng dẫn hoặc "Trưởng bộ phận tự đánh giá", rồi bấm Lưu. Ô để trống nghĩa là chưa giao; hệ thống không cho lưu khi ô còn trống. Phiếu chưa giao hiển thị "Đang đợi giao người đánh giá".

---

## 7. Màn hình chính

**app.html**
- **Tổng quan**: số liệu theo trạng thái và danh sách cần xử lý.
- **Phiếu đánh giá**: với Phòng Nhân sự, danh sách được nhóm theo thứ tự ưu tiên: *Phòng Nhân sự đánh giá* → *Chờ Phòng Nhân sự xác nhận* → *Đang đợi Bộ phận đánh giá* → *Đã chốt*. Có thể lọc theo kỳ, bộ phận, trạng thái, người đánh giá và tìm theo tên hoặc mã.
- **Phân công đánh giá** (Trưởng bộ phận và HR): giao từng phiếu hoặc gán hàng loạt.
- **Kỳ đánh giá**: xem danh sách kỳ.
- **Báo cáo**: chưa hoàn thiện.
- **Quản lý SVTT & kỳ**: mở `admin.html` (Admin và HR).

**evaluation-form.html**: chấm điểm, nhận xét, lưu nháp, các nút gửi/duyệt/trả/chốt theo quyền, lịch sử thao tác. Nút "In phiếu" xuất hiện khi phiếu đã chốt.

**print-ticket.html**: phiếu in gồm logo, tên công ty, quốc hiệu, tiêu đề, thông tin SVTT, bảng điểm 15 hạng mục, kết quả, nhận xét và khối chữ ký. Chỉ in được phiếu đã chốt. Trong hộp thoại in, bỏ tick "Headers and footers" để không in ngày giờ và đường dẫn của trình duyệt.

---

## 8. Chạy và triển khai

Dự án là **HTML và JavaScript thuần (ES modules)**, không có bước build và không cần `npm install`.

**Chạy cục bộ:** cần một web server tĩnh, vì ES modules không chạy khi mở file trực tiếp (`file://`). Ví dụ:

```bash
python3 -m http.server 8000
# rồi mở http://localhost:8000/index.html
```

**Triển khai:** đưa toàn bộ thư mục lên một hosting tĩnh (Vercel, Firebase Hosting, Nginx…) với cấu hình không có build command. Đảm bảo `assets/logo.png` được đưa lên cùng các file khác.

**Firebase:**
- Project dùng cho Authentication và Firestore. Cấu hình web nằm trong `JS/firebase-config.js`.
- Bật phương thức đăng nhập Email/Password và Google trong Firebase Console.
- Cập nhật Security Rules bằng nội dung `data/firestore.rules`.
- `data/DEPLOYMENT_GUIDE.md` viết cho phiên bản cũ; hãy đối chiếu với README này trước khi làm theo.

---

## 9. Dữ liệu mô phỏng và giới hạn

- Kho dữ liệu mô phỏng nằm trong `localStorage`, khóa `internhub-demo-v3`. Dữ liệu dùng chung giữa các tab của **cùng một trình duyệt**, không dùng chung giữa các máy.
- Khi xóa dữ liệu trình duyệt, toàn bộ SVTT, kỳ và phiếu sẽ mất.
- Các thao tác phân quyền và trạng thái chỉ được kiểm tra ở phía client. Quy tắc thật phải được đặt ở máy chủ hoặc Firestore Rules trước khi đưa vào dùng chính thức.
- Trang đăng nhập và ứng dụng hiển thị thông báo "DỮ LIỆU MÔ PHỎNG" để nhắc điều này.

---

## 10. Các nội dung chờ xác nhận

Những điểm dưới đây chưa có quyết định nghiệp vụ, nên code đang dùng tạm:

1. **Thang xếp loại**: chưa có. Ô "Xếp loại" hiện để trống.
2. **Thang điểm**: đang dùng 0–10, bước 0.5. Cần xác nhận lại.
3. **SVTT bắt đầu hoặc kết thúc giữa tháng**: hiện vẫn tạo phiếu cho mọi SVTT trong danh sách.
4. **Phòng Nhân sự tự chấm và tự chốt phiếu PNS**: hiện được phép. Có thể cần một người duyệt khác.
5. **Thời hạn cảnh báo 14 ngày**: chưa có xác nhận chính thức.
6. **Báo cáo, nhật ký hoạt động, ghi chú tiêu chí và hạn hoàn thành**: chưa triển khai.

---

## 11. Kiểm thử

Chưa có bộ kiểm thử tự động trong repo. Khi thay đổi logic nghiệp vụ, nên kiểm tra tay các luồng sau:
- Đăng ký → Admin duyệt → đăng nhập đúng vai trò.
- Phân công → người hướng dẫn chấm và gửi → Trưởng bộ phận duyệt hoặc trả về → HR chốt.
- Trưởng bộ phận tự chấm và gửi thẳng lên HR.
- Phòng Nhân sự trả về, mở lại phiếu đã chốt, và in phiếu đã chốt.
- Nhập SVTT bằng CSV, tạo kỳ mới và kiểm tra số phiếu sinh ra.
