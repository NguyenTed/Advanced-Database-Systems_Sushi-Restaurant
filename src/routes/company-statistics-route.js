import { Router } from 'express';
import { renderBranchStatistics, renderBranchRevenue, renderBranchEmployees, renderBranchCustomers, renderBranchInvoices } from '../controllers/company-statistics-controller.js';

const routes = Router();

routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.get('/thong-ke/cong-ty/', renderBranchStatistics);
routes.get('/thong-ke/cong-ty/doanh-thu', renderBranchRevenue);
routes.get('/thong-ke/cong-ty/nhan-vien', renderBranchEmployees);
routes.get('/thong-ke/cong-ty/khach-hang', renderBranchCustomers);
routes.get('/thong-ke/cong-ty/hoa-don', renderBranchInvoices); // Add this new route

export default routes;
