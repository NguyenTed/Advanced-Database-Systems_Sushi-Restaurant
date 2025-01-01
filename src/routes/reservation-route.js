import { Router } from 'express';
import { db } from '../config/db.js';

const routes = Router();

routes.use((req, res, next) => {
  res.profile = req.profile;
  next();
});

routes.get('/dat-ban', async (req, res) => {
  try {
    if (!req.profile || !req.profile.customer_id) {
      return res.redirect('/tai-khoan/dang-nhap');
    }

    const branches = await db.select('branch_id', 'name').from('branch');

    res.render('layout/main-layout', {
      title: 'Đặt bàn | Samurai Sushi',
      description: 'Đặt bàn tại Samurai Sushi',
      content: '../pages/reservation.ejs',
      branches
    });
  } catch (error) {
    console.error('Error fetching branches:', error.message);
    res.status(500).send('Error loading branch');
  }
});

routes.get('/api/branches/:branchId/dishes', async (req, res) => {
  const { branchId } = req.params;

  try {
    const dishes = await db('dish')
      .join('branch_dish_availability', 'dish.dish_id', 'branch_dish_availability.dish_id')
      .where('branch_dish_availability.branch_id', branchId)
      .select('dish.dish_id', 'dish.name', 'dish.price');

    res.json(dishes);
  } catch (error) {
    console.error('Error fetching dishes:', error.message);
    res.status(500).send('Error loading dishes');
  }
});

routes.post('/dat-ban', async (req, res) => {
  const { branch_id, date, time, guests, dishes } = req.body;

  try {
    // Chọn bàn với capacity phù hợp
    const table = await db('table').select('table_id').where('branch_id', branch_id).andWhere('capacity', '>=', guests).orderByRaw('RAND()').first();
    if (!table) {
      return res.status(400).send('Không có bàn phù hợp tại chi nhánh');
    }
    const table_id = table.table_id;

    // Tạo order và lưu vào bảng order
    const reservationDate = new Date(`${date}T${time}`);
    const [order_id] = await db('order')
      .insert({
        creation_date: new Date(),
        status: 'Pending',
        branch_id: branch_id,
        customer_id: req.profile.customer_id
      })
      .returning('order_id');

    // Lưu vào bảng eat_in_order
    await db('eat_in_order').insert({
      eat_in_order_id: order_id,
      serving_date: reservationDate,
      num_guest: guests,
      branch_id: branch_id,
      table_id: table_id
    });

    // Lưu thông tin các món ăn vào bảng order_detail
    const orderDetails = Object.entries(dishes)
      .filter(([_, quantity]) => quantity > 0) // Lọc các món có số lượng > 0
      .map(([dish_id, quantity]) => ({
        order_id: order_id,
        dish_id: parseInt(dish_id) + 1,
        quantity: parseInt(quantity)
      }));

    if (orderDetails.length > 0) {
      await db('order_detail').insert(orderDetails);
    }

    // Render giao diện thành công
    const branch = await db.select('name').where('branch_id', branch_id).from('branch').first();
    const branch_name = branch ? branch.name : null;
    res.render('layout/main-layout', {
      title: 'Đặt bàn | Samurai Sushi',
      description: 'Đặt bàn tại Samurai Sushi',
      content: '../pages/success.ejs',

      guests,
      table_id,
      reservationDate,
      branch_name: branch_name
    });
  } catch (error) {
    console.error('Error saving reservation:', error);
    res.status(500).send('Đặt bàn thất bại!');
  }
});

export default routes;
