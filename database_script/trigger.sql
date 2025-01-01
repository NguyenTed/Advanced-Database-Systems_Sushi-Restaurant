use sushi_restaurant;
DELIMITER $$

-- Trigger for CUSTOMER
CREATE TRIGGER before_insert_customer
BEFORE INSERT ON CUSTOMER
FOR EACH ROW
BEGIN
    IF NEW.phone_number IS NOT NULL AND CHAR_LENGTH(NEW.phone_number) <> 10 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Số điện thoại không hợp lệ.';
    END IF;
    IF NEW.personal_id IS NOT NULL AND CHAR_LENGTH(NEW.personal_id) <> 12 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Căn cước công dân không hợp lệ.';
    END IF;
END$$

-- Trigger for INVOICE
CREATE TRIGGER before_insert_invoice
BEFORE INSERT ON INVOICE
FOR EACH ROW
BEGIN
    IF NEW.total_amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tổng tiền phải lớn hơn 0.';
    END IF;
    SET NEW.issue_date = NOW();
END$$

-- Trigger for MEMBERSHIP_CARD
CREATE TRIGGER before_insert_membership_card
BEFORE INSERT ON MEMBERSHIP_CARD
FOR EACH ROW
BEGIN
    IF NEW.type = 'Gold' AND (NEW.points < 1000 OR NEW.points IS NULL) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Thành viên vàng yêu cầu ít nhất 1000 điểm.';
    END IF;
END$$

-- Trigger for EMPLOYEE
CREATE TRIGGER before_insert_employee
BEFORE INSERT ON EMPLOYEE
FOR EACH ROW
BEGIN
    IF NEW.salary IS NOT NULL AND NEW.salary < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tiền lương không thể âm.';
    END IF;
END$$

-- Trigger for BRANCH
CREATE TRIGGER before_insert_branch
BEFORE INSERT ON BRANCH
FOR EACH ROW
BEGIN
    IF NEW.open_time >= NEW.close_time THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Thời gian mở cửa phải sớm hơn thời gian đóng cửa.';
    END IF;
END$$

-- Trigger for ORDER
CREATE TRIGGER before_insert_order
BEFORE INSERT ON `ORDER`
FOR EACH ROW
BEGIN
    SET NEW.creation_date = NOW();
END$$

-- Trigger for FEEDBACK
CREATE TRIGGER before_insert_feedback
BEFORE INSERT ON FEEDBACK
FOR EACH ROW
BEGIN
    IF NEW.service_rating < 1 OR NEW.service_rating > 5 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Đánh giá phải từ 1 đến 5.';
    END IF;
END$$

-- Trigger for DISH
CREATE TRIGGER before_insert_dish
BEFORE INSERT ON DISH
FOR EACH ROW
BEGIN
    IF NEW.price <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Giá của món ăn phải lớn hơn 0';
    END IF;
END$$

-- Trigger for ORDER_DETAIL
CREATE TRIGGER before_insert_order_detail
BEFORE INSERT ON ORDER_DETAIL
FOR EACH ROW
BEGIN
    IF NEW.quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Số lượng phải lớn hơn 0.';
    END IF;
END$$

-- Trigger to validate start_date and end_date before INSERT
CREATE TRIGGER before_insert_employee_work_history
BEFORE INSERT ON employee_work_history
FOR EACH ROW
BEGIN
    IF NEW.end_date IS NOT NULL AND NEW.start_date >= NEW.end_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ngày vào làm phải trước ngày nghỉ làm.';
    END IF;
END$$

-- Trigger to validate start_date and end_date before UPDATE
CREATE TRIGGER before_update_employee_work_history
BEFORE UPDATE ON employee_work_history
FOR EACH ROW
BEGIN
    IF NEW.end_date IS NOT NULL AND NEW.start_date >= NEW.end_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ngày vào làm phải trước ngày nghỉ làm.';
    END IF;
END$$

CREATE TRIGGER before_insert_table
BEFORE INSERT ON `TABLE`
FOR EACH ROW
BEGIN
    IF NEW.capacity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Bàn phải có lớn hơn 0 chỗ ngồi.';
    END IF;
END$$

DELIMITER ;
