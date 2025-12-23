# ĐỒ ÁN: OAUTH / OPENID CONNECT SYSTEM

## 1. Goals and Objectives

### 1.1. Goal (Mục tiêu tổng quát)
Mục tiêu của đồ án là xây dựng một **hệ thống OAuth 2.0 và OpenID Connect hoàn chỉnh**, bao gồm **Authorization Server** và **Client Application**, nhằm mô phỏng cơ chế xác thực và ủy quyền hiện đại được sử dụng rộng rãi trong các hệ thống web hiện nay.

Hệ thống cho phép người dùng đăng nhập thông qua cơ chế OAuth/OpenID Connect thay vì sử dụng tài khoản cục bộ, từ đó nâng cao tính bảo mật, khả năng mở rộng và trải nghiệm người dùng.

---

### 1.2. Objectives (Mục tiêu cụ thể)

#### 1.2.1. Đối với Authorization Server
Hệ thống Authorization Server cần đáp ứng các mục tiêu sau:
- Cung cấp cơ chế **xác thực người dùng**
- Cấp phát **Authorization Code**
- Cấp phát **Access Token**
- Cấp phát **ID Token** theo chuẩn OpenID Connect
- Xác thực và quản lý thông tin người dùng
- Đảm bảo quy trình xác thực tuân theo chuẩn OAuth 2.0 và OpenID Connect

---

#### 1.2.2. Đối với Client Application
Client Application đóng vai trò là ứng dụng sử dụng OAuth/OpenID Connect, với các mục tiêu:
- Thực hiện đăng nhập người dùng thông qua Authorization Server
- Nhận và xử lý Access Token / ID Token
- Sử dụng thông tin định danh người dùng sau khi xác thực thành công
- Không yêu cầu người dùng tạo tài khoản riêng trên Client Application

---

#### 1.2.3. Ứng dụng minh hoạ
Một **website bán hàng thời trang** được xây dựng nhằm:
- Đóng vai trò **Client Application minh hoạ**
- Kiểm chứng khả năng tích hợp OAuth/OpenID Connect vào hệ thống web thực tế
- Mô phỏng kịch bản người dùng đăng nhập và sử dụng dịch vụ sau khi được xác thực

---

### 1.3. Technical Objectives (Mục tiêu kỹ thuật)
- Áp dụng chuẩn **OAuth 2.0** trong xác thực và uỷ quyền
- Áp dụng chuẩn **OpenID Connect** cho xác thực danh tính
- Tách biệt rõ ràng giữa **Authorization Server** và **Client Application**
- Đảm bảo luồng xác thực an toàn và đúng chuẩn
- Thiết kế hệ thống có thể mở rộng cho nhiều client khác nhau trong tương lai

---

## 2. System Overview

### 2.1. Authorization Server
Authorization Server chịu trách nhiệm:
- Xác thực người dùng
- Cấp phát token
- Quản lý thông tin định danh
- Đảm bảo an toàn trong quá trình xác thực

---

### 2.2. Client Application
Client Application là ứng dụng sử dụng dịch vụ xác thực từ Authorization Server.  
Trong đồ án này, **website bán hàng thời trang** được sử dụng làm client để minh hoạ quá trình tích hợp OAuth/OpenID Connect vào hệ thống web.

---

## 3. Technologies Used
- **Ngôn ngữ lập trình:** JavaScript
- **Backend:** Node.js, Express
- **Authentication & Authorization:** OAuth 2.0, OpenID Connect
- **Database:** SQLite
- **Template Engine:** EJS
- **Frontend:** HTML, CSS
- **Session Management:** express-session

---

## 4. Authentication Flow Overview
Hệ thống thực hiện luồng xác thực theo chuẩn OAuth 2.0 / OpenID Connect:
1. Người dùng truy cập Client Application
2. Client chuyển hướng người dùng tới Authorization Server
3. Người dùng đăng nhập tại Authorization Server
4. Authorization Server cấp Authorization Code
5. Client đổi Authorization Code lấy Access Token và ID Token
6. Người dùng được xác thực và truy cập hệ thống

---

## 5. Conclusion
Đồ án đã xây dựng thành công một **hệ thống OAuth / OpenID Connect hoàn chỉnh**, đáp ứng đầy đủ các thành phần cốt lõi của cơ chế xác thực và uỷ quyền hiện đại.

Client Application được xây dựng nhằm minh hoạ khả năng tích hợp OAuth/OpenID Connect vào một hệ thống web thực tế, từ đó chứng minh tính ứng dụng và hiệu quả của mô hình.

---

## 6. References
- OAuth 2.0 Specification
- OpenID Connect Core Specification
- Node.js Documentation
- Express.js Documentation
