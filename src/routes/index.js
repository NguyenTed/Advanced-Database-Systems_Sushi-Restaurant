import { Router } from 'express';
import homeRoute from './home-route.js';
import menuRoute from './menu-route.js';
import branchRoute from './branch-route.js';
import membershipRoute from './membership-route.js';
import reservationRoute from './reservation-route.js';
import promotionsRoute from './promotions-route.js';
import accountRoute from './account-route.js';
import statisticsRoute from './branch-statistics-route.js';
import policiesRoute from './policies-route.js';

const routes = Router();
routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.use(homeRoute);
routes.use(menuRoute);
routes.use(statisticsRoute);
routes.use(branchRoute);
routes.use(membershipRoute);
routes.use(reservationRoute);
routes.use(promotionsRoute);
routes.use(accountRoute);
routes.use(policiesRoute);

routes.use((req, res) => {
  res.status(404).render('layout/main-layout.ejs', {
    title: '404 - Không tìm thấy',
    description: 'Nội dung bạn đang cố truy cập không tồn tại hoặc đã bị xóa',
    content: '../pages/404'
  });
});

export default routes;
