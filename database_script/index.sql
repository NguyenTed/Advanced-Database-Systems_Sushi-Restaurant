ALTER TABLE CUSTOMER ADD FULLTEXT(name);
ALTER TABLE EMPLOYEE ADD FULLTEXT(name);

-- INDEXES
-- CUSTOMER
-- Lấy thông tin khách hàng khi đăng nhập 
CREATE INDEX idx_customer_account_id ON CUSTOMER(account_id);
-- Tìm khách hàng theo số điện thoại hoặc email
CREATE INDEX idx_customer_phone_email ON CUSTOMER(phone_number, email);

-- INVOICE
-- Tìm hóa đơn cho khách hàng 
CREATE INDEX idx_invoice_customer ON INVOICE(customer_id);
-- Tìm hóa đơn cho một đơn hàng
CREATE INDEX idx_invoice_order_date ON INVOICE(order_id, issue_date);

-- ORDER
-- Nhân viên làm việc tại chi nhánh xem hóa đơn
CREATE INDEX idx_order_branch_status ON `ORDER`(branch_id, status);
-- Hiển thị lịch sử đơn hàng của khách hàng
CREATE INDEX idx_order_customer_date ON `ORDER`(customer_id, creation_date);

-- EMPLOYEE
-- Tìm nhân viên theo chi nhánh và bộ phận
CREATE INDEX idx_employee_branch_department ON EMPLOYEE(branch_id, department_id);

-- DISH
-- Lấy món ăn theo danh mục
CREATE INDEX idx_dish_category ON DISH(category_id);

-- BRANCH
-- Tìm kiếm chi nhánh của từng khu vực
CREATE INDEX idx_branch_area ON BRANCH(area_id);

-- ORDER_DETAIL
-- Lấy các món ăn của đơn hàng để tạo hóa đơn và tính tổng tiền thanh toán
CREATE INDEX idx_order_detail ON ORDER_DETAIL(order_id, dish_id);

-- BRACH_DISH_AVAILABILITY
-- Lấy các món ăn của chi nhánh khi đặt bàn trên web
-- Lấy các món ăn của chi nhánh để hiển thị ra menu
CREATE INDEX idx_branch_dish ON BRANCH_DISH_AVAILABILITY(branch_id);

-- Tăng thời gian truy vấn khi xem thống kê doanh thu
CREATE INDEX idx_invoice_issue_date ON INVOICE(issue_date);
CREATE INDEX idx_order_branch_id ON `ORDER`(branch_id);