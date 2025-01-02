import { Router } from 'express';
import { handleLogIn, handleSignUp, renderSignUpPage, handleLogOut, renderLogInPage } from '../controllers/auth-controller.js';

const routes = Router();

routes.get('/tai-khoan', (req, res) => {
  res.redirect('/tai-khoan/dang-nhap');
});

routes.get('/tai-khoan/dang-nhap', renderLogInPage);
routes.get('/tai-khoan/dang-ky', renderSignUpPage);
routes.post('/tai-khoan/dang-ky', handleSignUp);
routes.post('/tai-khoan/dang-nhap', handleLogIn);
routes.get('/tai-khoan/dang-xuat', handleLogOut);

export default routes;
