import { Router } from 'express';
import {
  renderBranchStatistics,
  renderBranchRevenue,
  renderBranchEmployees,
  renderBranchCustomers,
  renderBranchInvoices,
  getEditEmployee,
  postEditEmployee,
  renderBranchDishes
} from '../controllers/company-statistics-controller.js';
import { verifyRole } from '../middlewares/auth-middleware.js';

const routes = Router();

routes.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

routes.use('/thong-ke/cong-ty', verifyRole(['Quản lý công ty']));
routes.get('/thong-ke/cong-ty', renderBranchStatistics);
routes.get('/thong-ke/cong-ty/doanh-thu', renderBranchRevenue);
routes.get('/thong-ke/cong-ty/nhan-vien', renderBranchEmployees);
routes.get('/thong-ke/cong-ty/khach-hang', renderBranchCustomers);
routes.get('/thong-ke/cong-ty/hoa-don', renderBranchInvoices); // Add this new route
routes.get('/thong-ke/cong-ty/chinh-sua-nhan-vien', getEditEmployee);
routes.post('/thong-ke/cong-ty/chinh-sua-nhan-vien', postEditEmployee);
routes.get('/thong-ke/cong-ty/mon-an', renderBranchDishes); // Add this new route

export default routes;
