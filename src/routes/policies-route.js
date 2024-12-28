import { Router } from 'express';

const routes = Router();

routes.get('/dieu-khoan-su-dung', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Điều khoản sử dụng | Samurai Sushi',
    description: 'Điều khoản sử dụng Samurai Sushi',
    content: '../pages/term-of-use.ejs'
  });
});

routes.get('/chinh-sach-bao-mat', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Chính sách bảo mật | Samurai Sushi',
    description: 'Chính sách bảo mật Samurai Sushi',
    content: '../pages/privacy-policy.ejs'
  });
});

export default routes;
