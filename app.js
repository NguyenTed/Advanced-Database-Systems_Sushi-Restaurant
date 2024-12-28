import express from 'express';
import path from 'path';
import session from 'express-session';
import passport from 'passport';
import flash from 'connect-flash';
import { fileURLToPath } from 'url';
import routes from './src/routes/index.js';
import './src/config/auth/localStrategy.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/src/views'));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: false // For local dev
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash()); // Initialize connect-flash

app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session Data:', req.session);
  console.log('User in session:', req.user);
  console.log('User data from req.user:', req.user);
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

app.use(routes);

export default app;
