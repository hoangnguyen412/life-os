# Life OS Frontend

Frontend dùng React, Vite và Tailwind CSS. Mã nguồn nằm trong `src/`.

## Chạy ở máy

Cần Node.js 22.13+ trong dòng 22, hoặc Node.js 24 trở lên, và npm.

Chạy các lệnh sau từ thư mục gốc dự án:

```powershell
cd client
npm ci
npm run dev
```

Mở địa chỉ Vite in ra trong terminal (mặc định `http://localhost:5173`).
Sau lần cài đầu tiên, chỉ cần chạy `npm run dev`.

## Kiểm tra và build

```powershell
npm run lint
npm test
npm run build
npm run preview
```

`build` tạo thư mục `dist/`. `preview` xem bản build ở máy, không phải lệnh deploy.
`node_modules/`, `dist/` và file môi trường riêng được bỏ qua trong Git.

## Cấu trúc

```text
client/
  index.html
  vite.config.js
  eslint.config.js
  package.json
  package-lock.json
  src/
    main.jsx       # Gắn React vào phần tử root
    App.jsx        # Component gốc
    index.css      # Tailwind và style chung
    assets/        # Hình minh họa, logo
    components/    # Component dùng chung
    pages/         # Các màn hình
    layouts/       # Layout đăng nhập và ứng dụng
    services/      # Gọi API
    hooks/         # React hooks dùng chung
    utils/         # Hàm tiện ích
```

## Phạm vi hiện tại

Bước 1 đã dựng nền React + Vite + Tailwind.
Bước 2 có Login/Register theo wireframe: bố cục hai cột, logo và hình minh họa
đã thêm vào `src/assets/`, form dùng chung, chuyển màn, ẩn/hiện mật khẩu, lỗi dưới từng ô nhập.
Trên màn hình nhỏ, hai cột xếp dọc và hình minh họa thu gọn.

Hình đăng nhập là `src/assets/login-illustration.png`; logo là
`src/assets/life-os-logo.png`. Login/Register dùng chung hình minh họa và logo;
Sidebar cũng dùng logo này. Hai PNG được tạo bằng công cụ imagegen tích hợp,
giữ nguyên ảnh đã chọn và nền trong suốt của logo.

Form yêu cầu tên khi đăng ký, email hợp lệ và mật khẩu. Đăng ký yêu cầu mật khẩu
tối thiểu 8 ký tự theo `docs/API_CONTRACT.md`. Gửi form hợp lệ chỉ hiện thông báo
preview và xóa mật khẩu khỏi form; không gọi API, tạo tài khoản hay lưu token.

Bước 3 có `AppLayout`, `Sidebar`, `Header` và vùng nội dung dùng chung.
Bấm **Preview workspace** ở Login/Register để xem khung ứng dụng; không cần
đăng nhập hoặc tài khoản. Sidebar có Dashboard, Tasks, Goals, Calendar và
Sign out (trở về Login). Trên điện thoại, nút menu mở/đóng phần điều hướng.
Nội dung mỗi mục đã dùng dữ liệu mẫu ở bước 5.

Bảng màu chung được tập trung ở `@theme` trong `src/index.css`:

| Vai trò | Mã màu |
| --- | --- |
| Màu chủ đạo | `#0f766e` |
| Hover nút chính | `#115e59` |
| Menu đang chọn | `#e3f2ec` |
| Nền ứng dụng | `#f6f9f7` |
| Nền card / sidebar | `#ffffff` |
| Chữ chính | `#183b38` |
| Chữ phụ | `#607772` |
| Viền | `#d8e5e0` |

Bước 4 dùng React Router với các route lồng nhau trong `AuthLayout` và `AppLayout`.
Sidebar dùng `NavLink` để xác định menu đang chọn từ URL. Chuyển màn, nút
Back/Forward, mở URL trực tiếp và refresh đều dùng cùng một cấu hình route.
Tiêu đề tab trình duyệt thay đổi theo trang.

| Đường dẫn | Trang |
| --- | --- |
| `/` | Chuyển về `/login` |
| `/login` | Sign in |
| `/register` | Create an account |
| `/dashboard` | Dashboard |
| `/tasks` | Tasks |
| `/goals` | Goals |
| `/calendar` | Calendar |
| Đường dẫn khác | Page not found |

Bốn trang ứng dụng hiện là preview public, chưa yêu cầu tài khoản hoặc JWT.
Sign out chỉ trở về Login ở giai đoạn này. Bước 6 sẽ thêm Auth thật và bảo vệ
các route. Chưa deploy.

## Mock data ở bước 5

`src/mocks/sampleData.js` tạo 5 Tasks, 2 Goals và 3 CalendarEvents từ nội dung
wireframe. Ngày được đặt tương đối theo ngày hiện tại ở Việt Nam, dùng UTC ISO
để lưu trong bộ nhớ. ID và field dùng contract hiện tại (`_id`, `goalId`,
`manualProgress`...), không dùng ID số trong bản wireframe cũ.

`MockDataProvider` chia sẻ dữ liệu giữa bốn trang. Dashboard có 4 số liệu, Tasks
có bộ lọc/sắp xếp/phân trang (4 items/trang), Goals có progress bar, Calendar có
lịch tháng và danh sách sự kiện. Có form tạo/sửa, xem chi tiết và xác nhận xóa.
Thay đổi Task cập nhật Goal task-based; xóa Goal giữ Task và gỡ liên kết.
Calendar hiển thị CalendarEvents có giờ và Task có dueDate dưới dạng cả ngày.
Task được lấy trực tiếp từ dữ liệu Tasks: đổi deadline sẽ chuyển ngày trên lịch;
gỡ deadline hoặc xóa Task sẽ gỡ mục đó, không tạo CalendarEvent trùng lặp.
Task màu vàng, quá hạn màu đỏ, hoàn thành màu xám; sự kiện màu xanh teal.
Bấm mục trên lịch để xem/sửa Task hoặc sự kiện gốc.

Nút **Download .ics** xuất tháng đang xem hoặc toàn bộ lịch, gồm cả sự kiện và
deadline Task. File dùng UTF-8, giờ sự kiện UTC, deadline dùng ngày cả ngày theo
Việt Nam. Trên Google Calendar ở máy tính, mở Settings → Import & export để
nhập file. Đây là bản xuất tại thời điểm tải, không tự đồng bộ các thay đổi sau đó.
Quy tắc xuất theo [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html);
[hướng dẫn nhập Google Calendar](https://support.google.com/calendar/answer/37118).

Mở **Preview controls** phía trên nội dung để thử Loading/Error, **Empty data**
hoặc **Reset sample data**. Error có nút Try again. Thay đổi chỉ ở bộ nhớ,
refresh sẽ khôi phục dữ liệu; không gọi API, dùng localStorage hay ghi database.
Auth form vẫn là preview như bước 2. Dữ liệu mẫu chưa kết nối backend.

`npm test` kiểm tra tiến độ Goal, completedAt, gỡ liên kết khi xóa Goal, số liệu
Dashboard, sắp xếp và chuyển ngày giờ UTC+07:00.
Các test Calendar kiểm tra ngày deadline, đổi/xóa Task, ranh giới tháng,
file ICS cả ngày, giờ UTC, ID ổn định và xử lý dấu tiếng Việt/ký tự đặc biệt.

## Chuẩn bị cho Vercel

`vercel.json` đã có SPA rewrite về `index.html` để mở/refresh trực tiếp `/tasks`
và các route khác sau khi deploy. Khi tạo project Vercel, chọn Root Directory
là `client`, Framework là Vite, Build Command là `npm run build`, Output Directory
là `dist`. Kiểm tra thực tế trên Vercel sẽ làm ở bước 7.

Thiết lập tham khảo tài liệu chính thức:

- [Vite](https://vite.dev/guide/)
- [Tailwind CSS với Vite](https://tailwindcss.com/docs/installation/using-vite)
- [React Router routing](https://reactrouter.com/start/declarative/routing)
- [Vercel SPA rewrite cho Vite](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas)
