import { db } from '../config/db.js'; // Import the Knex instance

export const attachProfile = async (req, res, next) => {
  if (req.isAuthenticated && req.user) {
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
