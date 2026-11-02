# InternHub — Hệ thống đánh giá thực tập sinh (SVTT)

InternHub là web app nội bộ giúp Phòng Nhân sự, Trưởng bộ phận, Người hướng dẫn và Tổ Công tác sinh viên đánh giá thực tập sinh theo từng kỳ (tháng). Mỗi SVTT trong một kỳ có một **phiếu đánh giá**; phiếu đi qua các bước chấm, duyệt và chốt, sau đó có thể in.

> **Trạng thái hiện tại: prototype (dữ liệu mô phỏng).** Đăng nhập và hồ sơ người dùng dùng Firebase. Dữ liệu SVTT, bộ phận, kỳ và phiếu chỉ lưu trong `localStorage` của trình duyệt (xem mục 9) và không đồng bộ giữa các máy.

---

## 1. Cấu trúc thư mục

```
Interhub/
├── index.html              Đăng nhập (tab người dùng / tab Admin), đăng ký, quên mật khẩu
├── app.html                Ứng dụng chính (HTML mỏng): Tổng quan, Phiếu, Phân công, Thực tập sinh,
│                           Chấm công, Kỳ đánh giá, Báo cáo
├── admin.html              Quản trị: tài khoản, SVTT, theo dõi, kỳ, bộ phận (Admin và Phòng Nhân sự)
├── evaluation-form.html    Form chấm điểm một phiếu, chấm công, gửi/duyệt/trả/chốt, lịch sử
├── print-ticket.html       Phiếu in đã chốt (mở ở tab mới)
├── css/
│   └── app.css             Giao diện của app.html
├── JS/
│   ├── firebase-config.js  Cấu hình Firebase, tên collection, vai trò, trạng thái tài khoản
│   ├── auth.js             Đăng nhập/đăng ký/quên mật khẩu, hồ sơ người dùng (Firebase Auth)
│   ├── db.js               Tầng truy cập dữ liệu: mọi module lấy dữ liệu qua file này
│   ├── demo-store.js       Kho dữ liệu mô phỏng + toàn bộ quy tắc nghiệp vụ và phân quyền
│   ├── state.js            Trạng thái dùng chung (state cho app, admin cho trang quản trị) + hằng số
│   ├── utils.js            Tiện ích: escape HTML, định dạng ngày/điểm, tùy chọn kỳ/bộ phận, tải CSV
│   ├── layout.js           Khung giao diện: khởi tạo app.html, chuyển view, khung trang quản trị
│   ├── components/
│   │   ├── sidebar.js      Thanh bên, hiển thị mục theo vai trò, đăng xuất
│   │   ├── topbar.js       Tiêu đề trang, lời chào, khối người dùng
│   │   └── messages.js     Thông báo, banner dữ liệu mô phỏng, loading
│   └── modules/
│       ├── dashboard.js    Tổng quan (app) và tổng quan quản trị + tài khoản (admin)
│       ├── evaluations.js  Danh sách phiếu, bộ lọc, nhóm theo trạng thái, in hàng loạt
│       ├── assignments.js  Phân công người đánh giá và Tổ Công tác sinh viên
│       ├── periods.js      Kỳ đánh giá (app) và quản lý kỳ (admin)
│       ├── interns.js      Danh sách SVTT (app); SVTT, theo dõi sắp về, bộ phận, nhập CSV (admin)
│       ├── timesheet.js    Chấm công tổng hợp theo kỳ
│       └── reports.js      Báo cáo theo kỳ/bộ phận, xuất CSV
├── assets/
│   └── logo.png            Logo công ty, dùng trên phiếu in
├── data/
│   ├── firestore.rules         Security Rules cho Firestore
│   ├── firestore-schema.json   Cấu trúc dữ liệu Firestore dự kiến
│   └── DEPLOYMENT_GUIDE.md     Hướng dẫn triển khai
└── README.md
```

**Quy ước phụ thuộc:** `app.html` và `admin.html` chỉ nạp `JS/layout.js`. Các module lấy dữ liệu qua `JS/db.js` (không import trực tiếp `demo-store.js`). Các module và `layout.js` gọi lẫn nhau theo hàm nên có import vòng; điều này hợp lệ với ES modules vì chỉ dùng khi chạy, không dùng lúc nạp.

**Thay đổi so với bản trước:**
- `JS/admin-panel.js` đã được tách vào `layout.js` (khung, điều phối), `modules/dashboard.js` (tổng quan, tài khoản), `modules/interns.js` (SVTT, theo dõi, bộ phận, nhập CSV), `modules/periods.js` (kỳ), `components/messages.js` (thông báo) và `state.js`, `utils.js`.
- `JS/db.js` cũ (thao tác Firestore, không có trang nào dùng) và `JS/ticket-manager.js` đã bị bỏ. `db.js` mới là tầng truy cập dữ liệu.
- `app.html` không còn CSS và JS nội tuyến. Có thêm 3 mục: Thực tập sinh, Chấm công, Báo cáo.
- Mục Báo cáo hiện cũng hiển thị với Phòng Nhân sự (trước đây bị ẩn).

---

## 2. Vai trò và quyền hạn

Vai trò nằm trong hồ sơ người dùng và Admin có thể chỉnh trên trang quản trị.

| Vai trò | Có thể làm |
|---|---|
| **Admin** | Duyệt/từ chối tài khoản, đổi vai trò và bộ phận, quản lý bộ phận, kỳ và SVTT. Đăng nhập bằng Google với email khai báo trong `JS/auth.js` và `JS/state.js` (`ADMIN_EMAIL`). |
| **Phòng Nhân sự (HR)** | Xem toàn bộ phiếu; phân công người hướng dẫn (mọi bộ phận) và Tổ Công tác sinh viên; mở lại phiếu đã chốt; in phiếu đã chốt. SVTT thuộc bộ phận `PNS`: tự chấm như Trưởng bộ phận. Vào `admin.html` để quản lý SVTT, kỳ, bộ phận. |
| **Trưởng bộ phận** | Xem phiếu bộ phận mình; phân công người hướng dẫn hoặc tự đánh giá; duyệt phiếu do người hướng dẫn gửi hoặc trả về; tự chấm và gửi thẳng lên Tổ Công tác sinh viên. |
| **Người hướng dẫn** | Chấm điểm, nhận xét và chấm công phiếu được giao; gửi lên Trưởng bộ phận duyệt. |
| **Tổ Công tác sinh viên** | Chỉ xem phiếu được HR giao; chấm điểm của Tổ, trả về bổ sung hoặc **chốt phiếu**; in phiếu đã chốt. |

Quy tắc phân quyền nằm trong `permissionsFor` của `JS/demo-store.js`.

---

## 3. Đăng nhập và tài khoản

- **Người dùng thường** đăng ký bằng email và mật khẩu ở tab "Người dùng" của `index.html`. Có chức năng quên mật khẩu.
- **Admin** đăng nhập bằng Google ở tab "Admin".
- Tài khoản phải được Admin **duyệt** (`status = approved`, `isActive = true`) mới vào được ứng dụng. Chưa duyệt thì quay về trang đăng nhập.
- Người đăng ký chỉ chọn được bộ phận có trong danh mục do Admin tạo.
- Cờ `SKIP_EMAIL_VERIFICATION = true` trong `JS/auth.js` đang bỏ qua xác minh email (phục vụ demo). Đặt `false` để bật lại.

---

## 4. Kỳ đánh giá, SVTT và phiếu

- **Kỳ đánh giá** tạo theo tháng (`YYYY-MM`). Khi tạo kỳ, hệ thống sinh phiếu cho SVTT đang thực tập trong kỳ.
- **SVTT** thêm từng người trên `admin.html` hoặc nhập CSV với các cột: `Mã SV, Họ tên, Trường, Bộ phận, Ngày bắt đầu, Ngày kết thúc`. SVTT đã có không bị ghi đè.
- **Ngày tháng** lưu `yyyy-mm-dd`, hiển thị và nhập `dd/mm/yyyy`.
- **Cảnh báo SVTT sắp về** trước 14 ngày (`FOLLOW_UP_DAYS`).
- **Bộ phận**: danh mục chính thức 21 bộ phận (ví dụ `CT` Bếp Căn tin, `PNS` Phòng Nhân sự). Admin thêm, sửa tên hoặc xóa bộ phận không còn SVTT.

---

## 5. Hạng mục đánh giá và cách tính điểm

Phiếu có **15 hạng mục** chia 3 phần: I Thái độ & Tinh thần thực tập (5), II Tinh thần phối hợp (4), III Chuyên môn nghiệp vụ (6).

- Mỗi hạng mục chấm từ **1 đến 10**, bước **0.5** (`SCORE_MIN`, `SCORE_MAX`, `SCORE_STEP`).
- **Điểm bộ phận** = trung bình ba phần I–III (mỗi phần là trung bình các hạng mục của phần).
- **Điểm Tổ Công tác sinh viên**: một điểm do Tổ nhập.
- **Điểm cuối** = (điểm bộ phận + điểm Tổ CTSV) / 2. Chỉ có khi đã đủ cả hai.
- Hiển thị 2 chữ số thập phân. Thang xếp loại chưa xác định nên chưa hiển thị.
- Nhận xét gồm Ưu điểm và Điểm hạn chế (có yêu cầu độ dài tối thiểu khi gửi).

---

## 6. Luồng trạng thái phiếu

| Trạng thái | Mã | Ai xử lý | Bước tiếp theo |
|---|---|---|---|
| Chưa bắt đầu | `chua_bat_dau` | Người đánh giá | Chấm, lưu nháp, gửi |
| Đang thực hiện | `dang_thuc_hien` | Người đánh giá | Gửi |
| Chờ Trưởng bộ phận duyệt | `cho_truong_bo_phan` | Trưởng bộ phận | Duyệt (gửi Tổ CTSV) hoặc trả về người hướng dẫn |
| Chờ Tổ Công tác sinh viên | `cho_to_cong_tac` | Tổ CTSV | Chấm điểm của Tổ rồi chốt, hoặc trả về |
| Trả về bổ sung | `tra_ve` | Người đánh giá | Bổ sung và gửi lại |
| Đã chốt | `da_chot` | — | In phiếu. HR mở lại được (kèm lý do) |

- Người hướng dẫn gửi → **Chờ Trưởng bộ phận duyệt** → duyệt → **Chờ Tổ CTSV**.
- Trưởng bộ phận (hoặc HR với SVTT của `PNS`) tự chấm → gửi **thẳng** lên Tổ CTSV.
- Mọi thao tác ghi vào **lịch sử phiếu** (ai, lúc nào, ghi chú).
- **Chấm công**: ký hiệu `o` (đi làm), `v` (vắng), `Off` (nghỉ), theo từng ngày trong khoảng giao giữa kỳ và thời gian thực tập. Quyền chấm công đi cùng quyền chấm điểm.

---

## 7. Màn hình

**app.html** (mỗi mục là một module trong `JS/modules/`)

| Mục | Module | Ghi chú |
|---|---|---|
| Tổng quan | `dashboard.js` | Số liệu, việc cần làm, cảnh báo sắp về, tiến độ người hướng dẫn |
| Phiếu đánh giá | `evaluations.js` | Với HR: nhóm theo ưu tiên, lọc theo kỳ/bộ phận/trạng thái/người đánh giá, in hàng loạt |
| Phân công đánh giá | `assignments.js` | Trưởng bộ phận và HR: giao từng phiếu hoặc hàng loạt; HR giao Tổ CTSV theo Trường |
| Thực tập sinh | `interns.js` | HR (tất cả) và Trưởng bộ phận (bộ phận mình); tìm kiếm, cảnh báo sắp kết thúc |
| Chấm công | `timesheet.js` | HR, Trưởng bộ phận, Người hướng dẫn; tổng hợp o/v/Off theo kỳ, chấm công hôm nay |
| Kỳ đánh giá | `periods.js` | Danh sách kỳ và tiến độ |
| Báo cáo | `reports.js` | Theo kỳ và bộ phận, bảng kết quả đã chốt, xuất CSV (theo phạm vi xem của từng vai trò) |
| Quản lý SVTT & kỳ | — | Liên kết tới `admin.html` (HR) |

**admin.html**: tab Tổng quan, Tài khoản (chỉ Admin), Sinh viên TT, Theo dõi, Kỳ đánh giá, Bộ phận.

**evaluation-form.html**: chấm điểm, nhận xét, chấm công, lưu nháp, nút gửi/duyệt/trả/chốt theo quyền, lịch sử. **print-ticket.html**: phiếu in của phiếu đã chốt; trong hộp thoại in, bỏ tick "Headers and footers".

---

## 8. Chạy và triển khai

Dự án là **HTML và JavaScript thuần (ES modules)**, không có bước build, không cần `npm install`.

```bash
# trong thư mục Interhub/
python3 -m http.server 8000
# mở http://localhost:8000/index.html
```

ES modules không chạy khi mở file trực tiếp (`file://`), nên cần một web server tĩnh. Triển khai bằng cách đưa toàn bộ thư mục lên hosting tĩnh, không cần build command. Chi tiết xem `data/DEPLOYMENT_GUIDE.md`.

---

## 9. Dữ liệu mô phỏng và giới hạn

- Kho mô phỏng nằm trong `localStorage`, khóa `internhub-demo-v3`. Dữ liệu dùng chung giữa các tab của **cùng một trình duyệt**, không dùng chung giữa các máy.
- Xóa dữ liệu trình duyệt thì mất toàn bộ SVTT, kỳ và phiếu.
- Phân quyền và trạng thái chỉ kiểm tra ở phía client. Quy tắc thật phải đặt ở máy chủ hoặc Firestore Rules trước khi dùng chính thức.
- Muốn chuyển sang Firestore: hiện thực lại phần truy cập dữ liệu trong `JS/db.js` / `JS/demo-store.js`, các module giao diện giữ nguyên.

---

## 10. Nội dung chờ xác nhận

1. **Thang xếp loại**: chưa có, ô "Xếp loại" để trống.
2. **Thang điểm**: đang dùng 1–10, bước 0.5.
3. **SVTT bắt đầu hoặc kết thúc giữa tháng**: vẫn tạo phiếu cho mọi SVTT đang thực tập trong kỳ.
4. **HR tự chấm phiếu `PNS`**: hiện được phép; vẫn phải qua Tổ CTSV chốt.
5. **Cảnh báo 14 ngày**: chưa có xác nhận chính thức.
6. **Nhật ký hoạt động, ghi chú tiêu chí, hạn hoàn thành**: chưa triển khai.
7. **`data/firestore.rules`** mới nhận biết vai trò `hr`, chưa có `committee`. Cần bổ sung trước khi chuyển dữ liệu nghiệp vụ lên Firestore.

---

## 11. Kiểm thử

Chưa có bộ kiểm thử tự động trong repo. Khi đổi logic, nên kiểm tra tay các luồng:

- Đăng ký → Admin duyệt → đăng nhập đúng vai trò.
- Phân công → người hướng dẫn chấm và gửi → Trưởng bộ phận duyệt/trả về → Tổ CTSV chấm và chốt.
- Trưởng bộ phận tự chấm, gửi thẳng lên Tổ CTSV; Tổ CTSV trả về; HR mở lại phiếu đã chốt; in phiếu.
- Nhập SVTT bằng CSV, tạo kỳ mới, kiểm tra số phiếu sinh ra.
- Chấm công hôm nay ở mục Chấm công, xem lại trong form phiếu; xuất CSV ở mục Báo cáo.
