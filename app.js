import express from 'express';
import path from 'path';
import passport from 'passport';
import flash from 'connect-flash';
import { fileURLToPath } from 'url';
import { ConnectSessionKnexStore } from 'connect-session-knex';
import session from 'express-session';
import routes from './src/routes/index.js';
import { db } from './src/config/db.js'; // Your Knex instance
import './src/config/auth/localStrategy.js';
import { attachProfile } from './src/middlewares/auth-middleware.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/src/views'));

const KnexStore = new ConnectSessionKnexStore({
  knex: db,
  tablename: 'sessions', // Name of the table to store session data
  sidfieldname: 'sid', // Field name for session IDs
  createtable: true, // Automatically create the sessions table
  clearInterval: 1000 * 60 * 60 * 24 // Clean up expired sessions every day
});

app.use(
  session({
    store: KnexStore,
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

app.use(attachProfile);
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session Data:', req.session);
  console.log('User in session:', req.user);
  console.log('User data from req.user:', req.user);
  console.log('Profile: ', req.profile);
  console.log('isAuthenticated: ', req.isAuthenticated);
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.isAuthenticated = req.isAuthenticated; // Boolean to check login status
  res.locals.profile = req.profile || null; // chứa thông tin về customer hoặc employee
  res.locals.user = req.user || null; // chứa thông tin về account
  next();
});

app.use(routes);

export default app;
