import { Router } from 'express';
import { renderBranchStatistics, renderBranchRevenue, renderBranchEmployees, renderBranchCustomers, renderBranchInvoices } from '../controllers/branch-statistics-controller.js';
import { verifyRole } from '../middlewares/auth-middleware.js';

const routes = Router();
routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.use('/thong-ke/chi-nhanh', verifyRole(['Quản lí chi nhánh']));
routes.get('/thong-ke/chi-nhanh', renderBranchStatistics);
routes.get('/thong-ke/chi-nhanh/doanh-thu', renderBranchRevenue);
routes.get('/thong-ke/chi-nhanh/nhan-vien', renderBranchEmployees);
routes.get('/thong-ke/chi-nhanh/khach-hang', renderBranchCustomers);
routes.get('/thong-ke/chi-nhanh/hoa-don', renderBranchInvoices); // Add this new route

export default routes;
