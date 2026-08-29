const express = require('express');
const path = require('path');
const cors = require('cors');

// Initialize DB (creates tables + seeds on first run)
require('./database');

const app = express();
const PORT = 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors()); // Allow all origins (Local IP, Mobile, Localtunnel, etc.)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prevent browser and proxy/CDN caching for all API endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// ─── Serve Static Files ───────────────────────────────────────────────────────
// Serve the main project directory (customer website + bundled assets)
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  }
}));

// On Render.com: also serve uploaded images from the Persistent Disk (/data/assets)
// so that product images uploaded via admin panel survive server restarts
if (process.env.ASSETS_PATH) {
  app.use('/assets', express.static(process.env.ASSETS_PATH, {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  }));
}


// ─── API Routes ───────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// ─── Admin Page Routes ────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.redirect('/admin/login.html');
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// ─── Fallback: Serve index.html for root ─────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  res.status(404).send('Page not found.');
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🎉 Sri Ramachandra Sweets & Bakery - Server Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Local Website    : http://localhost:${PORT}`);
  console.log(`📱 Network (Wi-Fi)  : http://192.168.0.113:${PORT}`);
  console.log(`🔐 Admin Login      : http://localhost:${PORT}/admin/login`);
  console.log(`📊 Admin Dashboard  : http://localhost:${PORT}/admin/dashboard`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Default Admin    : admin / admin@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
