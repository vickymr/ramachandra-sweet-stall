const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Helper: generate order ID
async function generateOrderId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const row = await db.get('SELECT COUNT(*) as cnt FROM orders');
  const count = (row ? row.cnt : 0) + 1;
  return `ORD-${date}-${String(count).padStart(4, '0')}`;
}

// ─── PUBLIC: POST /api/orders — save order from customer checkout ──────────────
router.post('/', async (req, res) => {
  try {
    const { customer_name, phone_number, delivery_address, delivery_date, time_slot, items, total_price, payment_method } = req.body;
    if (!customer_name || !phone_number || !delivery_address || !items || total_price === undefined)
      return res.status(400).json({ error: 'Missing required order fields.' });

    const orderId = await generateOrderId();
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);

    await db.run(`
      INSERT INTO orders (order_id, customer_name, phone_number, delivery_address, delivery_date, time_slot, items, total_price, payment_method, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `, [orderId, customer_name, phone_number, delivery_address, delivery_date || '', time_slot || '', itemsJson, total_price, payment_method || 'Cash on Delivery']);

    res.status(201).json({ success: true, order_id: orderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: GET /api/admin/orders — all orders ────────────────────────────────
router.get('/admin', verifyToken, async (req, res) => {
  try {
    const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
    const parsed = orders.map(o => ({
      ...o,
      items: (() => { try { return JSON.parse(o.items); } catch { return o.items; } })()
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: PATCH /api/admin/orders/:id/status — update order status ──────────
router.patch('/admin/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Confirmed', 'Delivered', 'Cancelled'];
    if (!allowed.includes(status))
      return res.status(400).json({ error: 'Invalid status. Use: Pending, Confirmed, Delivered, or Cancelled.' });

    const order = await db.get('SELECT id FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: DELETE /api/admin/orders/:id — delete order ──────────────────────
router.delete('/admin/:id', verifyToken, async (req, res) => {
  try {
    const order = await db.get('SELECT id FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    await db.run('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Order deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
