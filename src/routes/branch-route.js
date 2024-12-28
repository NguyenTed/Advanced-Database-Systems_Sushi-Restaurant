import { Router } from 'express';
import { renderBranchesPage } from '../controllers/branch-controller.js';

const routes = Router();

routes.get('/chi-nhanh', renderBranchesPage);

export default routes;
