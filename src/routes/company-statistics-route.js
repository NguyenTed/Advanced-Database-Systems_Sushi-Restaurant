import { Router } from 'express';
import {
  renderBranchStatistics,
  renderBranchRevenue,
  renderBranchEmployees,
  renderBranchCustomers,
  renderBranchInvoices,
  getEditEmployee,
  postEditEmployee
} from '../controllers/company-statistics-controller.js';
import { verifyRole } from '../middlewares/auth-middleware.js';

const routes = Router();

routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.get('/thong-ke/cong-ty/', verifyRole(['Quản lí']), renderBranchStatistics);
routes.get('/thong-ke/cong-ty/doanh-thu', verifyRole(['Quản lí']), renderBranchRevenue);
routes.get('/thong-ke/cong-ty/nhan-vien', verifyRole(['Quản lí']), renderBranchEmployees);
routes.get('/thong-ke/cong-ty/khach-hang', verifyRole(['Quản lí']), renderBranchCustomers);
routes.get('/thong-ke/cong-ty/hoa-don', verifyRole(['Quản lí']), renderBranchInvoices); // Add this new route
routes.get('/thong-ke/cong-ty/chinh-sua-nhan-vien', verifyRole(['Quản lí']), getEditEmployee);
routes.post('/thong-ke/cong-ty/chinh-sua-nhan-vien', verifyRole(['Quản lí']), postEditEmployee);

export default routes;
