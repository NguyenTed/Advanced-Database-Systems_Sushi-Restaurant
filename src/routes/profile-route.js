import { Router } from 'express';
import { db } from '../config/db.js';
import bcrypt from 'bcrypt';

const routes = Router();

routes.get('/thong-tin-ca-nhan', async (req, res) => {
  let membershipInfo = null;
  let profile = req.profile;

  if (req.user.role === 'Khách hàng') {
    membershipInfo = await db('membership_card').where('customer_id', profile.customer_id).first();
  } else {
    // Get employee department and branch names
    const result = await db.raw(`CALL GetEmployeeInfo(${profile.employee_id})`);
    const employeeInfo = result[0][0][0];
    console.log(employeeInfo);

    profile = { ...profile, ...employeeInfo };
    console.log(profile);
  }

  res.render('layout/main-layout', {
    title: 'Thông tin cá nhân | Samurai Sushi',
    description: 'Thông tin cá nhân người dùng',
    content: '../pages/profile.ejs',
    membershipInfo,
    profile
  });
});

routes.post('/thong-tin-ca-nhan/doi-mat-khau', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.account_id;
  console.log(userId);

  try {
    const user = await db('account').where('account_id', userId).first();
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isValidPassword) {
      return res.status(400).send('Mật khẩu cũ không đúng');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db('account').where('account_id', userId).update({ password: hashedPassword });

    res.status(200).send('Success');
  } catch (error) {
    console.error(error);
    res.status(500).send('Có lỗi xảy ra khi đổi mật khẩu');
  }
});

export default routes;
