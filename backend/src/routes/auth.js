const bcrypt = require('bcryptjs');
const express = require('express');
const { query } = require('../db');
const { clearSessionCookie, currentUser, setSessionCookie } = require('../middleware/auth');
const asyncHandler = require('../utils/async-handler');

const router = express.Router();

router.get('/me', (req, res) => {
  res.json({ user: currentUser(req) });
});

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Escribe usuario y password.' });
  }

  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Usuario o password incorrectos.' });
  }

  setSessionCookie(res, user);
  res.json({ user: { id: user.id, username: user.username, displayName: user.display_name } });
}));

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

module.exports = router;
