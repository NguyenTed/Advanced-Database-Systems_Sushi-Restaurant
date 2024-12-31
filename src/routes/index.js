import { Router } from 'express';
import authRoute from './auth-route.js';
import homeRoute from './home-route.js';
import menuRoute from './menu-route.js';
import branchRoute from './branch-route.js';
import membershipRoute from './membership-route.js';
import reservationRoute from './reservation-route.js';
import branchStatisticsRoute from './branch-statistics-route.js';
import companyStatisticsRoute from './company-statistics-route.js';
import policiesRoute from './policies-route.js';
import profileRoute from './profile-route.js';

const routes = Router();
routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.use('/tai-khoan', authRoute);
routes.use(homeRoute);
routes.use(menuRoute);
routes.use(branchStatisticsRoute);
routes.use(companyStatisticsRoute);
routes.use(branchRoute);
routes.use(membershipRoute);
routes.use(reservationRoute);
routes.use(profileRoute);
routes.use(policiesRoute);

routes.use((req, res) => {
  res.status(404).render('layout/main-layout.ejs', {
    title: '404 - Không tìm thấy',
    description: 'Nội dung bạn đang cố truy cập không tồn tại hoặc đã bị xóa',
    content: '../pages/404'
  });
});

export default routes;
