const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ─── Multer Setup for Image Uploads ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'assets');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, Date.now() + '_' + safeName);
  }
});
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error('Only image files allowed'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Helper: get product with sizes ──────────────────────────────────────────
async function getProductWithSizes(productId) {
  const product = await db.get('SELECT p.*, c.slug as category_slug, c.name_en as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [productId]);
  if (!product) return null;
  product.sizes = await db.all('SELECT * FROM product_sizes WHERE product_id = ? ORDER BY sort_order', [productId]);
  return product;
}

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// GET /api/products — all active products grouped by category (for customer site)
router.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const categories = await db.all('SELECT * FROM categories ORDER BY id');
    const result = [];

    for (const cat of categories) {
      const products = await db.all(`
        SELECT p.*, c.slug as category_slug
        FROM products p JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ? AND p.is_active = 1
        ORDER BY p.sort_order
      `, [cat.id]);

      const productsWithSizes = [];
      for (const p of products) {
        p.sizes = await db.all('SELECT * FROM product_sizes WHERE product_id = ? ORDER BY sort_order', [p.id]);
        productsWithSizes.push(p);
      }

      result.push({ category: cat, products: productsWithSizes });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN ROUTES (JWT Protected) ────────────────────────────────────────────

// GET /api/admin/products — all products (incl. inactive)
router.get('/admin', verifyToken, async (req, res) => {
  try {
    const products = await db.all(`
      SELECT p.*, c.slug as category_slug, c.name_en as category_name
      FROM products p JOIN categories c ON p.category_id = c.id
      ORDER BY c.id, p.sort_order
    `);
    const withSizes = [];
    for (const p of products) {
      p.sizes = await db.all('SELECT * FROM product_sizes WHERE product_id = ? ORDER BY sort_order', [p.id]);
      withSizes.push(p);
    }
    res.json(withSizes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/products — add new product
router.post('/admin', verifyToken, async (req, res) => {
  try {
    let { key, category_id, name_en, name_ta, desc_en, desc_ta, image, is_active, in_giftbox, sort_order, sizes } = req.body;
    if (!name_en || !category_id)
      return res.status(400).json({ error: 'Category and Product Name (English) are required.' });

    // Auto-generate key if empty or whitespace
    if (!key || !key.trim()) {
      const cleanName = name_en.replace(/[^a-zA-Z0-9]/g, '');
      key = (cleanName || 'product') + '_' + Date.now().toString(36);
    } else {
      key = key.trim();
    }

    // If key already exists in DB, make it unique instead of failing
    const existing = await db.get('SELECT id FROM products WHERE key = ?', [key]);
    if (existing) {
      key = `${key}_${Date.now().toString(36)}`;
    }

    const result = await db.run(`
      INSERT INTO products (key, category_id, name_en, name_ta, desc_en, desc_ta, image, is_active, in_giftbox, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [key, category_id, name_en, name_ta || '', desc_en || '', desc_ta || '',
      image || 'assets/no-image.svg', is_active !== undefined ? is_active : 1,
      in_giftbox !== undefined ? in_giftbox : 1,
      sort_order || 0]);

    const productId = result.lastID;

    // Insert sizes if provided
    if (Array.isArray(sizes)) {
      for (let idx = 0; idx < sizes.length; idx++) {
        const s = sizes[idx];
        await db.run('INSERT INTO product_sizes (product_id, size_name, size_name_ta, price, sort_order) VALUES (?, ?, ?, ?, ?)', [productId, s.size_name, s.size_name_ta || s.size_name, s.price, idx]);
      }
    }

    const createdProduct = await getProductWithSizes(productId);
    res.status(201).json({ success: true, product: createdProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/products/:id — update product
router.put('/admin/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ta, desc_en, desc_ta, image, is_active, in_giftbox, sort_order, category_id } = req.body;

    const existing = await db.get('SELECT id FROM products WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    await db.run(`
      UPDATE products SET
        name_en = COALESCE(?, name_en),
        name_ta = COALESCE(?, name_ta),
        desc_en = COALESCE(?, desc_en),
        desc_ta = COALESCE(?, desc_ta),
        image = COALESCE(?, image),
        is_active = COALESCE(?, is_active),
        in_giftbox = COALESCE(?, in_giftbox),
        sort_order = COALESCE(?, sort_order),
        category_id = COALESCE(?, category_id)
      WHERE id = ?
    `, [name_en, name_ta, desc_en, desc_ta, image, is_active, in_giftbox, sort_order, category_id, id]);

    const updatedProduct = await getProductWithSizes(parseInt(id));
    res.json({ success: true, product: updatedProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/products/:id — delete product
router.delete('/admin/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT id FROM products WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    await db.run('DELETE FROM product_sizes WHERE product_id = ?', [id]);
    await db.run('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/products/:id/toggle — enable/disable product
router.patch('/admin/:id/toggle', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.get('SELECT id, is_active FROM products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const newStatus = product.is_active ? 0 : 1;
    await db.run('UPDATE products SET is_active = ? WHERE id = ?', [newStatus, id]);
    res.json({ success: true, is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/products/:id/giftbox — toggle gift box inclusion
router.patch('/admin/:id/giftbox', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.get('SELECT id, in_giftbox FROM products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const newStatus = (req.body.in_giftbox !== undefined) ? (req.body.in_giftbox ? 1 : 0) : (product.in_giftbox ? 0 : 1);
    await db.run('UPDATE products SET in_giftbox = ? WHERE id = ?', [newStatus, id]);
    res.json({ success: true, in_giftbox: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/products/:id/image — upload product image
router.post('/admin/:id/image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image file provided.' });

    // Fetch existing product to clean up old uploaded image if it was a custom file
    const oldProduct = await db.get('SELECT image FROM products WHERE id = ?', [id]);
    if (oldProduct && oldProduct.image) {
      const isCustomFile = /assets\/\d+_/.test(oldProduct.image);
      if (isCustomFile) {
        const oldFilePath = path.join(__dirname, '..', oldProduct.image);
        if (fs.existsSync(oldFilePath)) {
          try { fs.unlinkSync(oldFilePath); } catch (e) { console.warn('Could not delete old image:', e.message); }
        }
      }
    }

    const imagePath = 'assets/' + req.file.filename;
    await db.run('UPDATE products SET image = ? WHERE id = ?', [imagePath, id]);
    res.json({ success: true, image: imagePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SIZES CRUD ───────────────────────────────────────────────────────────────

// GET /api/admin/products/:id/sizes
router.get('/admin/:id/sizes', verifyToken, async (req, res) => {
  try {
    const sizes = await db.all('SELECT * FROM product_sizes WHERE product_id = ? ORDER BY sort_order', [req.params.id]);
    res.json(sizes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/products/:id/sizes — add a size
router.post('/admin/:id/sizes', verifyToken, async (req, res) => {
  try {
    const { size_name, size_name_ta, price, sort_order } = req.body;
    if (!size_name || price === undefined)
      return res.status(400).json({ error: 'size_name and price are required.' });

    const result = await db.run('INSERT INTO product_sizes (product_id, size_name, size_name_ta, price, sort_order) VALUES (?, ?, ?, ?, ?)', [req.params.id, size_name, size_name_ta || size_name, price, sort_order || 0]);

    res.status(201).json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/sizes/:id — update a size
router.put('/admin/sizes/:id', verifyToken, async (req, res) => {
  try {
    const { size_name, size_name_ta, price, sort_order } = req.body;
    await db.run('UPDATE product_sizes SET size_name=COALESCE(?,size_name), size_name_ta=COALESCE(?,size_name_ta), price=COALESCE(?,price), sort_order=COALESCE(?,sort_order) WHERE id=?', [size_name, size_name_ta, price, sort_order, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/sizes/:id — delete a size
router.delete('/admin/sizes/:id', verifyToken, async (req, res) => {
  try {
    await db.run('DELETE FROM product_sizes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories — for dropdowns
router.get('/categories', async (req, res) => {
  try {
    const cats = await db.all('SELECT * FROM categories');
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
