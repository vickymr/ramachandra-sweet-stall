const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET, verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required.' });

    const admin = await db.get('SELECT * FROM admin_users WHERE username = ?', [username]);
    if (!admin)
      return res.status(401).json({ error: 'Invalid username or password.' });

    const valid = bcrypt.compareSync(password, admin.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid username or password.' });

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ success: true, token, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Both fields required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });

    const admin = await db.get('SELECT * FROM admin_users WHERE id = ?', [req.admin.id]);
    if (!bcrypt.compareSync(currentPassword, admin.password_hash))
      return res.status(401).json({ error: 'Current password is incorrect.' });

    const newHash = bcrypt.hashSync(newPassword, 10);
    await db.run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newHash, req.admin.id]);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
