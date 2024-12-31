import passport from 'passport';
import bcrypt from 'bcrypt';
import { db } from '../config/db.js';
import { signupNewCustomer } from '../services/auth-service.js';

export const renderLogInPage = (req, res) => {
  const error_msg = req.flash('error_msg'); // Retrieve the flash error
  console.log('Retrieved flash message:', error_msg); // Check the message
  res.render('layout/main-layout', {
    error_msg: error_msg[0] || '',
    title: 'Đăng nhập | Samurai Sushi',
    description: 'Đăng nhập người dùng / quản trị viên',
    content: '../pages/account/account.ejs',
    contentPath: '../account/login.ejs'
  }); // Pass to template
};

export const renderSignUpPage = (req, res) => {
  console.log('Signup page requested');
  res.render('layout/main-layout', {
    errors: [],
    name: '',
    email: '',
    username: '',
    password: '',
    title: 'Đăng ký | Samurai Sushi',
    description: 'Đăng ký thành viên',
    content: '../pages/account/account.ejs',
    contentPath: '../account/register.ejs'
  });
};

export const handleSignUp = async (req, res) => {
  console.log(req.body);
  const { name, phoneNumber, personalId, date_of_birth, gender, email, username, password } = req.body;
  let errors = [];

  if (password.length < 6) errors.push({ msg: 'Password must be at least 6 characters' });

  if (errors.length > 0) {
    res.render('layout/main-layout', {
      errors,
      name,
      phoneNumber,
      personalId,
      date_of_birth,
      gender,
      email,
      username,
      password,
      title: 'Đăng ký | Samurai Sushi',
      description: 'Đăng ký thành viên',
      content: '../pages/account/account.ejs',
      contentPath: '../account/register.ejs'
    });
  } else {
    // const user = await db('account').where('username', username).first();
    const newUser = {
      username: username,
      password: await bcrypt.hash(password, 10),
      name: name,
      phone_number: phoneNumber,
      personal_id: personalId,
      date_of_birth: date_of_birth,
      gender: gender,
      email: email
    };

    signupNewCustomer(newUser)
      .then((response) => {
        if (!response.success) {
          console.log('Signup failed:', response.message);
        } else {
          console.log('Signup successful:', response.message);
        }
      })
      .catch((err) => {
        console.error('Unexpected error during signup:', err.message);
      });

    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/tai-khoan/dang-nhap');

    // if (user) {
    //   errors.push({ msg: 'User already exists' });
    //   res.render('layout/main-layout', {
    //     errors,
    //     name,
    //     phoneNumber,
    //     personalId,
    //     date_of_birth,
    //     gender,
    //     email,
    //     username,
    //     password,
    //     title: 'Đăng ký | Samurai Sushi',
    //     description: 'Đăng ký thành viên',
    //     content: '../pages/account/account.ejs',
    //     contentPath: '../account/register.ejs'
    //   });
    // } else {
    //   const newUser = {
    //     username: username,
    //     password: await bcrypt.hash(password, 10),
    //     name: name,
    //     phone_number: phoneNumber,
    //     personal_id: personalId,
    //     date_of_birth: date_of_birth,
    //     gender: gender,
    //     email: email
    //   };
    //   const result = await db.raw(`CALL sp_SignupNewCustomer(?, ?, ?, ?, ?, ?, ?, ?)`, [
    //     newAccount.username,
    //     newAccount.password,
    //     newUser.name,
    //     newUser.phone_number,
    //     newUser.email,
    //     newUser.personal_id,
    //     newUser.date_of_birth,
    //     newUser.gender
    //   ]);
    //   console.log(result);
    //   req.flash('success_msg', 'You are now registered and can log in');
    //   res.redirect('/tai-khoan/dang-nhap');
    // }
  }
};

export const handleLogIn = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Authentication Error:', err);
      return next(err);
    }
    if (!user) {
      console.warn('Authentication Failed:', info.message); // Log the info message
      req.flash('error_msg', info.message); // Add message to flash
      console.log('Flash message set:', req.flash('error_msg')); // Check flash is being set
      return res.redirect('/tai-khoan/dang-nhap');
    }
    req.login(user, (err) => {
      if (err) {
        console.error('Login Error:', err);
        return next(err);
      }
      return res.redirect('/');
    });
  })(req, res, next);
};

export const handleLogOut = (req, res) => {
  req.logout(() => {
    req.flash('success_msg', 'You are logged out');
    res.redirect('/');
  });
};
