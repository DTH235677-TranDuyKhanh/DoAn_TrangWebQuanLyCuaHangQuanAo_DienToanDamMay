# Do An Trang Web Quản Lý Cửa Hàng Quần Áo

Dự án là một trang web quản lý cửa hàng quần áo xây dựng bằng Node.js, Express, EJS và MongoDB.

## 1. Giới thiệu

Ứng dụng cho phép:
- Xem trang chủ, danh sách sản phẩm, danh mục
- Tìm kiếm sản phẩm
- Quản lý giỏ hàng và thanh toán đơn hàng
- Đăng ký/đăng nhập người dùng, đăng nhập bằng Google OAuth
- Gửi tin nhắn liên hệ và đăng ký nhận tin
- Quản trị viên quản lý sản phẩm và danh mục

## 2. Cài đặt

### 2.1. Cài Node.js

Hãy cài phiên bản Node.js mới nhất hoặc tương thích (>= 18).

### 2.2. Cài phụ thuộc

Mở terminal tại thư mục gốc dự án và chạy:

```bash
npm install
```

## 3. Cấu hình môi trường

Tạo file `.env` trong thư mục gốc nếu chưa có. File `.env` cần chứa các biến sau:

```env

PORT=3000
SESSION_NAME=iNews
SESSION_SECRET=MeoMeoMeoMeoMeoMeo
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://your-domain/nguoi-dung/dang-nhap/google/callback
```

### Ghi chú:
- 'Google OAuth 2.0 API': API đăng nhập bằng gmail.
- `MONGODB_URI`: nếu không cấu hình, ứng dụng sẽ dùng MongoDB mặc định trong `index.js`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: cần để kích hoạt Google OAuth.
- `GOOGLE_CALLBACK_URL`: URL callback đăng ký trong Google Cloud Console.

## 4. Chạy ứng dụng

```bash
npm start
```

Hoặc chạy chế độ phát triển:

```bash
npm run dev
```

Mặc định app lắng nghe trên `PORT` trong `.env`, nếu không có sẽ dùng `3000`.

## 5. Cấu trúc chính của ứng dụng

- `index.js`: khởi tạo Express, load `.env`, kết nối MongoDB, cấu hình session và mount router.
- `src/routes`: chứa tất cả các route xử lý giao diện và API.
- `src/models`: chứa các schema Mongoose cho dữ liệu.
- `src/views`: chứa các template EJS.
- `src/data`: chứa dữ liệu mẫu JSON tham khảo (không được app tự động dùng).

## 6. Luồng dữ liệu chính

### 6.1. Khởi tạo ứng dụng

1. `index.js` load biến môi trường bằng `dotenv`.
2. Kết nối tới MongoDB bằng `mongoose`.
3. Cấu hình session với `express-session`.
4. Mount router chung từ `src/routes/index.js`.

### 6.2. Trang chủ và tìm kiếm

- `GET /`: lấy danh mục active và sản phẩm nổi bật từ MongoDB rồi render `trang_chu.ejs`.
- `GET /about`: render trang `about.ejs`.
- `GET /contact`: render trang `contact.ejs`.
- `GET /search?q=...`: tìm sản phẩm theo tên, mô tả hoặc tags.
- `POST /subscribe`: lưu email đăng ký nhận tin vào collection `subscriptions`.

### 6.3. Sản phẩm và danh mục

- `GET /san-pham`: hiển thị danh sách sản phẩm active với lọc `category` và tìm kiếm `q`.
- `GET /san-pham/:slug`: hiển thị chi tiết sản phẩm.
- `GET /danh-muc`: hiển thị danh sách danh mục.

### 6.4. Đăng ký / đăng nhập / Google OAuth

#### Đăng ký
- `GET /nguoi-dung/dang-ky`: hiển thị form đăng ký.
- `POST /nguoi-dung/dang-ky`: lưu user mới vào MongoDB.

#### Đăng nhập
- `GET /nguoi-dung/dang-nhap`: hiển thị trang đăng nhập.
- `POST /nguoi-dung/dang-nhap`: xác thực email và password.
- `GET /nguoi-dung/dang-xuat`: xóa session và logout.

#### Google OAuth
- `GET /nguoi-dung/dang-nhap/google`: chuyển hướng đến Google OAuth.
- `GET /nguoi-dung/dang-nhap/google/callback`: nhận `code`, đổi lấy access token và dữ liệu user.
- Nếu user chưa tồn tại thì tạo mới trong collection `users`.

#### Tài khoản người dùng
- `GET /nguoi-dung/tai-khoan`: hiển thị thông tin hiện tại.
- `POST /nguoi-dung/tai-khoan`: cập nhật thông tin hồ sơ.

### 6.5. Giỏ hàng và đặt hàng

Giỏ hàng được lưu trong `req.session.cart`.

- `GET /don-hang/gio-hang`: hiển thị giỏ hàng hiện tại.
- `POST /don-hang/gio-hang/them`: thêm sản phẩm vào giỏ hàng.
- `GET /don-hang/thanh-toan`: hiển thị form thanh toán.
- `POST /don-hang/thanh-toan`: tạo đơn hàng mới trong collection `orders`, sau đó xóa giỏ hàng.

Luồng dữ liệu giỏ hàng:
1. Người dùng thêm sản phẩm -> ghi session `cart`.
2. Kiểm tra `cart.items` và `cart.totalPrice` ở trang thanh toán.
3. Tạo đơn hàng với thông tin vận chuyển và phương thức thanh toán.
4. Lưu đơn hàng vào MongoDB.

### 6.6. Liên hệ và đăng ký nhận tin

- `GET /lien-he`: hiển thị trang liên hệ.
- `POST /lien-he`: lưu tin nhắn liên hệ vào collection `contactmessages`.
- `POST /lien-he/dang-ky-nhan-tin`: lưu email đăng ký vào collection `subscriptions`.

## 7. Quản trị viên

Router admin (`/admin`) được bảo vệ bằng middleware `ensureManager`.
Chỉ user có role `manager` hoặc `admin` mới truy cập được.

Các trang quản trị:
- `GET /admin`: dashboard tổng quan.
- `GET /admin/products`: danh sách sản phẩm.
- `GET /admin/products/new`: form thêm sản phẩm.
- `POST /admin/products`: tạo sản phẩm.
- `GET /admin/products/:id/edit`: form sửa sản phẩm.
- `POST /admin/products/:id/edit`: cập nhật sản phẩm.
- `POST /admin/products/:id/delete`: xóa sản phẩm.
- `GET /admin/categories`: danh sách danh mục.
- `GET /admin/categories/new`: form thêm danh mục.
- `POST /admin/categories`: tạo danh mục.
- `GET /admin/categories/:id/edit`: form sửa danh mục.
- `POST /admin/categories/:id/edit`: cập nhật danh mục.
- `POST /admin/categories/:id/delete`: xóa danh mục.

## 8. API chính

### Người dùng
- `GET /nguoi-dung/api`
- `GET /nguoi-dung/api/:id`
- `PUT /nguoi-dung/api/:id`
- `DELETE /nguoi-dung/api/:id`

### Sản phẩm
- `GET /san-pham/api`
- `POST /san-pham/api` (manager/admin)
- `GET /san-pham/api/:id`
- `PUT /san-pham/api/:id` (manager/admin)
- `DELETE /san-pham/api/:id` (manager/admin)

### Danh mục
- `GET /danh-muc/api`
- `POST /danh-muc/api` (manager/admin)
- `GET /danh-muc/api/:id`
- `PUT /danh-muc/api/:id` (manager/admin)
- `DELETE /danh-muc/api/:id` (manager/admin)

### Đơn hàng
- `GET /don-hang/api`
- `GET /don-hang/api/:id`
- `PUT /don-hang/api/:id`
- `DELETE /don-hang/api/:id`

### Liên hệ
- `GET /lien-he/api`
- `GET /lien-he/api/:id`
- `DELETE /lien-he/api/:id`

## 9. Dữ liệu mẫu

Thư mục `src/data` chứa các file JSON mẫu:
- `categories.json`
- `products.json`
- `users.json`
- `orders.json`
- `contactmessages.json`
- `subscriptions.json`

> Các file này chỉ là dữ liệu tham khảo. Ứng dụng hiện tại không tự động import chúng, nhưng bạn có thể dùng MongoDB Compass hoặc script seed để nạp dữ liệu.

## 10. Ghi chú quan trọng

- `src/routes/nguoi_dung.js` sử dụng password plain text. Trong môi trường thực tế, cần hash password trước khi lưu.
- `session` được lưu trong server memory; với môi trường sản xuất nên dùng store riêng.
- `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` phải được cung cấp nếu muốn bật đăng nhập -  Google.
