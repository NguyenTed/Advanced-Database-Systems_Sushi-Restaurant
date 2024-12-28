import { Router } from 'express';
import { handleLogIn, handleSignUp, renderSignUpPage, handleLogOut, renderLogInPage } from '../controllers/auth-controller.js';

const router = Router();
router.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

router.get('/dang-nhap', renderLogInPage);
router.get('/dang-ky', renderSignUpPage);
router.post('/dang-ky', handleSignUp);
router.post('/dang-nhap', handleLogIn);
router.get('/dang-xuat', handleLogOut);

export default router;
