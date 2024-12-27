import { Router } from 'express';

const routes = Router();

routes.get('/', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Samurai Sushi - Nhà hàng Nhật Bản',
    description: 'Nhà hàng Nhật Bản cao cấp tại Sài Gòn',
    content: '../pages/home.ejs'
  });
});

routes.get('/gioi-thieu', (req, res) => {
  res.redirect('/');
});

export default routes;