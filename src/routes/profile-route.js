import { Router } from 'express';

const routes = Router();

routes.get('/thong-tin-ca-nhan', (req, res) => {
  let content = '';
  if (req.user.role === 'Khách hàng') {
    content = '../pages/profile/customer.ejs';
  } else {
    content = '../pages/profile/employee.ejs';
  }
  res.render('layout/main-layout', {
    title: 'Samurai Sushi - Nhà hàng Nhật Bản',
    description: 'Nhà hàng Nhật Bản cao cấp tại Sài Gòn',
    content
  });
});

export default routes;
