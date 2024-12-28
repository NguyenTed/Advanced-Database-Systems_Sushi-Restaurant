import { Router } from 'express';

const routes = Router();

routes.get('/chi-nhanh', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Chi nhánh | Samurai Sushi',
    description: 'Hệ thống chi nhánh Samurai Sushi',
    content: '../pages/branches.ejs'
  });
});

export default routes;
