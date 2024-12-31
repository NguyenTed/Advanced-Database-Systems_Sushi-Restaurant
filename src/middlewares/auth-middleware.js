import { db } from '../config/db.js'; // Import the Knex instance

export const attachProfile = async (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    try {
      let profile = {};
      if (req.user.role === 'Khách hàng') {
        profile = await db('customer').where('account_id', req.user.account_id).first();
      } else if (req.user.role === 'Nhân viên') {
        profile = await db('employee').where('account_id', req.user.account_id).first();
      }
      req.isAuthenticated = true;
      req.profile = profile; // Attach profile to req.profile
    } catch (err) {
      console.error('Error fetching profile:', err);
      req.isAuthenticated = false;
      req.profile = null; // Set to null if an error occurs
    }
  } else {
    req.isAuthenticated = false;
    req.profile = null; // Set to null if not authenticated
  }

  next();
};

export const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    const account = req.user;
    if (!account) {
      res.status(401).render('layout/main-layout.ejs', {
        title: '401 - Không hợp lệ',
        description: 'Thông tin đăng nhập của bạn không hợp lệ',
        content: '../pages/401'
      });
    }
    if (!allowedRoles.includes(account.role)) {
      // Chuyển hướng hoặc render trang Forbidden
      return res.status(403).render('layout/main-layout.ejs', {
        title: '403 - Không có quyền',
        description: 'Bạn không có quyền truy cập địa chỉ này',
        content: '../pages/403'
      });
    }

    next();
  };
};
