import { Router } from 'express';
import { db } from '../config/db.js';
import bcrypt from 'bcrypt';

const routes = Router();

routes.get('/thong-tin-ca-nhan', async (req, res) => {
  let profileData = null;

  if (req.user.role === 'Khách hàng') {
    // Use GetCustomerInfo stored procedure
    const result = await db.raw('CALL GetCustomerInfo(?)', [req.profile.customer_id]);
    profileData = result[0][0][0]; // First row of first result set

    // Clean up property names
    if (profileData) {
      profileData = {
        customer_id: profileData.CustomerID,
        name: profileData.CustomerName,
        phone_number: profileData.PhoneNumber,
        email: profileData.Email,
        personal_id: profileData.PersonalID,
        date_of_birth: profileData.DateOfBirth,
        gender: profileData.Gender,
        membershipInfo: profileData.MembershipCardNumber
          ? {
              card_num: profileData.MembershipCardNumber,
              type: profileData.MembershipType,
              points: profileData.Points,
              discount_amount: profileData.DiscountAmount,
              issue_date: profileData.MembershipIssueDate
            }
          : null
      };
    }
  } else {
    // Use GetEmployeeInfo stored procedure
    const result = await db.raw('CALL GetEmployeeInfo(?)', [req.profile.employee_id]);
    profileData = result[0][0][0]; // First row of first result set
  }

  if (!profileData) {
    return res.status(404).send('Profile not found');
  }

  res.render('layout/main-layout', {
    title: 'Thông tin cá nhân | Samurai Sushi',
    description: 'Thông tin cá nhân người dùng',
    content: '../pages/profile.ejs',
    profile: profileData,
    membershipInfo: req.user.role === 'Khách hàng' ? profileData.membershipInfo : null
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
