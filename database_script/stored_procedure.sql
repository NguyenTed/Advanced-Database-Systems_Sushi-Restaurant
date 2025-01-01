DROP PROCEDURE IF EXISTS CustomerLogin;
DROP PROCEDURE IF EXISTS RegisterCustomer;
DROP PROCEDURE IF EXISTS GetDishes;
DROP PROCEDURE IF EXISTS GetEmployees;
DROP PROCEDURE IF EXISTS CreateOrderDirect;
DROP PROCEDURE IF EXISTS ReserveAndOrderWeb;
DROP PROCEDURE IF EXISTS CreateDeliveryOrder;
DROP PROCEDURE IF EXISTS GetDailyRevenueByMonthYear;
DROP PROCEDURE IF EXISTS GetMonthlyRevenueByYear;
DROP PROCEDURE IF EXISTS GetQuarterlyRevenueByYear;
DROP PROCEDURE IF EXISTS GetYearlyRevenue;
DROP PROCEDURE IF EXISTS GetCustomerInfo;
DROP PROCEDURE IF EXISTS GetEmployeeInfo;
DROP PROCEDURE IF EXISTS TransferEmployee;
DROP PROCEDURE IF EXISTS GetMostOrderedDishesInRange;
DROP PROCEDURE IF EXISTS SearchOrdersByCriteria;
DROP PROCEDURE IF EXISTS SearchInvoicesByCriteria;

-- Chung: Đăng nhập tài khoản
DELIMITER $$
CREATE PROCEDURE CustomerLogin(IN p_username VARCHAR(50))
BEGIN
    DECLARE v_account_id INT;

    -- Kiểm tra tài khoản có tồn tại hay không
    SELECT account_id
    INTO v_account_id
    FROM ACCOUNT
    WHERE username = p_username;

    IF v_account_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid username';
    ELSE
        SELECT * FROM ACCOUNT WHERE account_id = v_account_id;
    END IF;
END$$
DELIMITER ;

-- Khách hàng: Đăng ký tài khoản
DELIMITER $$
CREATE PROCEDURE RegisterCustomer(
    IN p_username VARCHAR(50), 
    IN p_password VARCHAR(255), 
    IN p_name VARCHAR(50), 
    IN p_phone_number VARCHAR(10), 
    IN p_email VARCHAR(50), 
    IN p_personal_id VARCHAR(12), 
    IN p_date_of_birth DATE, 
    IN p_gender ENUM('Male', 'Female')
)
BEGIN
    DECLARE v_account_id INT;

    -- Validate if username already exists
    IF EXISTS (SELECT 1 FROM ACCOUNT WHERE username = p_username) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Username already exists';
    END IF;

    -- Insert into ACCOUNT table
    INSERT INTO ACCOUNT (username, password, role)
    VALUES (p_username, p_password, 'Khách hàng');

    SET v_account_id = LAST_INSERT_ID();

    -- Insert into CUSTOMER table
    INSERT INTO CUSTOMER (name, phone_number, email, personal_id, date_of_birth, gender, account_id)
    VALUES (p_name, p_phone_number, p_email, p_personal_id, p_date_of_birth, p_gender, v_account_id);

    SELECT 'Registration successful' AS message;
END$$
DELIMITER ;

-- Khách hàng: Xem và tìm kiếm món ăn
DELIMITER $$
CREATE PROCEDURE GetDishes(
    IN search_keyword VARCHAR(100),
    IN category_id INT,
    IN area_id INT,
    IN branch_id INT
)
BEGIN
    SELECT distinct
        d.dish_id,
        d.name,
        d.img_url,
        d.price,
        d.description
    FROM dish d
		JOIN category c ON d.category_id = c.category_id
		JOIN area_dish_availability ada ON d.dish_id = ada.dish_id
		JOIN area a ON ada.area_id = a.area_id
		JOIN branch_dish_availability bda ON d.dish_id = bda.dish_id
		JOIN branch b ON bda.branch_id = b.branch_id
    WHERE (search_keyword IS NULL 
           OR d.name LIKE CONCAT('%', search_keyword, '%') 
           OR d.description LIKE CONCAT('%', search_keyword, '%'))
      AND (category_id IS NULL OR d.category_id = category_id)
      AND (area_id IS NULL OR ada.area_id = area_id)
      AND (branch_id IS NULL OR bda.branch_id = branch_id);
END$$
DELIMITER ;

-- Quản lí: Nhân viên xem danh sách và tìm kiếm nhân viên ??????
DELIMITER $$
CREATE PROCEDURE GetEmployees(
    IN branch_id INT,
    IN emp_name VARCHAR(50) -- Thêm tham số tìm kiếm theo tên
)
BEGIN
    SELECT 
        e.employee_id, 
        e.name, 
        e.date_of_birth, 
        e.gender, 
        e.phone_number, 
        e.address, 
        e.salary, 
        e.department_id, 
        d.name AS department_name
    FROM 
        employee e
    JOIN 
        department d 
    ON 
        d.department_id = e.department_id
    WHERE 
        (branch_id = branch_id OR branch_id IS NULL) -- Trả về tất cả nếu branch_id là NULL
        AND (emp_name IS NULL OR e.name LIKE CONCAT('%', emp_name, '%')) -- Tìm theo tên nếu có
	ORDER BY
		e.employee_id ASC;
END$$
DELIMITER ;

-- Nhân viên: Tạo đơn trực tiếp
DELIMITER $$
CREATE PROCEDURE CreateOrderDirect(
    IN emp_id INT, 
    IN branch_id INT, 
    IN customer_id INT, 
    IN table_id INT,
    IN num_guest INT, 
    IN items JSON
)
BEGIN
    DECLARE new_order_id INT;

    -- Tạo đơn hàng trong bảng ORDER
    INSERT INTO `ORDER` (employee_id, branch_id, customer_id, creation_date, status)
    VALUES (emp_id, branch_id, customer_id, NOW(), 'Pending');
    
    -- Lấy ID đơn hàng vừa tạo
    SET new_order_id = LAST_INSERT_ID();

    -- Tạo thông tin đặt bàn trong bảng EAT_IN_ORDER
    INSERT INTO EAT_IN_ORDER (eat_in_order_id, serving_date, num_guest, branch_id, table_id)
    VALUES (new_order_id, NOW(), num_guest, branch_id, table_id);

    -- Chèn thông tin chi tiết món ăn vào bảng ORDER_DETAIL
    INSERT INTO ORDER_DETAIL (order_id, dish_id, quantity)
    SELECT new_order_id, jt.dish_id, jt.quantity
    FROM JSON_TABLE(items, '$[*]' COLUMNS (
        dish_id INT PATH '$.item_id',
        quantity INT PATH '$.quantity'
    )) AS jt;
END$$
DELIMITER ;

-- Khách hàng: đặt bàn qua web
DELIMITER $$
CREATE PROCEDURE ReserveAndOrderWeb(
    IN customer_id INT, 
    IN branch_id INT, 
    IN num_guest INT, 
    IN serving_date DATETIME,
    IN items JSON
)
BEGIN
    DECLARE order_id INT;
    DECLARE chosen_table_id INT;

    -- Chọn bàn phù hợp với số lượng khách
    SELECT table_id INTO chosen_table_id
    FROM `TABLE`
    WHERE branch_id = branch_id AND capacity >= num_guest 
    ORDER BY capacity LIMIT 1;

    IF chosen_table_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No available table for the specified number of guests';
    END IF;

    -- Tạo đơn hàng trong bảng ORDER
    INSERT INTO `ORDER` (customer_id, branch_id, creation_date, status, employee_id)
    VALUES (customer_id, branch_id, NOW(), 'Pending', NULL);
    
    -- Lấy ID đơn hàng vừa tạo
    SET order_id = LAST_INSERT_ID();
    SELECT order_id;

    -- Tạo thông tin đặt bàn trong bảng EAT_IN_ORDER
    INSERT INTO EAT_IN_ORDER (eat_in_order_id, serving_date, num_guest, branch_id, table_id)
    VALUES (order_id, serving_date, num_guest, branch_id, chosen_table_id);

    -- Chèn thông tin chi tiết món ăn vào bảng ORDER_DETAIL
    INSERT INTO ORDER_DETAIL (order_id, dish_id, quantity)
    SELECT order_id, jt.dish_id, jt.quantity
    FROM JSON_TABLE(items, '$[*]' COLUMNS (
        dish_id INT PATH '$.dish_id',
        quantity INT PATH '$.quantity'
    )) AS jt;
END$$
DELIMITER ;

CALL ReserveAndOrderWeb(1, 5, 4, '2025-01-02 06:18:00', [{"dish_id": 1,"quantity": 3},{"dish_id": 2,"quantity": 3},{"dish_id": 11,"quantity": 1}])

-- Khách hàng: đặt đơn mang đi qua web
DELIMITER $$
CREATE PROCEDURE CreateDeliveryOrder(
    IN customer_id INT, 
    IN branch_id INT, 
    IN delivery_address VARCHAR(255), 
    IN delivery_time DATETIME, 
    IN items JSON
)
BEGIN
    DECLARE new_order_id INT;

    -- Tạo đơn hàng trong bảng ORDER
    INSERT INTO `ORDER` (customer_id, branch_id, creation_date, status, employee_id)
    VALUES (customer_id, branch_id, NOW(), 'Pending', NULL);

    -- Lấy ID đơn hàng vừa tạo
    SET new_order_id = LAST_INSERT_ID();

    -- Tạo thông tin giao hàng trong bảng DELIVERY_ORDER
    INSERT INTO DELIVERY_ORDER (delivery_order_id, delivery_address, delivery_date)
    VALUES (new_order_id, delivery_address, delivery_time);

    -- Chèn thông tin chi tiết món ăn vào bảng ORDER_DETAIL
    INSERT INTO ORDER_DETAIL (order_id, dish_id, quantity)
    SELECT new_order_id, jt.dish_id, jt.quantity
    FROM JSON_TABLE(items, '$[*]' COLUMNS (
        dish_id INT PATH '$.dish_id',
        quantity INT PATH '$.quantity'
    )) AS jt;
END$$
DELIMITER ;

-- Quản lý: Xem thống kê chi nhánh mỗi ngày của tháng
DELIMITER $$
CREATE PROCEDURE GetDailyRevenueByMonthYear(IN branch_id INT, IN in_year INT, IN in_month INT)
BEGIN
    SELECT
        DATE(i.issue_date) AS date,
        SUM(i.total_amount) AS revenue
    FROM `ORDER` o
    JOIN INVOICE i ON o.order_id = i.order_id
    WHERE 
		(o.branch_id = branch_id OR branch_id IS NULL)
        AND YEAR(i.issue_date) = in_year
        AND MONTH(i.issue_date) = in_month
    GROUP BY date
    ORDER BY date;
END$$
DELIMITER ;

-- Quản lý: Xem thống kê chi nhánh mỗi tháng của quý
DELIMITER $$
CREATE PROCEDURE GetMonthlyRevenueByYear(IN branch_id INT, IN in_year INT)
BEGIN
    SELECT
        DATE_FORMAT(i.issue_date, '%Y-%m') as date,
        SUM(i.total_amount) AS revenue
    FROM `ORDER` o
		JOIN INVOICE i ON o.order_id = i.order_id
    WHERE 
		(o.branch_id = branch_id OR branch_id IS NULL)
        AND YEAR(i.issue_date) = in_year
    GROUP BY date
    ORDER BY date;
END$$
DELIMITER ;

-- Quản lý: Xem thống kê chi nhánh mỗi quý của năm
DELIMITER $$
CREATE PROCEDURE GetQuarterlyRevenueByYear(IN branch_id INT, IN in_year INT)
BEGIN
    SELECT
        CONCAT(YEAR(i.issue_date), '-Q', QUARTER(i.issue_date)) as date,
        SUM(i.total_amount) AS revenue
    FROM `ORDER` o
    JOIN INVOICE i ON o.order_id = i.order_id
    WHERE
		(o.branch_id = branch_id OR branch_id IS NULL)
        AND YEAR(i.issue_date) = in_year
    GROUP BY date
    ORDER BY date;
END$$
DELIMITER ;

-- Quản lý: Xem thống kê chi nhánh mỗi năm
DELIMITER $$
CREATE PROCEDURE GetYearlyRevenue(IN branch_id INT)
BEGIN
    SELECT
        YEAR(o.creation_date) AS date,
        SUM(i.total_amount) AS revenue
    FROM `ORDER` o
    JOIN INVOICE i ON o.order_id = i.order_id
    WHERE 
		(o.branch_id = branch_id OR branch_id IS NULL)
    GROUP BY date
    ORDER BY date;
END$$
DELIMITER ;

call GetDailyRevenueByMonthYear(5, 2024, 5);
call GetMonthlyRevenueByYear(5, 2024);

-- Nhân viên: Xem thông tin cá nhân
DELIMITER $$
CREATE PROCEDURE GetEmployeeInfo(
    IN p_employee_id INT
)
BEGIN
    SELECT 
        e.*,
        d.name AS department_name,
        b.name AS branch_name
    FROM 
        EMPLOYEE E
    JOIN 
        DEPARTMENT d ON e.department_id = d.department_id
	JOIN
		BRANCH b ON e.branch_id = b.branch_id
    WHERE 
        e.employee_id = p_employee_id;
END$$
DELIMITER ;

-- Khách hàng: Xem thông tin cá nhân
DELIMITER $$
CREATE PROCEDURE GetCustomerInfo(
    IN p_customer_id INT
)
BEGIN
    SELECT 
        c.customer_id AS CustomerID,
        c.name AS CustomerName,
        c.phone_number AS PhoneNumber,
        c.email AS Email,
        c.personal_id AS PersonalID,
        c.date_of_birth AS DateOfBirth,
        c.gender AS Gender,
        m.card_num AS MembershipCardNumber,
        m.type AS MembershipType,
        m.points AS Points,
        m.discount_amount AS DiscountAmount,
        m.issue_date AS MembershipIssueDate
    FROM 
        CUSTOMER c
    LEFT JOIN 
        MEMBERSHIP_CARD m 
        ON c.customer_id = m.customer_id
    WHERE 
        c.customer_id = p_customer_id;
END$$
DELIMITER ;

-- Quản lý công ty: Chuyển nhân sự
DELIMITER $$
CREATE PROCEDURE TransferEmployee(
    IN p_employee_id INT,
    IN p_new_branch_id INT,
    IN p_new_department_id INT,
    IN p_transfer_date DATE
)
BEGIN
    -- Declare variables to store current branch and department
    DECLARE v_current_branch_id INT;
    DECLARE v_current_department_id INT;

    -- Fetch current branch and department
    SELECT branch_id, department_id
    INTO v_current_branch_id, v_current_department_id
    FROM EMPLOYEE
    WHERE employee_id = p_employee_id;

    -- Check if the employee already belongs to the new branch and department
    IF v_current_branch_id = p_new_branch_id AND v_current_department_id = p_new_department_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee is already in the specified branch and department.';
    END IF;

    -- Update the current record in EMPLOYEE_WORK_HISTORY to set the end_date
    UPDATE EMPLOYEE_WORK_HISTORY
    SET end_date = p_transfer_date
    WHERE employee_id = p_employee_id
      AND branch_id = v_current_branch_id
      AND department_id = v_current_department_id
      AND end_date IS NULL;

    -- Update the EMPLOYEE table with the new branch and department
    UPDATE EMPLOYEE
    SET 
        branch_id = p_new_branch_id,
        department_id = p_new_department_id
    WHERE 
        employee_id = p_employee_id;

    -- Insert a new record into EMPLOYEE_WORK_HISTORY for the new assignment
    INSERT INTO EMPLOYEE_WORK_HISTORY (
        employee_id,
        branch_id,
        department_id,
        start_date,
        end_date
    )
    VALUES (
        p_employee_id,
        p_new_branch_id,
        p_new_department_id,
        p_transfer_date,
        NULL
    );
END$$
DELIMITER ;

-- Quản lý: Xem thống kê món ăn
DELIMITER $$
CREATE PROCEDURE GetMostOrderedDishesInRange(
	IN in_branch_id INT,
	IN startDate DATE,
    IN endDate DATE
)
BEGIN
    SELECT 
        d.dish_id,
        d.name AS dish_name,
        d.price,
        SUM(od.quantity) AS total_quantity_ordered
    FROM 
        ORDER_DETAIL od
    JOIN 
        DISH d ON od.dish_id = d.dish_id
	JOIN 
        `ORDER` o ON od.order_id = o.order_id
    WHERE 
		(o.branch_id = branch_id OR branch_id IS NULL)
        AND o.creation_date BETWEEN startDate AND endDate
    GROUP BY 
        d.dish_id, d.name, d.price
    ORDER BY 
        total_quantity_ordered DESC;
END$$
DELIMITER ;

-- Quản lý: Xem danh sách và tìm kiếm đơn hàng toàn công ty và theo chi nhánh
DELIMITER $$
CREATE PROCEDURE SearchOrdersByCriteria(
    IN searchTerm VARCHAR(255),
    IN startDate DATE,
    IN endDate DATE,
    IN branchId INT
)
BEGIN
    SELECT 
        o.order_id,
        o.creation_date,
        o.status,
        c.name AS customer_name,
        c.phone_number AS customer_phone,
        e.name AS employee_name,
        b.name AS branch_name,
        IFNULL(SUM(od.quantity * d.price), 0) AS total_amount
    FROM 
        `ORDER` o
    LEFT JOIN 
        CUSTOMER c ON o.customer_id = c.customer_id
    LEFT JOIN 
        EMPLOYEE e ON o.employee_id = e.employee_id
    JOIN 
        BRANCH b ON o.branch_id = b.branch_id
    LEFT JOIN 
        ORDER_DETAIL od ON o.order_id = od.order_id
    LEFT JOIN 
        DISH d ON od.dish_id = d.dish_id
    WHERE 
        (branchId IS NULL OR o.branch_id = branchId)
        AND (startDate IS NULL OR endDate IS NULL OR DATE(o.creation_date) BETWEEN startDate AND endDate)
        AND (MATCH(c.name, c.phone_number) AGAINST (searchTerm IN NATURAL LANGUAGE MODE)
             OR MATCH(e.name) AGAINST (searchTerm IN NATURAL LANGUAGE MODE)
             OR o.order_id LIKE CONCAT('%', searchTerm, '%')
             OR o.status LIKE CONCAT('%', searchTerm, '%')
             OR b.name LIKE CONCAT('%', searchTerm, '%'))
    GROUP BY 
        o.order_id, o.creation_date, o.status, c.name, c.phone_number, e.name, b.name
    ORDER BY 
        o.creation_date DESC;
END$$
DELIMITER ;

-- Quản lý: Xem danh sách và tìm kiếm hoá đơn toàn công ty và theo chi nhánh
DELIMITER $$
CREATE PROCEDURE SearchInvoicesByCriteria(
    IN searchTerm VARCHAR(255),
    IN startDate DATE,
    IN endDate DATE,
    IN branchId INT
)
BEGIN
    SELECT 
        i.invoice_id,
        i.order_id,
        i.total_amount,
        i.discount_amount,
        i.points_earned,
        i.issue_date,
        c.name AS customer_name,
        c.email AS customer_email,
        c.phone_number AS customer_phone,
        b.name AS branch_name
    FROM 
        INVOICE i
    LEFT JOIN 
        CUSTOMER c ON i.customer_id = c.customer_id
    JOIN 
        `ORDER` o ON i.order_id = o.order_id
    JOIN 
        BRANCH b ON o.branch_id = b.branch_id
    WHERE 
        (branchId IS NULL OR b.branch_id = branchId)
        AND (startDate IS NULL OR endDate IS NULL OR i.issue_date BETWEEN startDate AND endDate)
        AND (MATCH(i.total_amount, i.discount_amount, i.points_earned) AGAINST (searchTerm IN NATURAL LANGUAGE MODE)
             OR MATCH(c.name, c.email) AGAINST (searchTerm IN NATURAL LANGUAGE MODE)
             OR i.invoice_id LIKE CONCAT('%', searchTerm, '%')
             OR i.order_id LIKE CONCAT('%', searchTerm, '%')
             OR c.phone_number LIKE CONCAT('%', searchTerm, '%'))
    ORDER BY 
        i.issue_date DESC;
END$$
DELIMITER ;