import { db } from '../config/db.js'; // Import the Knex instance

export const attachProfile = async (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    try {
      let profile = {};
      if (req.user.role === 'Khách hàng') {
        profile = await db('customer').where('account_id', req.user.account_id).first();
      } else {
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

// src/middlewares/auth-middleware.js

export const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    // Check if user is logged in
    if (!req.user) {
      return res.status(401).render('layout/main-layout.ejs', {
        title: '401 - Không hợp lệ',
        description: 'Vui lòng đăng nhập để tiếp tục',
        content: '../pages/401.ejs'
      });
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).render('layout/main-layout.ejs', {
        title: '403 - Không có quyền',
        description: 'Bạn không có quyền truy cập địa chỉ này',
        content: '../pages/403.ejs'
      });
    }

    next();
  };
};
