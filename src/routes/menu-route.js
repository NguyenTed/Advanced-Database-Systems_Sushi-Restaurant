import { Router } from 'express';
import { PATH } from '../config/path.js';
import { renderMenuPage } from '../controllers/menu-controller.js';

const routes = Router();

routes.get(PATH.MENU, renderMenuPage);

export default routes;
