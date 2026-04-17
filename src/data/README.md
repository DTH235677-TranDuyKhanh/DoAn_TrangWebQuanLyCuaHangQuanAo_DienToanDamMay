# Dữ liệu mẫu cho dự án

Thư mục `src/data` chứa các file JSON mẫu dùng để khởi tạo hoặc tham khảo dữ liệu cho các collection trong MongoDB.

## Các file dữ liệu

- `categories.json` - danh mục sản phẩm
- `products.json` - thông tin sản phẩm
- `users.json` - người dùng và tài khoản
- `orders.json` - đơn hàng đã đặt
- `contactmessages.json` - tin nhắn liên hệ từ khách hàng
- `subscriptions.json` - email đăng ký nhận bản tin

## Mục đích

- Dùng để seed dữ liệu khi khởi tạo môi trường phát triển.
- Giúp kiểm thử giao diện và chức năng khi chưa có dữ liệu thật.
- Tham khảo cấu trúc dữ liệu và trường dữ liệu của từng collection.

## Cách dùng

1. Import trực tiếp vào MongoDB Compass hoặc MongoDB Shell.
2. Với script seed, đọc các file JSON và tạo bản ghi cho collection tương ứng.
3. Đảm bảo cấu trúc JSON khớp với schema hiện tại trong `src/models`.

## Lưu ý

- Dữ liệu trong thư mục này chỉ dùng cho môi trường phát triển hoặc demo.
- Khi deploy vào sản phẩm thật, bạn nên xóa hoặc thay thế bằng dữ liệu thực tế.
