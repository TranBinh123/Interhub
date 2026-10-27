from pathlib import Path

content = r'''# InternHub — README định hướng dự án

> **Phiên bản tài liệu:** 1.0  
> **Trạng thái:** Đặc tả định hướng đã thống nhất ở mức nghiệp vụ; chưa phải đặc tả kỹ thuật cuối cùng  
> **Mục đích:** Giúp AI, lập trình viên và các bên tham gia hiểu đúng bối cảnh, mục tiêu, cách phát triển prototype và lộ trình triển khai InternHub.

---

## 1. Đọc tài liệu này như thế nào?

README này là điểm khởi đầu chung cho mọi AI hoặc thành viên mới tham gia dự án. Trước khi thiết kế màn hình, viết code, tạo database hay đề xuất thay đổi kiến trúc, hãy đọc toàn bộ README và kiểm tra các tài liệu nguồn mới nhất trong repository.

Trong dự án, luôn phân biệt ba nhóm thông tin:

- **ĐÃ THỐNG NHẤT:** Yêu cầu người dùng đã xác nhận. Không tự ý thay đổi.
- **ĐỀ XUẤT:** Phương án thiết kế hoặc kỹ thuật đang được cân nhắc. Có thể thay đổi khi có căn cứ.
- **CHỜ XÁC NHẬN:** Điểm chưa đủ dữ liệu để chốt. Không tự đoán; ghi rõ giả định hoặc hỏi người phụ trách.

Nếu một tài liệu mới hơn mâu thuẫn với README, hãy xác định ngày/phiên bản và phạm vi thay đổi. Không âm thầm chọn một phương án. Nêu rõ mâu thuẫn, đề xuất cách xử lý và chờ xác nhận nếu đó là quyết định nghiệp vụ quan trọng.

## 2. Tổng quan dự án

**InternHub** là Web App nội bộ để quản lý hồ sơ sinh viên thực tập và quy trình đánh giá thực tập theo tháng tại công ty.

### Vấn đề hiện tại

Quy mô dự kiến trên 500 sinh viên mỗi tháng. Nếu mỗi Trưởng bộ phận gửi biểu mẫu hoặc file riêng, Bộ phận Đào tạo phải tổng hợp thủ công, gây tốn thời gian, khó kiểm soát tiến độ, dễ sai lệch dữ liệu và khó truy xuất lịch sử.

### Mục tiêu

1. Dùng **một hệ thống và một quy trình chung** cho toàn công ty.
2. Quản lý hồ sơ và đợt thực tập xuyên suốt, không chỉ quản lý một phiếu riêng lẻ.
3. Cho phép Trưởng bộ phận/người được phân công đánh giá sinh viên theo biểu mẫu hiện hành.
4. Thiết lập hai bước kiểm soát: **Trưởng bộ phận gửi đánh giá → Đào tạo kiểm tra và xác nhận/chốt**.
5. Theo dõi tình trạng đánh giá theo tháng, bộ phận và người đánh giá.
6. Xuất báo cáo Excel theo đúng mẫu tổng hợp hiện hành của công ty.
7. Giảm thao tác tổng hợp thủ công, nhưng vẫn lưu lịch sử và có thể kiểm tra lại khi cần.

### Đối tượng sử dụng

- Bộ phận Đào tạo: quản lý dữ liệu, kỳ đánh giá, phân công, kiểm tra/chốt và báo cáo.
- Trưởng bộ phận/người đánh giá được phân công: đánh giá và gửi phiếu thuộc phạm vi phụ trách.
- Quản trị viên hệ thống (Admin): quản lý kỹ thuật và tài khoản theo phân quyền; không mặc nhiên là người có quyền chốt nghiệp vụ.
- Sinh viên thực tập: **chưa thuộc phạm vi đăng nhập ở phiên bản đầu**.

## 3. Cấu hình đã thống nhất

| Hạng mục | Quyết định |
|---|---|
| Hình thức | Web App nội bộ |
| Chu kỳ | Đánh giá hàng tháng |
| Quy mô | Trên 500 sinh viên/tháng |
| Đăng nhập | Email và mật khẩu riêng |
| Người đánh giá | Trưởng bộ phận/người được phân công |
| Quy trình duyệt | Trưởng bộ phận gửi; Đào tạo kiểm tra và xác nhận/chốt |
| Tiêu chí và thang điểm | Theo biểu mẫu đánh giá hiện hành của công ty |
| Báo cáo | Xuất theo mẫu Excel hiện hành |
| Ngôn ngữ giao diện | Tiếng Việt, rõ ràng, dễ hiểu |
| Dữ liệu dùng khi dựng prototype | Có thể dùng dữ liệu giả lập; không dùng dữ liệu cá nhân thật nếu chưa được phép |

**Lưu ý:** Biểu mẫu đánh giá hiện hành và file Excel tổng hợp hiện hành là hai tài liệu nguồn bắt buộc phải có trước khi chốt cấu trúc phiếu, công thức tính điểm và định dạng xuất Excel. Không tự tạo tiêu chí, trọng số, mức xếp loại hoặc cột báo cáo thay cho tài liệu thực tế.

## 4. Phạm vi phiên bản đầu

### Trong phạm vi (In scope)

- Đăng nhập và phân quyền.
- Quản lý hồ sơ sinh viên và đợt thực tập.
- Nhập danh sách từ Excel có kiểm tra dữ liệu.
- Quản lý kỳ đánh giá theo tháng.
- Phân công người đánh giá theo bộ phận/đợt thực tập.
- Tạo phiếu đánh giá cho từng kỳ phù hợp.
- Lưu nháp, kiểm tra tính đầy đủ, gửi phiếu.
- Đào tạo yêu cầu chỉnh sửa hoặc xác nhận/chốt phiếu.
- Dashboard theo dõi tiến độ.
- Tìm kiếm, lọc và xem lịch sử.
- Xuất báo cáo Excel theo mẫu được cung cấp.
- Nhật ký thao tác quan trọng (audit log).

### Chưa thuộc phạm vi (Out of scope) trừ khi được phê duyệt bổ sung

- Tài khoản đăng nhập dành cho sinh viên.
- Ứng dụng di động riêng.
- Tích hợp với hệ thống HR hoặc hệ thống khác.
- Tự động hóa đánh giá giữa kỳ/ngoài kỳ hàng tháng.
- Chấm điểm hoặc đưa ra nhận xét bằng AI.
- Thông báo đa kênh hoặc tích hợp email tự động.
- Tự động khóa kỳ chỉ dựa vào ngày đến hạn.

Không triển khai các hạng mục ngoài phạm vi chỉ vì chúng có vẻ hữu ích. Hãy ghi nhận thành đề xuất cho giai đoạn sau.

## 5. Nguyên tắc nghiệp vụ không được phá vỡ

1. **Một nguồn dữ liệu chung:** Không thiết kế quy trình mà mỗi bộ phận phải tự tạo và gửi file riêng để Đào tạo tổng hợp lại.
2. **Theo dõi xuyên suốt:** Hồ sơ sinh viên, đợt thực tập, kỳ đánh giá và phiếu đánh giá phải liên kết được với nhau.
3. **Không tạo phiếu trùng:** Trong cùng một đợt thực tập, không tạo nhiều phiếu cho cùng một kỳ, trừ khi có quy tắc nghiệp vụ được phê duyệt rõ ràng.
4. **Đúng người, đúng phạm vi:** Người đánh giá chỉ thao tác với phiếu được phân công; quyền phải được kiểm tra ở phía máy chủ, không chỉ ẩn nút trên giao diện.
5. **Hai bước kiểm soát:** Phiếu chưa được Trưởng bộ phận gửi thì Đào tạo không thể chốt.
6. **Không gửi phiếu thiếu dữ liệu bắt buộc:** Việc kiểm tra phải dựa trên biểu mẫu đã được xác nhận.
7. **Không âm thầm sửa kết quả đã gửi/chốt:** Mọi lần trả về, mở lại hoặc điều chỉnh phải có lý do và lưu lịch sử.
8. **Giữ phiên bản biểu mẫu:** Phiếu cũ phải giữ đúng tiêu chí, thang điểm và quy tắc tính điểm đã áp dụng tại thời điểm đánh giá. Thay đổi biểu mẫu không được làm đổi kết quả lịch sử.
9. **Import an toàn:** Import lại cùng một dữ liệu không được tự tạo bản ghi trùng hoặc ghi đè âm thầm.
10. **Báo cáo có thể đối soát:** Số liệu xuất Excel phải truy ngược được về dữ liệu trong hệ thống; trạng thái đã chốt phải được phân biệt với trạng thái chỉ mới gửi.
11. **Không xóa lịch sử chỉ vì kết thúc thực tập:** Hồ sơ và phiếu cũ cần được giữ theo chính sách lưu trữ được công ty phê duyệt.
12. **Không tự suy diễn nghiệp vụ:** Khi chưa rõ cách xử lý sinh viên bắt đầu/kết thúc giữa tháng, chuyển bộ phận, đổi người đánh giá hoặc nghỉ thực tập, hãy ghi nhận câu hỏi cần xác nhận.

## 6. Vai trò và quyền hạn dự kiến

| Vai trò | Quyền chính |
|---|---|
| Admin | Quản lý cấu hình kỹ thuật và tài khoản theo quyền được cấp; xem nhật ký hệ thống khi cần |
| Đào tạo | Quản lý sinh viên/đợt thực tập, import, kỳ đánh giá, phân công, kiểm tra phiếu, trả về chỉnh sửa, chốt phiếu, báo cáo |
| Trưởng bộ phận/người đánh giá | Xem danh sách được phân công, nhập/lưu đánh giá, gửi phiếu, sửa và gửi lại khi phiếu bị trả về |
| Sinh viên | Không có tài khoản trong phiên bản đầu |

Cần xác nhận liệu một phiếu có thể có nhiều người tham gia đánh giá hay không, và ai là người chịu trách nhiệm gửi phiếu cuối cùng. Không tự mặc định rằng tất cả Trưởng bộ phận đều có thể xem dữ liệu của toàn công ty.

## 7. Cấu trúc màn hình dự kiến

Đây là danh sách màn hình nghiệp vụ tối thiểu cho prototype; bố cục cụ thể có thể thay đổi sau khi kiểm thử.

### 7.1. Đăng nhập

- Email và mật khẩu.
- Luồng đặt lại mật khẩu.
- Không có đăng ký tài khoản công khai.
- Thông báo lỗi dễ hiểu, không tiết lộ thông tin nhạy cảm.
- Khi triển khai thật: mật khẩu phải được băm an toàn phía máy chủ; có giới hạn đăng nhập sai, quản lý phiên và quy trình khóa/mở khóa phù hợp.

### 7.2. Dashboard

Hiển thị các chỉ số như tổng sinh viên đang thực tập, số phiếu cần đánh giá, đã gửi, chờ Đào tạo xác nhận, bị trả về, đã chốt và quá hạn. Có bộ lọc theo kỳ, bộ phận và người đánh giá.

**Quy tắc:** Chỉ tính là hoàn tất khi phiếu đã chốt, không tính phiếu mới gửi là đã hoàn tất.

### 7.3. Quản lý sinh viên và đợt thực tập

Thông tin dự kiến gồm mã sinh viên nội bộ, họ tên, trường, chuyên ngành (nếu cần), bộ phận, ngày bắt đầu/kết thúc, người đánh giá, trạng thái và lịch sử đợt thực tập.

Phân biệt **hồ sơ sinh viên** với **đợt thực tập**: một sinh viên có thể có các đợt thực tập khác nhau theo thời gian. Mã nội bộ và quy tắc nhận diện hồ sơ phải được thống nhất trước khi nhập dữ liệu thật.

### 7.4. Import Excel

Luồng đề xuất:

1. Tải file mẫu.
2. Tải file lên.
3. Xem trước dữ liệu và các cảnh báo.
4. Xác nhận nhập.
5. Xem kết quả nhập thành công/thất bại và tải danh sách lỗi nếu có.

Phải kiểm tra cột bắt buộc, định dạng ngày, mã trùng, dữ liệu thiếu và quan hệ bộ phận/người đánh giá. Không ghi đè dữ liệu hiện có nếu chưa thông báo rõ và chưa có quy tắc xử lý được phê duyệt.

### 7.5. Quản lý kỳ đánh giá

Mỗi kỳ có mã riêng, ví dụ `EV-2026-11`, tháng đánh giá, ngày mở, hạn gửi, biểu mẫu/phiên bản biểu mẫu, phạm vi sinh viên và người phụ trách.

Trước khi mở kỳ, hệ thống nên cho xem trước danh sách phiếu dự kiến và cảnh báo các trường hợp thiếu bộ phận, thiếu người đánh giá hoặc chưa đủ dữ liệu. Không tự khóa kỳ chỉ vì đã đến hạn.

### 7.6. Form đánh giá

Các trường, tiêu chí, mức điểm, trọng số, nhận xét, tổng điểm và kết luận phải lấy từ **biểu mẫu hiện hành của công ty**. Không tự tạo biểu mẫu thay thế.

Tối thiểu cần có lưu nháp, thông báo lỗi theo từng trường, kiểm tra dữ liệu bắt buộc và màn hình xem lại trước khi gửi. Sau khi gửi, phiếu không được tiếp tục chỉnh sửa như một bản nháp bình thường; nếu cần thay đổi phải qua luồng được quy định.

### 7.7. Đào tạo kiểm tra và chốt

Đào tạo có thể xem phiếu, xác nhận/chốt hoặc trả về người đánh giá kèm lý do. Màn hình cần hiển thị lịch sử gửi, trả về, gửi lại và chốt. Không được sửa điểm của người đánh giá một cách âm thầm.

### 7.8. Báo cáo và xuất Excel

Có bộ lọc theo kỳ, bộ phận, trường, người đánh giá và trạng thái nếu các trường này có trong dữ liệu đã xác nhận. File xuất phải khớp cấu trúc, tên cột, thứ tự, công thức và quy tắc tổng hợp của mẫu Excel hiện hành.

## 8. Luồng trạng thái

### 8.1. Trạng thái phiếu đánh giá

```text
Chưa bắt đầu
    ↓
Đang thực hiện (lưu nháp)
    ↓ gửi phiếu
Chờ Đào tạo xác nhận
    ├── Trả về chỉnh sửa → Đang thực hiện → Gửi lại → Chờ xác nhận
    └── Xác nhận/chốt → Đã chốt
```

Các quy tắc:

- Chỉ gửi khi đã đáp ứng các trường bắt buộc.
- Chỉ Đào tạo (hoặc vai trò được phê duyệt tương đương) mới được chốt.
- Khi trả về, phải có lý do.
- Phiếu đã chốt không được sửa trực tiếp; việc mở lại phải có quyền, lý do và audit log.
- Trạng thái quá hạn nên là cờ theo dõi riêng, không thay thế trạng thái chính của phiếu.

### 8.2. Trạng thái kỳ đánh giá

```text
Nháp → Đang mở → Đang chốt → Đã khóa
```

Tên gọi và điều kiện chuyển trạng thái là đề xuất, cần chốt khi thiết kế chi tiết. Ngày đến hạn không tự động đồng nghĩa với việc kỳ đã khóa. Cần có quy trình xử lý ngoại lệ được phê duyệt.

## 9. Quy tắc dữ liệu và mô hình dữ liệu sơ bộ

Các thực thể được đề xuất:

- `users`, `roles`, `user_roles`: tài khoản và phân quyền.
- `departments`: bộ phận.
- `schools`: trường.
- `students`: hồ sơ sinh viên.
- `internships`: đợt thực tập.
- `evaluation_periods`: kỳ đánh giá.
- `evaluation_templates`, `evaluation_criteria`: biểu mẫu và tiêu chí theo phiên bản.
- `evaluations`: phiếu đánh giá.
- `evaluation_details`: điểm/nhận xét theo từng tiêu chí.
- `evaluation_assignments` (nếu cần): phân công đánh giá.
- `audit_logs`: lịch sử thao tác quan trọng.

Đây là **mô hình khái niệm đề xuất**, chưa phải schema database cuối cùng. Có thể điều chỉnh sau khi kiểm tra biểu mẫu, Excel và quy tắc phân công thực tế.

### Quy tắc dữ liệu cốt lõi

- Mã sinh viên nội bộ phải duy nhất theo quy tắc nhận diện đã chốt.
- Phiếu gắn với một đợt thực tập và một kỳ đánh giá.
- Nếu quy tắc là mỗi đợt thực tập chỉ có một phiếu/kỳ, phải có ràng buộc duy nhất tương đương với `(internship_id, evaluation_period_id)`.
- Người đánh giá phải thuộc phân công hợp lệ tại thời điểm thao tác.
- Tính điểm bằng đúng công thức và phiên bản biểu mẫu đã áp dụng.
- Chuyển bộ phận hoặc người đánh giá phải có lịch sử; không tự động chuyển phiếu đã gửi/chốt.
- Import phải có cơ chế phát hiện bản ghi trùng và báo lỗi có thể xử lý.
- Các kiểm tra quyền quan trọng phải thực hiện phía máy chủ.

### Quy mô dữ liệu

Với giả định 600 sinh viên được đánh giá mỗi tháng và mỗi người có một phiếu/tháng, hệ thống tạo khoảng 7.200 phiếu/năm. Đây chỉ là phép tính tham khảo để định hướng thiết kế; số lượng thực tế phụ thuộc vào thời gian thực tập và quy tắc tạo phiếu.

## 10. Cách dựng prototype

Prototype nhằm kiểm chứng quy trình và trải nghiệm người dùng **trước khi đầu tư hoàn chỉnh vào backend/database**. Prototype không được giới thiệu như hệ thống vận hành thật nếu dữ liệu và thao tác chỉ đang mô phỏng.

### Mục tiêu prototype

- Người dùng hiểu được cách đi từ danh sách sinh viên đến kỳ đánh giá, phiếu, duyệt và xuất báo cáo.
- Thử được luồng Trưởng bộ phận gửi → Đào tạo trả về hoặc chốt.
- Kiểm tra khả năng tìm kiếm/lọc với hơn 500 hồ sơ mẫu.
- Phát hiện điểm khó dùng, thiếu dữ liệu và trạng thái dễ gây hiểu nhầm.
- Thử hình thức báo cáo với cấu trúc gần mẫu Excel thực tế.

### Dữ liệu mẫu

- Dùng dữ liệu giả lập, tối thiểu đủ lớn để thử lọc và phân trang (mục tiêu ban đầu: trên 500 hồ sơ).
- Không đưa thông tin cá nhân thật vào prototype nếu chưa được cho phép.
- Có nhiều bộ phận, trường, người đánh giá và trạng thái phiếu để thử bộ lọc.
- Gắn nhãn rõ dữ liệu prototype/demo, không dùng lẫn với dữ liệu thật.

### Các tương tác prototype tối thiểu

1. Điều hướng qua các màn hình.
2. Tìm kiếm/lọc danh sách sinh viên.
3. Mô phỏng import Excel và hiển thị lỗi.
4. Tạo kỳ đánh giá và xem danh sách phiếu dự kiến.
5. Mở phiếu, nhập điểm/nhận xét, lưu nháp.
6. Ngăn gửi khi thiếu thông tin bắt buộc.
7. Gửi phiếu, trả về kèm lý do, gửi lại và chốt.
8. Dashboard thay đổi theo dữ liệu demo.
9. Xuất hoặc mô phỏng file báo cáo theo mẫu.
10. Hiển thị lịch sử thao tác ở những bước quan trọng.

Nếu prototype chưa có backend, hãy ghi rõ những gì chỉ là mô phỏng: đăng nhập, lưu dữ liệu, phân quyền, import, tính điểm, chốt phiếu và xuất file. Không tuyên bố có bảo mật hoặc lưu trữ bền vững khi chưa triển khai và kiểm thử thực tế.

## 11. Lộ trình triển khai

Thời lượng dưới đây chỉ là ước lượng lập kế hoạch ban đầu, không phải cam kết tiến độ. Cần điều chỉnh theo nguồn lực, quy trình phê duyệt và mức độ hoàn thiện của tài liệu đầu vào.

### Chặng 1 — Chuẩn hóa đầu vào

**Đầu ra cần có:**
- Biểu mẫu đánh giá thực tập hiện hành.
- File Excel tổng hợp hiện hành.
- Danh sách bộ phận, trường, trạng thái và dữ liệu cần quản lý.
- Quy tắc chấm điểm/tổng điểm/xếp loại.
- Quy tắc phân công người đánh giá.
- Quy tắc đối với sinh viên bắt đầu hoặc kết thúc giữa tháng, chuyển bộ phận, nghỉ hoặc đổi người đánh giá.
- Quy tắc hạn gửi, trả về, chốt và mở lại phiếu.

Không nên khóa thiết kế database và form đánh giá trước khi có hai tài liệu nguồn đầu tiên.

### Chặng 2 — Dựng prototype

**Đầu ra cần có:**
- Bộ màn hình có thể thao tác.
- Dữ liệu giả lập trên 500 hồ sơ.
- Luồng đánh giá hai bước có thể mô phỏng từ đầu đến cuối.
- Dashboard, bộ lọc và bản xem trước báo cáo.
- Danh sách điểm cần sửa sau khi người dùng thử.

**Điều kiện qua chặng:** Người dùng nghiệp vụ xác nhận luồng chính dễ hiểu và phù hợp công việc thật; các khác biệt so với quy trình hiện tại được ghi lại.

### Chặng 3 — Phát triển MVP

MVP là phiên bản đầu có thể vận hành thực tế trong phạm vi được duyệt.

**Hạng mục dự kiến:**
- Database và backend.
- Đăng nhập, quản lý phiên và phân quyền phía máy chủ.
- Quản lý hồ sơ, đợt thực tập và kỳ đánh giá.
- Import Excel có kiểm tra, báo lỗi và chống trùng.
- Form đánh giá, tính điểm và phiên bản biểu mẫu.
- Quy trình gửi, trả về, gửi lại, chốt.
- Audit log.
- Xuất Excel theo mẫu chính thức.
- Kiểm thử bảo mật, sao lưu và khôi phục.

**Stack kỹ thuật đề xuất, chưa chốt:** Next.js + TypeScript cho giao diện; PostgreSQL cho dữ liệu; backend/API có kiểm soát quyền; thư viện phù hợp để đọc/ghi Excel. Supabase có thể được xem xét để rút ngắn thời gian, nhưng chỉ sau khi đánh giá yêu cầu bảo mật, quyền truy cập, sao lưu, triển khai và chính sách IT của công ty.

### Chặng 4 — Pilot

Thử nghiệm với một nhóm bộ phận hoặc kỳ đánh giá được chọn.

**Cần kiểm tra:**
- Đối chiếu kết quả Excel với cách tổng hợp hiện tại.
- Độ đúng của công thức tính điểm.
- Quyền truy cập theo từng vai trò.
- Tình huống import trùng, thiếu dữ liệu và đổi phân công.
- Tải với số lượng hồ sơ/phiếu dự kiến.
- Sao lưu, khôi phục và xử lý lỗi.
- Phản hồi từ Trưởng bộ phận và Đào tạo.

Chỉ mở rộng sử dụng khi các lỗi nghiệp vụ quan trọng đã được xử lý và người phụ trách phê duyệt.

### Chặng 5 — Vận hành và cải tiến

- Theo dõi lỗi, thời gian hoàn thành đánh giá và số phiếu quá hạn.
- Thu thập phản hồi người dùng.
- Ưu tiên cải tiến theo mức độ ảnh hưởng đến nghiệp vụ.
- Mọi chức năng mới phải được đánh giá tác động đến quyền, dữ liệu lịch sử và báo cáo.

## 12. Tiêu chí nghiệm thu

### Prototype

- [ ] Có các màn hình nghiệp vụ tối thiểu đã mô tả.
- [ ] Có thể thao tác qua luồng phiếu từ tạo/lưu nháp đến gửi, trả về và chốt mô phỏng.
- [ ] Không cho gửi phiếu thiếu trường bắt buộc theo cấu hình.
- [ ] Dashboard và bộ lọc phản ánh đúng dữ liệu demo.
- [ ] Có trên 500 hồ sơ giả lập để thử tìm kiếm/lọc.
- [ ] Hiển thị rõ các chức năng đang mô phỏng và chưa có backend.
- [ ] Mẫu báo cáo được đối chiếu với file Excel chính thức khi tài liệu đã được cung cấp.

### MVP

- [ ] Người dùng chỉ truy cập được chức năng và dữ liệu thuộc quyền.
- [ ] Không tạo trùng phiếu cho cùng đợt thực tập/kỳ theo quy tắc đã chốt.
- [ ] Import phát hiện dữ liệu sai/trùng và báo lỗi rõ ràng.
- [ ] Không gửi phiếu chưa đủ dữ liệu bắt buộc.
- [ ] Đào tạo không thể chốt phiếu chưa được gửi.
- [ ] Phiếu bị trả về có lý do và có thể gửi lại theo đúng luồng.
- [ ] Phiếu đã chốt không bị sửa âm thầm.
- [ ] Phiếu cũ giữ nguyên phiên bản biểu mẫu và kết quả lịch sử.
- [ ] File Excel xuất ra khớp cấu trúc và số liệu của mẫu được phê duyệt.
- [ ] Có audit log cho các thao tác nghiệp vụ quan trọng.
- [ ] Có kiểm thử backup/restore và kiểm tra bảo mật cơ bản trước khi vận hành.

### Bộ ca kiểm thử nghiệp vụ tối thiểu

1. Tạo phiếu hai lần cho cùng một đợt thực tập/kỳ: hệ thống ngăn hoặc cảnh báo đúng quy tắc.
2. Một sinh viên có nhiều kỳ đánh giá: các phiếu thuộc đúng kỳ, không ghi đè lên nhau.
3. Phiếu thiếu tiêu chí bắt buộc: không gửi được.
4. Đào tạo thử chốt phiếu chưa gửi: hệ thống từ chối.
5. Người đánh giá thử sửa phiếu sau khi gửi: hệ thống từ chối hoặc yêu cầu đúng quy trình trả về.
6. Đào tạo trả phiếu: phải nhập lý do và người đánh giá có thể sửa/gửi lại.
7. Thay biểu mẫu: phiếu đã chốt không đổi kết quả lịch sử.
8. Chuyển bộ phận/người đánh giá: lưu lịch sử và xử lý phiếu đang mở theo quy tắc đã duyệt.
9. Import cùng file hai lần: không tạo trùng hoặc ghi đè âm thầm.
10. Xuất Excel: số lượng, điểm, trạng thái và nội dung khớp dữ liệu hệ thống theo mẫu.

## 13. Các câu hỏi nghiệp vụ còn chờ xác nhận

AI không được tự đưa ra quyết định cuối cùng cho các mục này:

1. **Biểu mẫu chấm điểm:** Các tiêu chí, thang điểm, trọng số, công thức tổng điểm và kết luận chính xác là gì?
2. **Excel đầu ra:** File có những sheet, cột, công thức, định dạng và quy tắc tổng hợp nào?
3. **Người đánh giá:** Mỗi sinh viên có một người đánh giá hay nhiều người? Người gửi phiếu cuối cùng là ai?
4. **Thời điểm tạo phiếu:** Sinh viên bắt đầu/kết thúc giữa tháng được đánh giá trong tháng đó theo quy tắc nào?
5. **Chuyển bộ phận:** Phiếu đang mở xử lý ra sao khi sinh viên đổi bộ phận hoặc người đánh giá?
6. **Trường hợp đặc biệt:** Nghỉ thực tập, tạm dừng, quay lại thực tập hoặc thiếu dữ liệu xử lý thế nào?
7. **Quyền truy cập:** Trưởng bộ phận chỉ xem dữ liệu bộ phận mình hay có ngoại lệ?
8. **Hạn và khóa kỳ:** Ai được gia hạn, mở lại kỳ hoặc mở lại phiếu đã chốt?
9. **Triển khai:** Hệ thống được phép đặt ở đâu, ai quản trị, yêu cầu backup và thời hạn lưu dữ liệu là gì?
10. **Thông báo:** Phiên bản đầu có cần thông báo email hoặc nhắc hạn tự động không?

## 14. Hướng dẫn cho AI tiếp tục dự án

Khi nhận yêu cầu tiếp theo, AI cần tuân thủ quy trình sau:

1. Đọc README và các tài liệu dự án có liên quan.
2. Xác định yêu cầu thuộc nghiệp vụ, giao diện prototype, backend, dữ liệu, kiểm thử hay triển khai.
3. Kiểm tra yêu cầu có mâu thuẫn với quyết định đã thống nhất không.
4. Nếu thiếu thông tin quan trọng, nêu câu hỏi cụ thể; nếu vẫn có thể làm bản nháp, ghi rõ giả định và không coi giả định là quyết định chính thức.
5. Ưu tiên thay đổi nhỏ, dễ kiểm tra, phù hợp giai đoạn hiện tại; không xây dựng thêm chức năng ngoài phạm vi nếu chưa được yêu cầu.
6. Khi sửa code, xác định file và ảnh hưởng liên quan trước; không thay đổi cấu trúc hoặc tên file tùy tiện.
7. Không tuyên bố đã chạy, kiểm thử, kết nối database, lưu dữ liệu hay triển khai nếu chưa thực sự thực hiện và xác minh.
8. Sau mỗi thay đổi quan trọng, cập nhật tài liệu liên quan: mục đích, nội dung thay đổi, cách kiểm thử và các điểm còn tồn tại.
9. Bảo vệ dữ liệu cá nhân; ưu tiên dữ liệu giả trong prototype và môi trường phát triển.
10. Khi có nhiều phương án kỹ thuật, giải thích ngắn gọn ưu/nhược điểm và khuyến nghị một phương án thay vì trình bày quá nhiều lựa chọn không cần thiết.

### Quy tắc ưu tiên khi có xung đột

Ưu tiên theo thứ tự:

1. Quyết định nghiệp vụ mới nhất đã được người phụ trách xác nhận.
2. Tài liệu nghiệp vụ/biểu mẫu chính thức đã được phê duyệt.
3. README và các đặc tả dự án đã thống nhất.
4. Mã nguồn hiện tại và hành vi thực tế đã kiểm chứng.
5. Đề xuất hoặc suy luận của AI.

Nếu mã nguồn đang khác đặc tả, không tự động kết luận rằng đặc tả sai. Hãy nêu khác biệt và đề xuất cách xử lý.

## 15. Tài liệu cần bổ sung vào repository

Cấu trúc gợi ý:

```text
InternHub/
├── README.md
├── js/
│   ├── admin-panel.js
│   ├── auth.js
│   ├── db.js
│   ├── firebase-config.js
│   ├── ticket-manager.js
├── data/
│   ├── DEPLOYMENT_GUIDE.md
│   ├── firestore-schema.json
│   ├── firestore.rules
├── docs/
│   ├── business-requirements.md
│   ├── screen-specification.md
│   ├── data-dictionary.md
│   ├── workflow-and-statuses.md
│   ├── acceptance-tests.md
│   ├── decisions/
│   │   └── decision-log.md
│   └── source-templates/
│       └── README.md
├── prototype/
├── admin.html
├── app.html
├── evaluation-form.html
├── index.html
└── app/                 
```

Không bắt buộc phải tạo toàn bộ cấu trúc ngay lập tức. Có thể bắt đầu với README và hai tài liệu nguồn; bổ sung các file đặc tả khi nội dung đã đủ chắc chắn.

### Nhật ký quyết định (`decision-log.md`)

Mỗi quyết định quan trọng nên ghi:

- Mã quyết định.
- Ngày cập nhật.
- Vấn đề cần quyết định.
- Các phương án đã cân nhắc.
- Quyết định cuối cùng và người xác nhận.
- Tác động đến giao diện, dữ liệu, quy trình hoặc báo cáo.

Mục đích là để AI ở phiên làm việc sau hiểu vì sao hệ thống được thiết kế như hiện tại, thay vì chỉ nhìn thấy kết quả cuối cùng.

---

## 16. Việc cần làm tiếp theo

Để chuyển từ đặc tả định hướng sang prototype chính xác, cần thu thập trước:

1. **Biểu mẫu đánh giá sinh viên thực tập hiện hành.**
2. **File Excel tổng hợp kết quả hiện hành.**

Có thể ẩn thông tin cá nhân hoặc thay bằng dữ liệu giả, nhưng nên giữ nguyên tên cột, công thức và cấu trúc. Sau đó, xác nhận quy tắc phân công người đánh giá và các trường hợp bắt đầu/kết thúc giữa tháng.

**Nguyên tắc triển khai:** Chuẩn hóa nghiệp vụ trước → dựng prototype để kiểm chứng → phát triển MVP → pilot → vận hành và cải tiến. Không nên bắt đầu bằng việc viết database hoặc form chấm điểm theo suy đoán.
'''
path = Path("/mnt/data/README_InternHub.md")
path.write_text(content, encoding="utf-8")
print(f"Đã tạo: {path}\nDung lượng: {path.stat().st_size:,} bytes")
## Trạng thái dự án và kết quả Chặng 1

### 1. Tổng quan tiến độ

Dự án InternHub được triển khai theo 5 chặng:

1. **Chặng 1 – Chuẩn hóa yêu cầu nghiệp vụ:** Đã hoàn thành bước thống nhất phạm vi, vai trò, quy trình đánh giá và nguyên tắc tính điểm ở mức yêu cầu nghiệp vụ.
2. **Chặng 2 – Dựng prototype:** Bước tiếp theo. Xây dựng Web App mẫu có thể tương tác để kiểm tra giao diện và quy trình sử dụng.
3. **Chặng 3 – Phát triển MVP:** Xây dựng phiên bản có chức năng thực tế, cơ sở dữ liệu, phân quyền và xử lý nghiệp vụ.
4. **Chặng 4 – Pilot:** Thử nghiệm với người dùng và dữ liệu được lựa chọn, ghi nhận vấn đề và điều chỉnh.
5. **Chặng 5 – Vận hành và cải tiến:** Hoàn thiện hướng dẫn, triển khai chính thức, theo dõi và cải tiến.

**Lưu ý về trạng thái:** Hoàn thành Chặng 1 không có nghĩa là mọi chi tiết kỹ thuật và nghiệp vụ đã được xác nhận. Những nội dung đã thống nhất phải được giữ nguyên; những nội dung còn chờ xác nhận phải được ghi nhận riêng, không tự suy diễn thành yêu cầu chính thức.

### 2. Kết quả Chặng 1 – Những nội dung đã thống nhất

#### 2.1. Bối cảnh và mục tiêu

InternHub là Web App nội bộ phục vụ quản lý quá trình đánh giá sinh viên thực tập tại Sun World Ba Na Hills.

Hệ thống hướng đến việc thay thế cách gửi biểu mẫu riêng lẻ và tổng hợp thủ công, giúp:

- Quản lý tập trung danh sách sinh viên thực tập và các kỳ đánh giá.
- Theo dõi tiến độ đánh giá của các bộ phận.
- Chuẩn hóa việc nhập điểm, nhận xét và góp ý cải thiện.
- Cho phép Đào tạo kiểm tra, trả phiếu để bổ sung hoặc xác nhận chốt kết quả.
- Xuất báo cáo Excel phục vụ tổng hợp và đối soát.

Quy mô dự kiến: trên 500 sinh viên trong một tháng.

#### 2.2. Chu kỳ và đối tượng sử dụng

- Đánh giá theo tháng.
- Người đánh giá là Trưởng bộ phận hoặc người được phân công/người hướng dẫn.
- Bộ phận Đào tạo theo dõi, kiểm tra và xác nhận chốt kết quả.
- Tài khoản đăng nhập sử dụng email và mật khẩu riêng.
- Biểu mẫu đánh giá và mẫu Excel đầu ra hiện hành của công ty là căn cứ nghiệp vụ cần tuân thủ.

Các vai trò và quyền chi tiết phải được thể hiện rõ trong prototype. Không mặc định rằng mọi người dùng thuộc cùng một vai trò có quyền giống nhau.

#### 2.3. Cấu trúc biểu mẫu đánh giá

Thông tin chung:

- Họ tên sinh viên thực tập.
- Bộ phận thực tập.
- Thời gian/kỳ đánh giá.

Ba phần được tính điểm:

**I. Thái độ & Tinh thần thực tập – 5 hạng mục**

1. Hình ảnh chỉn chu: trang phục, đầu tóc, khuôn mặt, phụ kiện và vệ sinh.
2. Ý thức giữ gìn vệ sinh chung và vệ sinh vị trí/khu vực thực tập.
3. Ý thức kỷ luật, chấp hành nội quy giờ giấc và lịch làm việc.
4. Không làm việc riêng ngoài phạm vi thực tập trong quá trình thực tập.
5. Không có phản ánh từ khách hàng/đối tác trong quá trình thực tập.

**II. Tinh thần phối hợp – 4 hạng mục**

1. Ý thức tổ chức và tinh thần phối hợp với đồng nghiệp.
2. Khả năng lắng nghe, tiếp thu và phản hồi kịp thời, đầy đủ, rõ ràng.
3. Khả năng thích nghi, linh hoạt và điều chỉnh cách làm việc theo tình huống, yêu cầu công việc.
4. Mối quan hệ với đồng nghiệp, góp phần tạo môi trường hỗ trợ và cùng tiến bộ.

**III. Chuyên môn nghiệp vụ – 6 hạng mục**

1. Khả năng nắm vững kiến thức lý thuyết, công thức, quy trình và nguyên tắc cơ bản của lĩnh vực thực tập.
2. Khả năng sử dụng các công cụ, phương pháp và kỹ thuật chuyên môn đã được trang bị.
3. Khả năng phân tích dữ liệu, thông tin và tình huống để đưa ra kết luận hoặc quyết định hợp lý trong phạm vi được giao.
4. Khả năng làm việc độc lập.
5. Khả năng làm việc nhóm.
6. Tính sáng tạo và đề xuất cải tiến.

**IV. Nhận xét chung của Trưởng bộ phận/người hướng dẫn**

Trường nhập nội dung nhận xét bằng văn bản.

**V. Góp ý cải thiện cho sinh viên thực tập**

Trường nhập nội dung góp ý bằng văn bản.

Thang điểm của mỗi hạng mục thuộc ba phần I, II và III là thang điểm 10.

#### 2.4. Quy tắc tính điểm đã thống nhất

Gọi:

- A là điểm trung bình phần I.
- B là điểm trung bình phần II.
- C là điểm trung bình phần III.

Công thức:

- Điểm phần I = Tổng điểm 5 hạng mục / 5.
- Điểm phần II = Tổng điểm 4 hạng mục / 4.
- Điểm phần III = Tổng điểm 6 hạng mục / 6.
- Điểm đánh giá cuối cùng = (A + B + C) / 3.

**Nguyên tắc bắt buộc:**

- Ba phần I, II và III có trọng số bằng nhau.
- Điểm từng phần được tính bằng trung bình cộng các hạng mục thuộc phần đó.
- Không tính điểm cuối cùng bằng cách lấy trung bình trực tiếp của cả 15 hạng mục.
- Phần IV và phần V là nội dung văn bản, không tham gia tính điểm.
- Hệ thống phải lưu được điểm của từng hạng mục để phục vụ kiểm tra, đối soát và tính lại.
- Chưa tự ý làm tròn điểm ở từng bước nếu quy tắc làm tròn chính thức chưa được xác nhận.

Ví dụ: nếu điểm A = 8,00; B = 9,00; C = 7,50 thì điểm cuối cùng trước khi áp dụng quy tắc làm tròn là 8,1666...

#### 2.5. Quy trình nghiệp vụ định hướng

Quy trình đánh giá được định hướng như sau:

1. Đào tạo thiết lập kỳ đánh giá và dữ liệu sinh viên liên quan.
2. Người có trách nhiệm được phân công thực hiện đánh giá.
3. Người đánh giá nhập điểm cho các hạng mục và điền nhận xét, góp ý.
4. Người đánh giá gửi phiếu đến Đào tạo.
5. Đào tạo kiểm tra nội dung, trả phiếu để bổ sung nếu cần hoặc xác nhận chốt.
6. Hệ thống lưu trạng thái và lịch sử xử lý, hỗ trợ tổng hợp và xuất báo cáo.

Các trạng thái dự kiến gồm: Chưa bắt đầu, Đang thực hiện, Chờ Đào tạo xác nhận, Trả về bổ sung và Đã chốt.

Tên trạng thái, điều kiện chuyển trạng thái và quyền thao tác cần được kiểm tra qua prototype trước khi triển khai chính thức.

### 3. Những nguyên tắc phải được giữ trong Chặng 2

Prototype phải phản ánh đúng các yêu cầu đã thống nhất:

1. Có phân biệt vai trò và quyền thao tác.
2. Thể hiện được danh sách sinh viên và kỳ đánh giá theo tháng.
3. Có biểu mẫu gồm đúng 15 hạng mục tính điểm, chia theo ba phần như trên.
4. Tự tính điểm từng phần và điểm cuối cùng theo đúng công thức.
5. Có trường nhận xét chung và góp ý cải thiện.
6. Thể hiện được quy trình gửi, trả về và chốt phiếu.
7. Có màn hình giúp Đào tạo theo dõi tiến độ và kiểm tra kết quả.
8. Có định hướng xuất Excel theo mẫu hiện hành.
9. Không cho phép việc chốt phiếu diễn ra âm thầm hoặc làm mất lịch sử.
10. Nếu dùng dữ liệu minh họa, phải ghi rõ đó là dữ liệu giả lập; không trình bày dữ liệu giả lập như dữ liệu thật.

### 4. Các nội dung còn chờ xác nhận

Những vấn đề sau chưa được xem là đã chốt chỉ vì Chặng 1 hoàn thành:

- Đối chiếu biểu mẫu đánh giá hiện hành với danh sách tiêu chí trong README.
- Đối chiếu file Excel tổng hợp hiện hành để xác định chính xác cấu trúc cột, định dạng, công thức và cách xuất dữ liệu.
- Quy tắc phân công người đánh giá; trường hợp một sinh viên có nhiều người đánh giá.
- Cách xử lý sinh viên bắt đầu hoặc kết thúc thực tập giữa tháng.
- Cách xử lý sinh viên chuyển bộ phận hoặc thay đổi người đánh giá.
- Quy tắc bắt buộc nhập điểm và xử lý trường hợp thiếu điểm.
- Số chữ số thập phân và quy tắc làm tròn điểm.
- Quyền mở lại phiếu đã chốt hoặc mở lại kỳ đã khóa.
- Các điều kiện khóa kỳ và xử lý ngoại lệ.
- Công nghệ, môi trường triển khai, phương án lưu trữ và yêu cầu bảo mật cần được rà soát trước khi phát triển MVP.

Không tự đặt ra quy tắc chính thức cho các trường hợp trên. Nếu prototype cần mô phỏng một quy tắc để minh họa, phải đánh dấu rõ đó là giả định chờ xác nhận.

### 5. Mục tiêu và đầu ra Chặng 2

Chặng 2 cần tạo ra một prototype có thể thao tác thử, bao gồm tối thiểu:

- Màn hình đăng nhập minh họa.
- Dashboard theo dõi tình hình đánh giá.
- Màn hình quản lý sinh viên và kỳ thực tập.
- Màn hình quản lý kỳ đánh giá.
- Biểu mẫu chấm điểm và nhập nhận xét.
- Màn hình Đào tạo kiểm tra, trả phiếu và chốt phiếu.
- Màn hình báo cáo và mô phỏng xuất Excel.

Prototype cần có dữ liệu giả lập đủ lớn để kiểm tra trải nghiệm sử dụng ở quy mô trên 500 sinh viên. Các thao tác chính phải phản hồi nhất quán; nếu dữ liệu hoặc chức năng chỉ được mô phỏng ở phía giao diện, cần ghi rõ giới hạn đó.

**Tiêu chí hoàn thành Chặng 2:** Các bên liên quan có thể thao tác thử các luồng nghiệp vụ chính, kiểm tra công thức tính điểm, đánh giá mức độ dễ sử dụng và thống nhất các điểm cần điều chỉnh trước khi bước sang Chặng 3 – Phát triển MVP.

### 6. Hướng dẫn dành cho AI tiếp tục dự án

Khi đọc README và tiếp tục công việc:

- Giữ nguyên các quyết định đã được xác nhận trong mục trạng thái dự án.
- Phân biệt rõ yêu cầu đã chốt, đề xuất kỹ thuật và giả định cần xác nhận.
- Không tự thêm tiêu chí đánh giá, thay đổi công thức hoặc sửa quy trình nghiệp vụ.
- Không coi prototype là hệ thống đã có xác thực, phân quyền hoặc lưu trữ dữ liệu an toàn nếu các chức năng đó chưa được triển khai và kiểm thử.
- Ưu tiên hoàn thiện prototype để lấy phản hồi trước khi khóa thiết kế dữ liệu và phát triển MVP.
- Ghi lại các quyết định mới, lý do thay đổi và ảnh hưởng đến các phần liên quan.
