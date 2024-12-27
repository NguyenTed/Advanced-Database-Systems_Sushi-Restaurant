import { Router } from 'express';
import { renderBranchStatistics, renderBranchRevenue, renderBranchEmployees } from '../controllers/branch-statistics-controller.js';

const routes = Router();

routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.get('/thong-ke/chi-nhanh/', renderBranchStatistics);
routes.get('/thong-ke/chi-nhanh/doanh-thu', renderBranchRevenue);
routes.get('/thong-ke/chi-nhanh/nhan-vien', renderBranchEmployees);

export default routes;
