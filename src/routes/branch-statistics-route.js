import { Router } from 'express';
import { renderBranchStatistics, renderBranchRevenue, renderBranchEmployees, renderBranchCustomers, renderBranchInvoices } from '../controllers/branch-statistics-controller.js';
import { verifyRole } from '../middlewares/auth-middleware.js';

const routes = Router();
routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.get('/thong-ke/chi-nhanh', verifyRole(['Nhân viên', 'Quản lí']), renderBranchStatistics);
routes.get('/thong-ke/chi-nhanh/doanh-thu', verifyRole(['Nhân viên', 'Quản lí']), renderBranchRevenue);
routes.get('/thong-ke/chi-nhanh/nhan-vien', verifyRole(['Nhân viên', 'Quản lí']), renderBranchEmployees);
routes.get('/thong-ke/chi-nhanh/khach-hang', verifyRole(['Nhân viên', 'Quản lí']), renderBranchCustomers);
routes.get('/thong-ke/chi-nhanh/hoa-don', verifyRole(['Nhân viên', 'Quản lí']), renderBranchInvoices); // Add this new route

export default routes;
