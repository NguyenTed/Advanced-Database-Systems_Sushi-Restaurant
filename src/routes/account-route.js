import { Router } from 'express';

const routes = Router();

routes.get('/tai-khoan', (req, res) => {
  res.redirect('/tai-khoan/dang-nhap');
});

routes.get('/tai-khoan/dang-ky', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Đăng ký | Samurai Sushi',
    description: 'Đăng ký thành viên',
    content: '../pages/account/account.ejs',
    contentPath: '../account/register.ejs'
  });
});

routes.get('/tai-khoan/dang-nhap', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Đăng nhập | Samurai Sushi',
    description: 'Đăng nhập người dùng / quản trị viên',
    content: '../pages/account/account.ejs',
    contentPath: '../account/login.ejs'
  });
});

export default routes;
