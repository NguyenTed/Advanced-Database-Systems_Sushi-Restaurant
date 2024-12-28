import { Router } from 'express';
import { renderBranchStatistics, renderBranchRevenue, renderBranchEmployees, renderBranchCustomers } from '../controllers/branch-statistics-controller.js';

const routes = Router();

routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.get('/thong-ke/chi-nhanh/', renderBranchStatistics);
routes.get('/thong-ke/chi-nhanh/doanh-thu', renderBranchRevenue);
routes.get('/thong-ke/chi-nhanh/nhan-vien', renderBranchEmployees);
routes.get('/thong-ke/chi-nhanh/khach-hang', renderBranchCustomers); // Add this new route

export default routes;
