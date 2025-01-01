import { Router } from 'express';
import { db } from '../config/db.js';
import bcrypt from 'bcrypt';

const routes = Router();

routes.get('/thong-tin-ca-nhan', async (req, res) => {
  let membershipInfo = null;
  let profile = req.profile;

  if (req.user.role === 'Khách hàng') {
    membershipInfo = await db('membership_card')
      .where('customer_id', profile.customer_id)
      .first();
  } else {
    // Get employee department and branch names
    const employeeInfo = await db('employee')
      .join('department', 'employee.department_id', 'department.department_id')
      .join('branch', 'employee.branch_id', 'branch.branch_id')
      .where('employee.employee_id', profile.employee_id)
      .select('department.name as department_name', 'branch.name as branch_name')
      .first();
    
    profile = { ...profile, ...employeeInfo };
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
