import { Router } from 'express';

const routes = Router();

routes.get('/the-thanh-vien', (req, res) => {
  res.redirect('/the-thanh-vien/tra-cuu-diem');
});

routes.get('/the-thanh-vien/chinh-sach', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Chính sách thành viên | Samurai Sushi',
    description: 'Chính sách thành viên Samurai Sushi',
    content: '../pages/membership-card/membership-card.ejs',
    contentPath: '../membership-card/member-policy.ejs'
  });
});

routes.get('/the-thanh-vien/tra-cuu-diem', (req, res) => {
  res.render('layout/main-layout', {
    title: 'Tra cứu điểm | Samurai Sushi',
    description: 'Tra cứu điểm thành viên Samurai Sushi',
    content: '../pages/membership-card/membership-card.ejs',
    contentPath: '../membership-card/point-look-up.ejs'
  });
});

export default routes;
