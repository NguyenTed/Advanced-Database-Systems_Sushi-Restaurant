import { Router } from 'express';

const routes = Router();

routes.get('/dat-ban', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Đặt bàn | Samurai Sushi',
    description: 'Đặt bàn tại Samurai Sushi',
    content: '../pages/reservation.ejs'
  });
});

export default routes;
