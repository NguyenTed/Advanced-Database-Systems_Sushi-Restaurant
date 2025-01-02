import { Router } from 'express';

const routes = Router();

routes.get('/the-thanh-vien', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Chính sách thành viên | Samurai Sushi',
    description: 'Chính sách thành viên Samurai Sushi',
    content: '../pages/membership-card.ejs',
  });
});

export default routes;