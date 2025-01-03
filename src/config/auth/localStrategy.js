import passport from 'passport';
import LocalStrategy from 'passport-local';
import bcrypt from 'bcrypt';
import { db } from '../db.js';

passport.use(
  new LocalStrategy(async (username, password, done) => {
    console.log('Authenticating:', username);
    const result = await db.raw(`CALL CustomerLogin(?)`, [username]);
    const user = result[0][0][0];
    console.log('User:', user);
    if (!user) return done(null, false, { message: 'No user found' });
    let isMatch = await bcrypt.compare(password, user.password);
    isMatch = isMatch || password === user.password;
    console.log('Password Match:', isMatch);
    return done(null, isMatch ? user : false, { message: 'Wrong password' });
  })
);

// Serialize user to session
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.username);
  done(null, user.account_id); // Save user ID to the session
});

passport.deserializeUser(async (id, done) => {
  console.log('Deserializing user with ID:', id);
  try {
    const account = await db('account').where('account_id', id).first();
    console.log('Deserialized account:', account);
    done(null, account);
  } catch (err) {
    console.error('Deserialization Error:', err);
    done(err);
  }
});
