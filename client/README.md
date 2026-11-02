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
tối thiểu 8 ký tự theo `docs/API_CONTRACT.md`. Form hợp lệ gọi API thật: đăng ký
tạo tài khoản, đăng nhập kiểm tra thông tin, thành công lưu JWT và mở workspace.
Khi đang gửi, form bị khóa để tránh gửi trùng; lỗi backend hiện dưới ô nhập
tương ứng hoặc dưới form nếu là lỗi chung.

Bước 3 có `AppLayout`, `Sidebar`, `Header` và vùng nội dung dùng chung.
Đăng nhập để mở khung ứng dụng. Sidebar có Dashboard, Tasks, Goals, Calendar và
Sign out (xóa token và trở về Login). Header/Sidebar hiện tên và email của user
đã xác thực. Trên điện thoại, nút menu mở/đóng phần điều hướng.
Tasks, Goals và Dashboard dùng dữ liệu backend thật; Calendar vẫn dùng dữ liệu mẫu.

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

Bốn trang ứng dụng đã được bảo vệ bởi `RequireAuth`. Chưa đăng nhập thì về Login;
sau khi đăng nhập quay lại trang đã yêu cầu. Link xem workspace không cần tài khoản
đã được bỏ. Trang Tasks, Goals và Dashboard đã dùng API thật; Calendar vẫn dùng dữ liệu mẫu.

## Mock data ở bước 5

`src/mocks/sampleData.js` tạo 5 Tasks, 2 Goals và 3 CalendarEvents từ nội dung
wireframe. Ngày được đặt tương đối theo ngày hiện tại ở Việt Nam, dùng UTC ISO
để lưu trong bộ nhớ. ID và field dùng contract hiện tại (`_id`, `goalId`,
`manualProgress`...), không dùng ID số trong bản wireframe cũ.

`MockDataProvider` còn dùng cho Calendar.
Calendar có
lịch tháng và danh sách sự kiện. Có form tạo/sửa, xem chi tiết và xác nhận xóa.
Thay đổi Task cập nhật Goal task-based; xóa Goal giữ Task và gỡ liên kết.
Calendar hiển thị CalendarEvents có giờ và Task có dueDate dưới dạng cả ngày.
Task mẫu được lấy từ mock store: đổi deadline mẫu sẽ chuyển ngày trên lịch;
gỡ deadline hoặc xóa Task sẽ gỡ mục đó, không tạo CalendarEvent trùng lặp.
Task màu vàng, quá hạn màu đỏ, hoàn thành màu xám; sự kiện màu xanh teal.
Bấm mục trên lịch để xem/sửa Task hoặc sự kiện gốc.

Nút **Download .ics** xuất tháng đang xem hoặc toàn bộ lịch, gồm cả sự kiện và
deadline Task. File dùng UTF-8, giờ sự kiện UTC, deadline dùng ngày cả ngày theo
Việt Nam. Trên Google Calendar ở máy tính, mở Settings → Import & export để
nhập file. Đây là bản xuất tại thời điểm tải, không tự đồng bộ các thay đổi sau đó.
Quy tắc xuất theo [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html);
[hướng dẫn nhập Google Calendar](https://support.google.com/calendar/answer/37118).

Ở Calendar, mở **Preview controls** để thử Loading/Error, **Empty data**
hoặc **Reset sample data**. Error có nút Try again. Thay đổi chỉ ở bộ nhớ,
refresh sẽ khôi phục dữ liệu mẫu; dữ liệu này chưa gọi API hay ghi database.
Auth đã gọi backend thật và lưu JWT trong localStorage. Dữ liệu mock được khởi
tạo lại khi đăng xuất/đăng nhập để không giữ thay đổi mẫu của phiên trước.

`npm test` kiểm tra tiến độ Goal, completedAt, gỡ liên kết khi xóa Goal, số liệu
Dashboard, sắp xếp và chuyển ngày giờ UTC+07:00.
Các test Calendar kiểm tra ngày deadline, đổi/xóa Task, ranh giới tháng,
file ICS cả ngày, giờ UTC, ID ổn định và xử lý dấu tiếng Việt/ký tự đặc biệt.

## Cấu hình và các hàm gọi API

Copy `.env.example` thành `.env`. Khi chạy backend local, dùng:

```env
VITE_API_URL=http://localhost:5000/api
```

URL gồm `/api` ở cuối. Khi đổi giá trị, khởi động lại Vite; khi deploy, đặt biến
này trên hosting frontend trước khi build. `.env` không được đưa lên Git.

`src/services/apiClient.js` gọi API bằng `fetch`, gửi JWT cho endpoint cần Auth
và trả nguyên `{ success, data, pagination? }`. Lỗi là `ApiError` với `message`,
`status`, `code`, `field`; `field` dùng để hiển thị lỗi ở ô nhập tương ứng.
Các hàm nhận tùy chọn `{ signal }` ở tham số cuối để hủy request khi cần.

- `authApi.js`: `register`, `login`, `getCurrentUser`, `logout`. Đăng ký/đăng nhập
  thành công lưu JWT bằng `authToken.js`; logout xóa JWT tại máy.
- `taskApi.js`: `listTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask`.
  `updateTask(id, draft)` cần đủ trường chỉnh sửa, kể cả khi chỉ đổi trạng thái.
- `goalApi.js`: `listGoals`, `getGoal`, `createGoal`, `updateGoal`,
  `updateGoalProgress`, `deleteGoal`. Tiến độ manual dùng PATCH riêng.

JWT dùng key `life_os_token` trong localStorage. Request có Auth nhận 401 sẽ xóa
token tương ứng và về Login; đăng nhập sai chỉ trả lỗi để form hiển thị.
Lỗi mạng và response không hợp lệ có mã `NETWORK_ERROR` và `INVALID_RESPONSE`.
Ngày giờ truyền vào service phải là UTC ISO; các trường chỉ đọc không được gửi.

Auth đã nối vào form và có route guard. `AuthProvider` gọi `/auth/me` khi refresh
để xác minh JWT trước khi mở workspace. Nếu server tạm mất kết nối, trang xác minh
có Try again hoặc Back to sign in; không mở nội dung được bảo vệ khi chưa xác minh.
`AuthProvider` dùng `useState` giữ user/trạng thái và `useEffect` kiểm tra phiên
khi mở ứng dụng. Form gọi `login` hoặc `register`; Sidebar gọi `logout`.
`RequireAuth` đọc trạng thái này để mở trang hoặc chuyển về Login.
Không có store quản lý phiên riêng hoặc đồng bộ đăng xuất giữa nhiều tab.

Để kiểm thử thật, backend phải chạy tại URL trong `.env`, kết nối MongoDB và cho
phép CORS từ địa chỉ frontend. Frontend không cần MongoDB URI hoặc JWT secret.
Trang Tasks, Goals và Dashboard đã nối API thật; Calendar vẫn dùng dữ liệu mẫu.

Test service dùng fetch/storage giả, không gọi backend hoặc ghi Atlas.
Các test kiểm tra payload đăng nhập/đăng ký, lưu/xóa JWT, lấy user, xử lý 401,
lỗi API và validation cơ bản. Cần chạy frontend/backend để kiểm thử thao tác thật.

## Trang Tasks dùng API thật

`TasksPage.jsx` gọi API khi mở trang hoặc thay đổi bộ lọc. Backend lọc theo trạng
thái/Goal/quá hạn, sắp xếp và phân trang 8 Task/trang. Bố cục desktop vẫn 4 card
mỗi cột. Loading/lỗi/danh sách trống phản ánh request thật; không dùng Preview controls.

`TaskDialog.jsx` lấy chi tiết mới nhất trước khi sửa, gọi API thêm/sửa/xóa và đổi
trạng thái. `TaskForm.jsx` giữ draft, validate và hiển thị lỗi từng field. Nút gửi
bị khóa trong lúc lưu; lưu lỗi thì giữ nội dung để sửa và thử lại. Xóa cần xác nhận.
Lưu thành công tải lại danh sách và tổng số từ backend; xóa trang cuối sẽ về trang
còn dữ liệu. Task lưu trên backend sẽ còn sau refresh khi backend hoạt động đúng.

Goal ở bộ lọc và form Task lấy từ API thật qua `listAllGoals`, đọc hết các trang.
Goal vừa tạo ở trang Goals sẽ có trong form Task khi mở trang Tasks. Chưa có Goal thật thì vẫn
tạo Task với `goalId: null`. Ngày Task dùng cuối ngày theo múi giờ trình duyệt,
chuyển sang UTC ISO; xóa ngày hoặc Goal trong form gửi `null`.

Calendar vẫn là dữ liệu mẫu, nên chưa phản ánh Task thật vừa lưu.
Tiến độ Goal liên quan do backend cập nhật; frontend không tự tính tiến độ thật.

Bộ lọc overdue ở backend đã chấp nhận cả boolean và chuỗi true/false, nên request từ Express 5 được lọc đúng.

## Trang Goals dùng API thật

`GoalsPage.jsx` tải 8 Goal mỗi trang từ backend, có loading, lỗi/thử lại và danh sách trống.
`GoalForm.jsx` tạo/sửa tiêu đề, deadline và chế độ tiến độ. Deadline dùng cuối ngày
ở múi giờ trình duyệt rồi chuyển sang UTC ISO; có thể để trống hoặc xóa deadline.

`GoalDialog.jsx` tải chi tiết mới trước khi sửa. Goal manual nhận tiến độ ban đầu
khi tạo; sau đó dùng **Save progress** để gọi PATCH riêng (số nguyên 0–100).
Goal task-based chỉ hiển thị tiến độ do backend tính từ Task liên kết, không có ô sửa tay.
Đổi chế độ bằng Edit: backend giữ tiến độ khi chuyển sang manual và tính lại khi về task-based.
Xóa cần xác nhận; backend giữ các Task và gỡ liên kết Goal. Sau thao tác thành công,
danh sách/tổng số được tải lại; xóa hết trang cuối tự quay về trang còn dữ liệu.

## Dashboard dùng API thật

`dashboardApi.js` gọi GET `/dashboard/summary` với JWT để lấy tổng Task, Task hoàn thành,
Task quá hạn và tiến độ trung bình của các Goal active. Frontend hiển thị số liệu backend,
không tự tính lại. Khi chưa có dữ liệu, các thẻ hiển thị 0.

`DashboardPage.jsx` dùng `useState` và `useEffect`. Trang lấy 3 Task mới nhất của mỗi
trạng thái todo/in_progress rồi ghép thành 3 Task chưa hoàn thành mới nhất; không tải
hết Task chỉ để hiển thị phần xem trước. Goal được tải đủ các trang để hiện Goal active
và tên Goal liên kết trong Task. Các form Task/Goal được dùng lại từ trang tương ứng.
Sau khi lưu, trang tải lại số liệu và danh sách. Khi thao tác ở trang khác, quay lại
Dashboard để lấy dữ liệu mới; có thể bấm Refresh để tải lại khi đang ở Dashboard.
Loading, lỗi/thử lại và danh sách trống phản ánh API thật; không có Preview controls.

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
