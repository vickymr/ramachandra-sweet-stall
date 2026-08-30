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

// GET /api/auth/admins — list all admin users (protected)
router.get('/admins', verifyToken, async (req, res) => {
  try {
    const admins = await db.all('SELECT id, username, created_at FROM admin_users ORDER BY id ASC');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admins — create a new admin user (protected)
router.post('/admins', verifyToken, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });

    const existing = await db.get('SELECT id FROM admin_users WHERE username = ?', [username]);
    if (existing)
      return res.status(409).json({ error: 'Username already exists.' });

    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', [username, hash]);
    res.json({ success: true, id: result.lastID, username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/admins/:id — delete an admin user (protected, cannot delete self)
router.delete('/admins/:id', verifyToken, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.admin.id)
      return res.status(400).json({ error: 'You cannot delete your own account.' });

    const total = await db.get('SELECT COUNT(*) as cnt FROM admin_users');
    if (Number(total.cnt) <= 1)
      return res.status(400).json({ error: 'Cannot delete the last admin account.' });

    const existing = await db.get('SELECT id FROM admin_users WHERE id = ?', [targetId]);
    if (!existing)
      return res.status(404).json({ error: 'Admin user not found.' });

    await db.run('DELETE FROM admin_users WHERE id = ?', [targetId]);
    res.json({ success: true, message: 'Admin user deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
