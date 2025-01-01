-- Kịch bản 1: 1. Khách hàng xem danh sách và tìm kiếm món ăn
DELIMITER $$
CREATE PROCEDURE GetDishes(IN search_keyword VARCHAR(100))
BEGIN
    SELECT dish_id, name, price, description
    FROM dish
    WHERE name LIKE CONCAT('%', search_keyword, '%')
       OR description LIKE CONCAT('%', search_keyword, '%');
END$$
DELIMITER ;