use sushi_restaurant;
DROP PROCEDURE IF EXISTS CustomerLogin;
DROP PROCEDURE IF EXISTS RegisterCustomer;
DROP PROCEDURE IF EXISTS GetDishes;
DROP PROCEDURE IF EXISTS GetEmployeesList;
DROP PROCEDURE IF EXISTS GetEmployeeServiceStats;
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
DROP PROCEDURE IF EXISTS DeleteEmployee;
DROP PROCEDURE IF EXISTS GetMostOrderedDishesInRange;
DROP PROCEDURE IF EXISTS SearchOrdersByCriteria;
DROP PROCEDURE IF EXISTS SearchInvoicesByCriteria;
DROP PROCEDURE IF EXISTS GetBranchCustomers;
DROP PROCEDURE IF EXISTS GetCustomerDetail;

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

-- Quản lí: Xem danh sách nhân viên
DELIMITER $$
CREATE PROCEDURE GetEmployeesList(
    IN p_branch_id INT,
    IN p_employment_status VARCHAR(10),
    IN p_search VARCHAR(100),
    IN p_page INT,
    IN p_per_page INT
)
BEGIN
    DECLARE offset_val INT;
    SET offset_val = (p_page - 1) * p_per_page;

    -- Get total count first
    SELECT COUNT(DISTINCT e.employee_id) as total
    FROM employee e
    JOIN department d ON d.department_id = e.department_id
    JOIN employee_work_history ewh ON e.employee_id = ewh.employee_id
    WHERE ewh.branch_id = p_branch_id
    AND (
        p_employment_status = 'all'
        OR (p_employment_status = 'current' AND ewh.end_date IS NULL)
        OR (p_employment_status = 'former' AND ewh.end_date IS NOT NULL)
    )
    AND (
        p_search IS NULL 
        OR e.name LIKE CONCAT('%', p_search, '%')
        OR e.phone_number LIKE CONCAT('%', p_search, '%')
        OR e.address LIKE CONCAT('%', p_search, '%')
        OR d.name LIKE CONCAT('%', p_search, '%')
        OR (
            p_search REGEXP '^[0-9]+$' 
            AND e.salary = CAST(p_search AS DECIMAL(10,2))
        )
    );

    -- Then get paginated results
    SELECT 
        e.employee_id,
        e.name,
        e.phone_number,
        e.address,
        e.salary,
        d.name AS department_name,
        ewh.end_date
    FROM employee e
    JOIN department d ON d.department_id = e.department_id
    JOIN employee_work_history ewh ON e.employee_id = ewh.employee_id
    WHERE ewh.branch_id = p_branch_id
    AND (
        p_employment_status = 'all'
        OR (p_employment_status = 'current' AND ewh.end_date IS NULL)
        OR (p_employment_status = 'former' AND ewh.end_date IS NOT NULL)
    )
    AND (
        p_search IS NULL 
        OR e.name LIKE CONCAT('%', p_search, '%')
        OR e.phone_number LIKE CONCAT('%', p_search, '%')
        OR e.address LIKE CONCAT('%', p_search, '%')
        OR d.name LIKE CONCAT('%', p_search, '%')
        OR (
            p_search REGEXP '^[0-9]+$' 
            AND e.salary = CAST(p_search AS DECIMAL(10,2))
        )
    )
    ORDER BY e.employee_id
    LIMIT p_per_page OFFSET offset_val;
END$$
DELIMITER ;

-- Quản lý: Xem điểm phục vụ nhân viên
DELIMITER $$
CREATE PROCEDURE GetEmployeeServiceStats(
    IN p_employee_id INT,
    IN p_period VARCHAR(10),
    IN p_year INT,
    IN p_month INT,
    IN p_year_limit INT
)
BEGIN
    -- First result set: Available years
    SELECT DISTINCT YEAR(o.creation_date) as year
    FROM `order` o
    LEFT JOIN feedback f ON o.order_id = f.order_id
    WHERE o.employee_id = p_employee_id
    AND f.service_rating IS NOT NULL
    ORDER BY year DESC;

    -- Second result set: Period-based stats
    IF p_period = 'day' THEN
        SELECT 
            DATE(o.creation_date) as date,
            CAST(AVG(f.service_rating) AS DECIMAL(10,2)) as avg_service_rating,
            COUNT(*) as total_orders
        FROM `order` o
        LEFT JOIN feedback f ON o.order_id = f.order_id
        WHERE o.employee_id = p_employee_id
        AND (p_year IS NULL OR YEAR(o.creation_date) = p_year)
        AND (p_month IS NULL OR MONTH(o.creation_date) = p_month)
        GROUP BY DATE(o.creation_date)
        ORDER BY date ASC
        LIMIT 30;
    ELSEIF p_period = 'month' THEN
        SELECT 
            DATE_FORMAT(o.creation_date, '%Y-%m') as date,
            CAST(AVG(f.service_rating) AS DECIMAL(10,2)) as avg_service_rating,
            COUNT(*) as total_orders
        FROM `order` o
        LEFT JOIN feedback f ON o.order_id = f.order_id
        WHERE o.employee_id = p_employee_id
        AND (p_year IS NULL OR YEAR(o.creation_date) = p_year)
        GROUP BY DATE_FORMAT(o.creation_date, '%Y-%m')
        ORDER BY date ASC
        LIMIT 12;
    ELSEIF p_period = 'quarter' THEN
        SELECT 
            CONCAT(YEAR(o.creation_date), '-Q', QUARTER(o.creation_date)) as date,
            CAST(AVG(f.service_rating) AS DECIMAL(10,2)) as avg_service_rating,
            COUNT(*) as total_orders
        FROM `order` o
        JOIN feedback f ON o.order_id = f.order_id
        WHERE o.employee_id = p_employee_id
        AND (p_year IS NULL OR YEAR(o.creation_date) = p_year)
        GROUP BY date
        ORDER BY date ASC
        LIMIT 4;
    ELSE
        SELECT 
            YEAR(o.creation_date) as date,
            CAST(AVG(f.service_rating) AS DECIMAL(10,2)) as avg_service_rating,
            COUNT(*) as total_orders
        FROM `order` o
        LEFT JOIN feedback f ON o.order_id = f.order_id
        WHERE o.employee_id = p_employee_id
        GROUP BY YEAR(o.creation_date)
        ORDER BY date ASC
        LIMIT p_year_limit;
    END IF;
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
    DECLARE v_current_branch_id INT;
    DECLARE v_current_department_id INT;
    DECLARE v_basic_salary DECIMAL(10,2);
    
    -- Get current assignment from work history first
    SELECT branch_id, department_id
    INTO v_current_branch_id, v_current_department_id
    FROM EMPLOYEE_WORK_HISTORY
    WHERE employee_id = p_employee_id
    AND end_date IS NULL;
    
    -- Get basic salary for new department
    SELECT basic_salary 
    INTO v_basic_salary
    FROM DEPARTMENT 
    WHERE department_id = p_new_department_id;

    -- Validate transfer
    IF v_current_branch_id = p_new_branch_id AND v_current_department_id = p_new_department_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee is already in the specified branch and department.';
    END IF;

    -- Update old work history first
    UPDATE EMPLOYEE_WORK_HISTORY
    SET end_date = p_transfer_date
    WHERE employee_id = p_employee_id
    AND branch_id = v_current_branch_id
    AND department_id = v_current_department_id
    AND end_date IS NULL;

    -- Then update employee
    UPDATE EMPLOYEE
    SET 
        branch_id = p_new_branch_id,
        department_id = p_new_department_id,
        salary = v_basic_salary
    WHERE 
        employee_id = p_employee_id;

    -- Finally insert new work history
    INSERT INTO EMPLOYEE_WORK_HISTORY (
        employee_id, branch_id, department_id, start_date, end_date
    )
    VALUES (
        p_employee_id, p_new_branch_id, p_new_department_id, p_transfer_date, NULL
    );
END$$
DELIMITER ;

-- Quản lý công ty: Xóa nhân sự
DELIMITER $$
CREATE PROCEDURE DeleteEmployee(
    IN p_employee_id INT,
    IN p_end_date DATE
)
BEGIN
    DECLARE v_active_history_exists INT;
    
    -- Check if employee has active work history
    SELECT COUNT(*) INTO v_active_history_exists
    FROM employee_work_history 
    WHERE employee_id = p_employee_id 
    AND end_date IS NULL;
    
    -- Only proceed if active history exists
    IF v_active_history_exists > 0 THEN
        -- Update employee record (soft delete)
        UPDATE employee 
        SET department_id = NULL,
            branch_id = NULL
        WHERE employee_id = p_employee_id;
        
        -- Update work history end date
        UPDATE employee_work_history 
        SET end_date = p_end_date
        WHERE employee_id = p_employee_id 
        AND end_date IS NULL;
        
        SELECT 'Employee successfully deactivated' as message;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No active work history found for employee';
    END IF;
END$$
DELIMITER ;

-- Quản lý: Xem thống kê món ăn
DELIMITER $$
CREATE PROCEDURE GetMostOrderedDishesInRange(
    IN p_branch_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_sort_by VARCHAR(10),
    IN p_sort_order VARCHAR(4)
)
BEGIN
    SET @branch_id = p_branch_id;
    SET @start_date = p_start_date;
    SET @end_date = p_end_date;
    
    SET @sort_query = CONCAT('
        SELECT 
            d.name,
            IFNULL(SUM(od.quantity), 0) AS quantity,
            IFNULL(SUM(od.quantity * d.price), 0) AS revenue
        FROM 
            DISH d
        LEFT JOIN 
            ORDER_DETAIL od ON d.dish_id = od.dish_id
        LEFT JOIN 
            `ORDER` o ON od.order_id = o.order_id AND o.status = "Completed"
        WHERE 
            (@branch_id IS NULL OR o.branch_id = @branch_id)
            AND (@start_date IS NULL OR o.creation_date >= @start_date)
            AND (@end_date IS NULL OR o.creation_date <= @end_date)
        GROUP BY 
            d.dish_id, d.name
        ORDER BY ', 
        p_sort_by, ' ', p_sort_order
    );
    
    PREPARE stmt FROM @sort_query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
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

-- Quản lý: Xem danh sách và tìm kiếm hoá đơn theo chi nhánh
DELIMITER $$
CREATE PROCEDURE SearchInvoicesByCriteria(
    IN p_branch_id INT,
    IN p_search VARCHAR(255),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_page INT,
    IN p_per_page INT
)
BEGIN
    -- Declare variables for pagination
    DECLARE v_offset INT;
    SET v_offset = (p_page - 1) * p_per_page;

    -- Get total count
    SELECT COUNT(DISTINCT i.invoice_id) as total
    FROM INVOICE i
    JOIN `ORDER` o ON i.order_id = o.order_id
    LEFT JOIN CUSTOMER c ON i.customer_id = c.customer_id
    WHERE o.branch_id = p_branch_id
    AND (p_search IS NULL 
        OR c.name LIKE CONCAT('%', p_search, '%')
        OR i.invoice_id LIKE CONCAT('%', p_search, '%'))
    AND (p_start_date IS NULL OR i.issue_date >= p_start_date)
    AND (p_end_date IS NULL OR i.issue_date <= p_end_date);

    -- Get paginated results
    SELECT 
        i.invoice_id,
        i.issue_date,
        i.total_amount,
        i.discount_amount,
        i.points_earned,
        c.name as customer_name,
        c.customer_id,
        c.phone_number
    FROM INVOICE i
    JOIN `ORDER` o ON i.order_id = o.order_id
    LEFT JOIN CUSTOMER c ON i.customer_id = c.customer_id
    WHERE o.branch_id = p_branch_id
    AND (p_search IS NULL 
        OR c.name LIKE CONCAT('%', p_search, '%')
        OR i.invoice_id LIKE CONCAT('%', p_search, '%'))
    AND (p_start_date IS NULL OR i.issue_date >= p_start_date)
    AND (p_end_date IS NULL OR i.issue_date <= p_end_date)
    ORDER BY i.issue_date DESC
    LIMIT p_per_page
    OFFSET v_offset;
END$$
DELIMITER ;

-- Quản lý: Xem danh sách và tìm kiếm khách hàng theo chi nhánh
DELIMITER $$
CREATE PROCEDURE GetBranchCustomers(
    IN p_branch_id INT,
    IN p_search VARCHAR(100),
    IN p_page INT,
    IN p_per_page INT
)
BEGIN
    DECLARE offset_val INT;
    SET offset_val = (p_page - 1) * p_per_page;

    -- Get total count
    SELECT COUNT(DISTINCT c.customer_id) as total
    FROM customer c
    JOIN `order` o ON c.customer_id = o.customer_id
    WHERE o.branch_id = p_branch_id
    AND (p_search IS NULL 
        OR c.name LIKE CONCAT('%', p_search, '%')
        OR c.phone_number LIKE CONCAT('%', p_search, '%')
        OR c.email LIKE CONCAT('%', p_search, '%')
        OR c.personal_id LIKE CONCAT('%', p_search, '%')
        OR c.gender LIKE CONCAT('%', p_search, '%')
        OR (p_search REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' 
            AND c.date_of_birth = STR_TO_DATE(p_search, '%d/%m/%Y'))
    );

    -- Get paginated results
    SELECT DISTINCT
        c.customer_id,
        c.name,
        c.phone_number,
        c.email,
        c.personal_id,
        c.date_of_birth,
        c.gender,
        mc.card_num
    FROM customer c
    JOIN `order` o ON c.customer_id = o.customer_id
    LEFT JOIN membership_card mc ON c.customer_id = mc.customer_id
    WHERE o.branch_id = p_branch_id
    AND (p_search IS NULL 
        OR c.name LIKE CONCAT('%', p_search, '%')
        OR c.phone_number LIKE CONCAT('%', p_search, '%')
        OR c.email LIKE CONCAT('%', p_search, '%')
        OR c.personal_id LIKE CONCAT('%', p_search, '%')
        OR c.gender LIKE CONCAT('%', p_search, '%')
        OR (p_search REGEXP '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' 
            AND c.date_of_birth = STR_TO_DATE(p_search, '%d/%m/%Y'))
    )
    ORDER BY c.customer_id
    LIMIT p_per_page OFFSET offset_val;
END$$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE GetCustomerDetail(
    IN p_customer_id INT
)
BEGIN
    SELECT 
        c.*,
        mc.card_num,
        mc.type,
        mc.points,
        mc.issue_date,
        mc.discount_amount
    FROM customer c
    LEFT JOIN membership_card mc ON c.customer_id = mc.customer_id
    WHERE c.customer_id = p_customer_id;
END$$
DELIMITER ;