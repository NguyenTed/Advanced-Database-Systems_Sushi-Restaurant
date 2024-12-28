import { Router } from "express";
import { db } from '../config/db.js';

const routes = Router();

routes.get("/dat-ban", async (req, res) => {
  try {
    const branches = await db.select("branch_id", "name").from("branch");
    res.render("layout/main-layout", {
      title: "Đặt bàn | Samurai Sushi",
      description: "Đặt bàn tại Samurai Sushi",
      content: "../pages/reservation.ejs",
      branches,
    });
  } 
  catch (error) {
    console.error("Error fetching branches:", error.message); // 
    res.status(500).send("Error loading branch");
  }
});

routes.post('/dat-ban', async (req, res) => {
  // Lấy thông tin 
  console.log(req.body); 
  const { branch_id, name, phone, date, time, guests } = req.body;

  try {    
    // Chọn bàn với capacity phù hợp
    const table = await db('table')
        .select('table_id')
        .where('branch_id', branch_id)
        .andWhere('capacity', '>=', guests)
        .orderByRaw('RAND()')
        .first();
    if (!table) 
        return res.status(400).send('Không có bàn phù hợp tại chi nhánh');
    const table_id = table.table_id;

    const reservationDate = new Date(`${date}T${time}`);
    const [order_id] = await db('order').insert({
        creation_date: new Date(),
        status: 'Pending',
        branch_id: branch_id,
    }).returning('order_id');
    await db('eat_in_order').insert({
        eat_in_order_id: order_id,
        serving_date: reservationDate,
        num_guest: guests,
        branch_id: branch_id,
        table_id: table_id,
      });      

    // Render giao diện thành công
    const branch = await db.select('name').where('branch_id', branch_id).from('branch').first();
    const branch_name = branch ? branch.name : null;
    res.render("layout/main-layout", {
      title: "Đặt bàn | Samurai Sushi",
      description: "Đặt bàn tại Samurai Sushi",
      content: "../pages/success.ejs",
      name,
      phone,
      guests,
      table_id,
      reservationDate,
      branch_name: branch_name, 
    });

  } 
  catch (error) {
      console.error('Error saving reservation:', error);
      res.status(500).send('Đặt bàn thất bại!');
  }
});


export default routes;