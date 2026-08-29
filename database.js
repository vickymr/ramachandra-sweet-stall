const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Ensure db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'ramachandra.db');
const rawDb = new sqlite3.Database(dbPath);

// Expose Promise-based helper methods
const db = {
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  exec(sql) {
    return new Promise((resolve, reject) => {
      rawDb.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// ─── Initialize Schema & Seed Data ────────────────────────────────────────────
async function initDb() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name_en TEXT NOT NULL,
      name_ta TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      category_id INTEGER NOT NULL,
      name_en TEXT NOT NULL,
      name_ta TEXT NOT NULL,
      desc_en TEXT,
      desc_ta TEXT,
      image TEXT DEFAULT 'assets/no-image.svg',
      is_active INTEGER DEFAULT 1,
      in_giftbox INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      size_name TEXT NOT NULL,
      size_name_ta TEXT NOT NULL,
      price INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_date TEXT,
      time_slot TEXT,
      items TEXT NOT NULL,
      total_price INTEGER NOT NULL,
      payment_method TEXT DEFAULT 'Cash on Delivery',
      status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    await db.exec("ALTER TABLE products ADD COLUMN in_giftbox INTEGER DEFAULT 1;");
  } catch (e) {
    // Column already exists
  }

  // Seed Admin User
  const existingAdmin = await db.get('SELECT id FROM admin_users WHERE username = ?', ['admin']);
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin@123', 10);
    await db.run('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('✅ Admin user created: admin / admin@123');
  }

  // Seed Categories
  const seedCategories = [
    { slug: 'sweets', name_en: 'Sweets', name_ta: 'இனிப்புகள்' },
    { slug: 'savouries', name_en: 'Savouries', name_ta: 'காரவண்டிகள்' }
  ];
  for (const cat of seedCategories) {
    const exists = await db.get('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
    if (!exists) {
      await db.run('INSERT INTO categories (slug, name_en, name_ta) VALUES (?, ?, ?)', [cat.slug, cat.name_en, cat.name_ta]);
    }
  }

  // Seed Products
  const sweetsCat = await db.get('SELECT id FROM categories WHERE slug = ?', ['sweets']);
  const savouriesCat = await db.get('SELECT id FROM categories WHERE slug = ?', ['savouries']);

  if (!sweetsCat || !savouriesCat) return;

  const sweetsId = sweetsCat.id;
  const savouriesId = savouriesCat.id;

  const seedProducts = [
    // ── SWEETS ──
    { key:'boondhiLaddu', category_id:sweetsId, name_en:'Boondhi Laddu', name_ta:'பூந்தி லட்டு', desc_en:'Soft saffron laddus with cashews, raisins, and a bright festive aroma.', desc_ta:'முந்திரி, திராட்சை, குங்குமப்பூ மணம் நிறைந்த மென்மையான லட்டுகள்.', image:'assets/laddu.jpeg', sort_order:1, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'badusha', category_id:sweetsId, name_en:'Badusha', name_ta:'பாதுஷா', desc_en:'Layered, flaky rings glazed with gentle sugar syrup.', desc_ta:'மெதுவான சர்க்கரை பாகு பூசப்பட்ட அடுக்குகள் நிறைந்த மொறு மொறு இனிப்பு.', image:'assets/Badusha.jpeg', sort_order:2, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'mysorePak', category_id:sweetsId, name_en:'Mysore Pak', name_ta:'மைசூர் பாக்', desc_en:'A melt-in-mouth classic made with roasted gram flour and golden ghee.', desc_ta:'வறுத்த கடலைமாவும் தங்க நிற நெய்யும் சேர்ந்து வாயில் கரையும் பாரம்பரிய சுவை.', image:'assets/Mysore Pak.jpeg', sort_order:3, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'mixedSweetBox', category_id:sweetsId, name_en:'Mixed Sweet Box', name_ta:'மிக்ஸட் ஸ்வீட் பாக்ஸ்', desc_en:'A selected assortment of premium traditional sweets for gifting.', desc_ta:'பண்டிகை மற்றும் பரிசுகளுக்கு ஏற்ற பல்வேறு இனிப்புகளின் கலவை.', image:'assets/no-image.svg', sort_order:4, sizes:[{name:'500 g',name_ta:'500 கிராம்',price:170},{name:'1 kg',name_ta:'1 கிலோ',price:340}] },
    { key:'whiteBurfi', category_id:sweetsId, name_en:'White Burfi', name_ta:'வெள்ளை பர்ஃபி', desc_en:'Classic milk barfi squares with a rich, creamy, melt-in-mouth texture.', desc_ta:'கிரீமியான பால் கொண்டு செய்யப்பட்ட கிளாசிக் வெள்ளை பர்ஃபி.', image:'assets/no-image.svg', sort_order:5, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:100},{name:'500 g',name_ta:'500 கிராம்',price:200},{name:'1 kg',name_ta:'1 கிலோ',price:400}] },
    { key:'chocolateBurfi', category_id:sweetsId, name_en:'Chocolate Burfi', name_ta:'சாக்லேட் பர்ஃபி', desc_en:'Double-layered milk barfi with a rich, delicious chocolate layer.', desc_ta:'பால் பர்ஃபியுடன் சாக்லேட் சுவை கலந்த இனிப்பு பர்ஃபி.', image:'assets/no-image.svg', sort_order:6, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:100},{name:'500 g',name_ta:'500 கிராம்',price:200},{name:'1 kg',name_ta:'1 கிலோ',price:400}] },
    { key:'roseBurfi', category_id:sweetsId, name_en:'Rose Burfi', name_ta:'ரோஸ் பர்ஃபி', desc_en:'Milk sweet squares delicately infused with aromatic rose extract.', desc_ta:'ரோஜா இதழ்கள் மற்றும் ரோஜா மணம் கொண்ட பால் பர்ஃபி.', image:'assets/no-image.svg', sort_order:7, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:100},{name:'500 g',name_ta:'500 கிராம்',price:200},{name:'1 kg',name_ta:'1 கிலோ',price:400}] },
    { key:'fruitHalwa', category_id:sweetsId, name_en:'Fruit Halwa', name_ta:'புரூட் அல்வா', desc_en:'Sweet, chewy halwa loaded with real fruit pulp and dry fruits.', desc_ta:'புதிய பழங்கள் மற்றும் பருப்புகள் சேர்த்து செய்யப்பட்ட அல்வா.', image:'assets/no-image.svg', sort_order:8, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:100},{name:'500 g',name_ta:'500 கிராம்',price:200},{name:'1 kg',name_ta:'1 கிலோ',price:400}] },
    { key:'motiLaddu', category_id:sweetsId, name_en:'Moti Laddu', name_ta:'மோதி லட்டு', desc_en:'Fine-grained, delicious laddoos made with tiny gram flour pearls.', desc_ta:'மெல்லிய பூந்திகள் கொண்டு நேர்த்தியாக செய்யப்பட்ட மோதி லட்டு.', image:'assets/no-image.svg', sort_order:9, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:100},{name:'500 g',name_ta:'500 கிராம்',price:200},{name:'1 kg',name_ta:'1 கிலோ',price:400}] },
    { key:'motiPak', category_id:sweetsId, name_en:'Moti Pak', name_ta:'மோதி பாக்', desc_en:'Barfi-like sweet made with fine boondi, saffron, and condensed milk.', desc_ta:'மோதி பூந்தி மற்றும் பால் கோவா சேர்த்து செய்த சுவை மிகு மோதி பாக்.', image:'assets/no-image.svg', sort_order:10, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:100},{name:'500 g',name_ta:'500 கிராம்',price:200},{name:'1 kg',name_ta:'1 கிலோ',price:400}] },
    { key:'cashewnutHalwa', category_id:sweetsId, name_en:'Cashewnut Halwa', name_ta:'முந்திரி அல்வா', desc_en:'Glossy, rich wheat halwa slow-cooked with roasted cashew nuts.', desc_ta:'முந்திரி பருப்புகள் சேர்த்து நெய்யில் கிளறிய கோதுமை அல்வா.', image:'assets/no-image.svg', sort_order:11, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:120},{name:'500 g',name_ta:'500 கிராம்',price:240},{name:'1 kg',name_ta:'1 கிலோ',price:480}] },
    { key:'soanPapdi', category_id:sweetsId, name_en:'Soan Papdi', name_ta:'சோன் பப்டி', desc_en:'Flaky, airy sweet made with roasted gram flour and pistachios.', desc_ta:'ஏலக்காய் மணமும் பருப்பு சுவையும் கொண்ட பஞ்சுபோல் மென்மையான சோன் பப்டி.', image:'assets/no-image.svg', sort_order:12, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:120},{name:'500 g',name_ta:'500 கிராம்',price:240},{name:'1 kg',name_ta:'1 கிலோ',price:480}] },
    { key:'specialMysorePak', category_id:sweetsId, name_en:'Special Mysore Pak', name_ta:'ஸ்பெஷல் மைசூர் பாக்', desc_en:'Super-rich ghee Mysore Pak that melts instantly in your mouth.', desc_ta:'அதிக நெய் சேர்த்து கூடுதல் மென்மையாக செய்யப்பட்ட ஸ்பெஷல் மைசூர் பாக்.', image:'assets/no-image.svg', sort_order:13, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:120},{name:'500 g',name_ta:'500 கிராம்',price:240},{name:'1 kg',name_ta:'1 கிலோ',price:480}] },
    { key:'palkova', category_id:sweetsId, name_en:'Palkova', name_ta:'பால்கோவா', desc_en:'Slow-cooked milk sweet with rich, caramelized milk solids.', desc_ta:'சுத்தமான பாலில் மெதுவாக கிளறி செய்யப்பட்ட caramel பால்கோவா.', image:'assets/no-image.svg', sort_order:14, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:120},{name:'500 g',name_ta:'500 கிராம்',price:240},{name:'1 kg',name_ta:'1 கிலோ',price:480}] },
    { key:'milkCake', category_id:sweetsId, name_en:'Milk Cake', name_ta:'மில்க் கேக்', desc_en:'Grainy, dense milk sweet with a caramelized brown core.', desc_ta:'கரமேல் சுவையுடன் நயமான மில்க் கேக் இனிப்பு.', image:'assets/no-image.svg', sort_order:15, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:120},{name:'500 g',name_ta:'500 கிராம்',price:240},{name:'1 kg',name_ta:'1 கிலோ',price:480}] },
    { key:'kajuKatli', category_id:sweetsId, name_en:'Kaju Katli', name_ta:'காஜு கத்லி', desc_en:'Smooth cashew diamonds finished with a delicate silver shine.', desc_ta:'மென்மையான முந்திரி வைர துண்டுகள், மெலிதான வெள்ளி அலங்காரத்துடன்.', image:'assets/no-image.svg', sort_order:16, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:225},{name:'500 g',name_ta:'500 கிராம்',price:450},{name:'1 kg',name_ta:'1 கிலோ',price:900}] },

    // ── SAVOURIES ──
    { key:'butterMurukku', category_id:savouriesId, name_en:'Butter Murukku', name_ta:'வெண்ணெய் முறுக்கு', desc_en:'Crisp and melt-in-mouth murukku made with fresh butter.', desc_ta:'வெண்ணெய் சேர்த்து தயாரிக்கப்பட்ட மொறு மொறு முறுக்கு.', image:'assets/no-image.svg', sort_order:1, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'mixture', category_id:savouriesId, name_en:'Mixture', name_ta:'மிக்சர்', desc_en:'Crunchy savoury mix with sev, nuts, boondi, and spices.', desc_ta:'சேவ், பூந்தி, பருப்பு, மசாலா சேர்த்த மொறு மொறு கார கலவை.', image:'assets/no-image.svg', sort_order:2, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'motaMixture', category_id:savouriesId, name_en:'Mota Mixture', name_ta:'தடித்த மிக்சர்', desc_en:'Traditional spicy mixture with thicker sev and gram flour shapes.', desc_ta:'தடிமனான காரசேவ் மற்றும் கார துண்டுகள் அடங்கியபாரம்பரிய மிக்சர்.', image:'assets/no-image.svg', sort_order:3, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'ribbonMurukku', category_id:savouriesId, name_en:'Ribbon Murukku', name_ta:'ரிப்பன் முறுக்கு', desc_en:'Crisp ribbon-style pakoda with a classic South Indian crunch.', desc_ta:'தென்னிந்திய மொறு மொறு சுவையுடன் ரிப்பன் வடிவ பக்கோடா.', image:'assets/no-image.svg', sort_order:4, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'karaSev', category_id:savouriesId, name_en:'Kara Sev', name_ta:'கார சேவ்', desc_en:'Spicy gram-flour sev fried crisp for tea-time snacking.', desc_ta:'டீ நேரத்திற்கு ஏற்ற காரமான கடலைமாவு சேவ்.', image:'assets/no-image.svg', sort_order:5, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'karaBoondhi', category_id:savouriesId, name_en:'Kara Boondhi', name_ta:'கார பூந்தி', desc_en:'Crisp gram flour pearls seasoned with curry leaves and peanuts.', desc_ta:'கருவேப்பிலை மற்றும் முந்திரி சேர்த்த மொறு மொறு பூந்தி.', image:'assets/no-image.svg', sort_order:6, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'onionPakoda', category_id:savouriesId, name_en:'Onion Pakoda', name_ta:'வெங்காய பக்கோடா', desc_en:'Deep-fried onion fritters crisp on the outside, soft inside.', desc_ta:'வெங்காயம் மற்றும் மசாலா சேர்த்த மொறு மொறு பக்கோடா.', image:'assets/no-image.svg', sort_order:7, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'garlicSev', category_id:savouriesId, name_en:'Garlic Sev', name_ta:'பூண்டு சேவ்', desc_en:'Crispy sev infused with strong, aromatic garlic and red chillies.', desc_ta:'பூண்டு மணம் மற்றும் மிளகாய் காரம் கொண்ட மொறு மொறு சேவ்.', image:'assets/no-image.svg', sort_order:8, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'kadalaPakoda', category_id:savouriesId, name_en:'Kadala Pakoda', name_ta:'கடலை பக்கோடா', desc_en:'Spicy, crunchy peanut fritters with gram flour coating.', desc_ta:'கடலை மற்றும் மசாலா சேர்த்த மொறு மொறு வேர்க்கடலை பக்கோடா.', image:'assets/no-image.svg', sort_order:9, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:75},{name:'500 g',name_ta:'500 கிராம்',price:150},{name:'1 kg',name_ta:'1 கிலோ',price:300}] },
    { key:'splMixture', category_id:savouriesId, name_en:'SPL Mixture', name_ta:'ஸ்பெஷல் மிக்சர்', desc_en:'Premium mixture loaded with cashews, raisins, and special spices.', desc_ta:'முந்திரி, திராட்சை மற்றும் சிறப்பு மசாலாக்கள் சேர்த்த உயர்தர மிக்சர்.', image:'assets/no-image.svg', sort_order:10, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:85},{name:'500 g',name_ta:'500 கிராம்',price:170},{name:'1 kg',name_ta:'1 கிலோ',price:340}] },
    { key:'potatoChips', category_id:savouriesId, name_en:'Potato Chips', name_ta:'உருளைக்கிழங்கு சிப்ஸ்', desc_en:'Classic salted potato chips with a fresh crunchy bite.', desc_ta:'புதிய மொறு மொறு சுவையுடன் கிளாசிக் உப்பு உருளைக்கிழங்கு சிப்ஸ்.', image:'assets/no-image.svg', sort_order:11, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:100},{name:'500 g',name_ta:'500 கிராம்',price:200},{name:'1 kg',name_ta:'1 கிலோ',price:400}] },
    { key:'bananaChips', category_id:savouriesId, name_en:'Banana Chips', name_ta:'வாழைக்காய் சிப்ஸ்', desc_en:'Golden Kerala-style banana chips fried thin and crisp.', desc_ta:'மெல்லியதாக பொரித்த பொன்னிற நேந்திரன் வாழைக்காய் சிப்ஸ்.', image:'assets/no-image.svg', sort_order:12, sizes:[{name:'250 g',name_ta:'250 கிராம்',price:100},{name:'500 g',name_ta:'500 கிராம்',price:200},{name:'1 kg',name_ta:'1 கிலோ',price:400}] },
  ];

  for (const p of seedProducts) {
    const existing = await db.get('SELECT id FROM products WHERE key = ?', [p.key]);
    if (!existing) {
      const res = await db.run(`
        INSERT INTO products (key, category_id, name_en, name_ta, desc_en, desc_ta, image, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [p.key, p.category_id, p.name_en, p.name_ta, p.desc_en, p.desc_ta, p.image, p.sort_order]);

      const productId = res.lastID;
      for (let idx = 0; idx < p.sizes.length; idx++) {
        const s = p.sizes[idx];
        await db.run('INSERT INTO product_sizes (product_id, size_name, size_name_ta, price, sort_order) VALUES (?, ?, ?, ?, ?)', [productId, s.name, s.name_ta, s.price, idx]);
      }
    }
  }

  // ── Database Migration: Ensure valid fallback image paths without overwriting admin updates ─────
  const existingProductsInDb = await db.all('SELECT id, key, image FROM products');
  for (const p of existingProductsInDb) {
    if (!p.image) {
      await db.run('UPDATE products SET image = ? WHERE id = ?', ['assets/no-image.svg', p.id]);
    }
  }

  console.log('✅ Database initialized, seeded, and image mappings migrated.');
}

initDb().catch(err => console.error('Database init error:', err));

module.exports = db;
