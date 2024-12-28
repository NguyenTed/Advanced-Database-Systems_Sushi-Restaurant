import { Router } from 'express';

const routes = Router();

routes.get('/khuyen-mai', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Khuyến mãi | Samurai Sushi',
    description: 'Khuyến mãi tại Samurai Sushi',
    content: '../pages/promotions.ejs'
  });
});

export default routes;
