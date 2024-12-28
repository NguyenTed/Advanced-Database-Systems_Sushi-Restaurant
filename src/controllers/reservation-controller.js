import { db } from '../config/db.js';

export const renderReservationPage = async (req, res) => {
    // Lấy thông tin 
    const { branch_name, name, phone, date, time, guests } = req.body;

    try {
        // Tìm branch_id từ branch_name
        const branch = await db('branch').select('branch_id').where({ name: branch_name }).first();
        if (!branch) 
            return res.status(404).send('Chi nhánh không tồn tại');
        const branch_id = branch.branch_id;

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
        });
        await db('eat_in_order').insert({
            serving_date: reservationDate,
            num_guest: guests,
            branch_id: branch_id,
            table_id: table_id,
          });      

        res.send('Đặt bàn thành công!');
        alert('Đặt bàn thành công!');
        } 
        catch (error) {
            console.error('Error saving reservation:', error);
            res.status(500).send('Đặt bàn thất bại!');
            alert('Đặt bàn thất bại. Vui lòng thử lại sau.');
    }
};
