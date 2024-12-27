import { Router } from 'express';
import { PATH } from '../config/path.js';
import { renderBranchStatistics, renderBranchRevenue } from '../controllers/statistics-controller.js';

const routes = Router();

routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.get('/thong-ke/chi-nhanh/', renderBranchStatistics);
routes.get('/thong-ke/chi-nhanh/doanh-thu', renderBranchRevenue);

export default routes;
