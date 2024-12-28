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
    const user = await db('account').where('username', username).first();
    if (user) {
      errors.push({ msg: 'User already exists' });
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
      const newAccount = {
        username: username,
        password: await bcrypt.hash(password, 10),
        role: 'Khách hàng'
      };
      const acc = await db('account').insert(newAccount);
      console.log(acc);
      const newUser = {
        name: name,
        phone_number: phoneNumber,
        personal_id: personalId,
        date_of_birth: date_of_birth,
        gender: gender,
        email: email,
        account_id: acc[0]
      };
      await db('customer').insert(newUser);
      req.flash('success_msg', 'You are now registered and can log in');
      res.redirect('/tai-khoan/dang-nhap');
    }
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
