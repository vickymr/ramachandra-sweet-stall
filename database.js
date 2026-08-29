const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// On Render.com: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars
// Locally: falls back to local SQLite file at db/ramachandra.db
let client;
if (process.env.TURSO_DATABASE_URL) {
  client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN || '' });
  console.log('Connected to Turso cloud database');
} else {
  const dbDir = path.join(__dirname, 'db');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  client = createClient({ url: 'file:' + path.join(dbDir, 'ramachandra.db') });
  console.log('Connected to local SQLite database');
}

const db = {
  async get(sql, params = []) { const r = await client.execute({ sql, args: params }); return r.rows[0] || undefined; },
  async all(sql, params = []) { const r = await client.execute({ sql, args: params }); return r.rows || []; },
  async run(sql, params = []) { const r = await client.execute({ sql, args: params }); return { lastID: Number(r.lastInsertRowid), changes: r.rowsAffected }; },
  async exec(sql) {
    const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0).map(s => ({ sql: s, args: [] }));
    if (stmts.length > 0) await client.batch(stmts, 'write');
  }
};

async function initDb() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, name_en TEXT NOT NULL, name_ta TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, category_id INTEGER NOT NULL, name_en TEXT NOT NULL, name_ta TEXT NOT NULL, desc_en TEXT, desc_ta TEXT, image TEXT DEFAULT 'assets/no-image.svg', is_active INTEGER DEFAULT 1, in_giftbox INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (category_id) REFERENCES categories(id));
    CREATE TABLE IF NOT EXISTS product_sizes (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, size_name TEXT NOT NULL, size_name_ta TEXT NOT NULL, price INTEGER NOT NULL, sort_order INTEGER DEFAULT 0, FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT UNIQUE NOT NULL, customer_name TEXT NOT NULL, phone_number TEXT NOT NULL, delivery_address TEXT NOT NULL, delivery_date TEXT, time_slot TEXT, items TEXT NOT NULL, total_price INTEGER NOT NULL, payment_method TEXT DEFAULT 'Cash on Delivery', status TEXT DEFAULT 'Pending', created_at TEXT DEFAULT (datetime('now')))
  `);
  try { await db.exec('ALTER TABLE products ADD COLUMN in_giftbox INTEGER DEFAULT 1'); } catch(e) {}

  const existingAdmin = await db.get('SELECT id FROM admin_users WHERE username = ?', ['admin']);
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin@123', 10);
    await db.run('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('Admin user created: admin / admin@123');
  }

  for (const cat of [{slug:'sweets',name_en:'Sweets',name_ta:'இனிப்புகள்'},{slug:'savouries',name_en:'Savouries',name_ta:'காரவண்டிகள்'}]) {
    if (!await db.get('SELECT id FROM categories WHERE slug = ?', [cat.slug]))
      await db.run('INSERT INTO categories (slug, name_en, name_ta) VALUES (?, ?, ?)', [cat.slug, cat.name_en, cat.name_ta]);
  }

  const sw = (await db.get('SELECT id FROM categories WHERE slug = ?', ['sweets']))?.id;
  const sa = (await db.get('SELECT id FROM categories WHERE slug = ?', ['savouries']))?.id;
  if (!sw || !sa) return;

  const sizes3 = (p1,p2,p3) => [{n:'250 g',nt:'250 கிராம்',p:p1},{n:'500 g',nt:'500 கிராம்',p:p2},{n:'1 kg',nt:'1 கிலோ',p:p3}];
  const seedProducts = [
    {key:'boondhiLaddu',cid:sw,en:'Boondhi Laddu',ta:'பூந்தி லட்டு',den:'Classic golden laddus crafted from soft gram flour boondhi, pure ghee, crunchy cashews, and aromatic cardamom.',dta:'நெய், முந்திரி, திராட்சை மற்றும் ஏலக்காய் மணம் நிறைந்த பாரம்பரிய பூந்தி லட்டு.',img:'assets/laddu.jpeg',so:1,sz:sizes3(75,150,300)},
    {key:'badusha',cid:sw,en:'Badusha',ta:'பாதுஷா',den:'Flaky, layered delicacy with a melt-in-the-mouth texture, lightly soaked in sugar syrup.',dta:'மென்மையான அடுக்குகளுடன் நெய்யில் பொரித்து சர்க்கரைப் பாகில் ஊறிய சுவையான பாதுஷா.',img:'assets/Badusha.jpeg',so:2,sz:sizes3(75,150,300)},
    {key:'mysorePak',cid:sw,en:'Mysore Pak',ta:'மைசூர் பாக்',den:'Traditional South Indian sweet made with roasted gram flour, pure ghee, and caramelized sugar.',dta:'வறுத்த கடலை மாவு மற்றும் நறுமண நெய் சேர்த்து செய்யப்படும் பாரம்பரிய மைசூர் பாக்.',img:'assets/Mysore Pak.jpeg',so:3,sz:sizes3(75,150,300)},
    {key:'mixedSweetBox',cid:sw,en:'Mixed Sweet Box',ta:'மிக்ஸட் ஸ்வீட் பாக்ஸ்',den:'A festive assortment of our finest handcrafted traditional sweets, perfect for gifting and celebrations.',dta:'பண்டிகைகள் மற்றும் விஷேசங்களுக்கு ஏற்ற எங்கள் சிறந்த பாரம்பரிய இனிப்புகளின் சுவையான தொகுப்பு.',img:'assets/no-image.svg',so:4,sz:[{n:'500 g',nt:'500 கிராம்',p:170},{n:'1 kg',nt:'1 கிலோ',p:340}]},
    {key:'whiteBurfi',cid:sw,en:'White Burfi',ta:'வெள்ளை பர்ஃபி',den:'Rich and creamy milk fudge squares prepared from condensed milk solids and garnished with nuts.',dta:'தூய பசும்பாலில் திரட்டப்பட்ட பால்கோவா மற்றும் நட்ஸ் கலந்த மென்மையான வெள்ளை பர்ஃபி.',img:'assets/no-image.svg',so:5,sz:sizes3(100,200,400)},
    {key:'chocolateBurfi',cid:sw,en:'Chocolate Burfi',ta:'சாக்லேட் பர்ஃபி',den:'Double-layered sweet treat combining rich cocoa chocolate with traditional velvety milk fudge.',dta:'கிரீமியான பால் பர்ஃபியுடன் சாக்லேட் சுவை கலந்த நாவூறும் இரட்டை அடுக்கு பர்ஃபி.',img:'assets/no-image.svg',so:6,sz:sizes3(100,200,400)},
    {key:'roseBurfi',cid:sw,en:'Rose Burfi',ta:'ரோஸ் பர்ஃபி',den:'Aromatic milk confection delicately infused with real rose essence and cardamom.',dta:'ரோஜா இதழ்களின் நறுமணமும் பாலின் செழுமையும் கலந்த சுவையான ரோஸ் பர்ஃபி.',img:'assets/no-image.svg',so:7,sz:sizes3(100,200,400)},
    {key:'fruitHalwa',cid:sw,en:'Fruit Halwa',ta:'புரூட் அல்வா',den:'Glossy, chewy halwa packed with natural mixed fruit pulp and roasted dry fruits.',dta:'சுவையான பழக்கூழ் மற்றும் வறுத்த முந்திரி பருப்புகள் சேர்த்து நெய்யில் செய்த புரூட் அல்வா.',img:'assets/no-image.svg',so:8,sz:sizes3(100,200,400)},
    {key:'motiLaddu',cid:sw,en:'Moti Laddu',ta:'மோதி லட்டு',den:'Exquisite fine-beaded laddus made with tiny boondhi pearls, saffron, pistachios, and rich ghee.',dta:'நுண்ணிய பூந்தி மணிகள், குங்குமப்பூ மற்றும் நெய் சேர்த்து நயமாய் செய்யப்பட்ட மோதி லட்டு.',img:'assets/no-image.svg',so:9,sz:sizes3(100,200,400)},
    {key:'motiPak',cid:sw,en:'Moti Pak',ta:'மோதி பாக்',den:'Delectable diamond fudge crafted from fine boondhi, khoya, saffron, and silver vark.',dta:'மோதி பூந்தி மற்றும் பால்கோவா சேர்த்து நெய் மணத்துடன் செய்யப்படும் சிறப்பு மோதி பாக்.',img:'assets/no-image.svg',so:10,sz:sizes3(100,200,400)},
    {key:'cashewnutHalwa',cid:sw,en:'Cashewnut Halwa',ta:'முந்திரி அல்வா',den:'Slow-cooked wheat halwa drenched in pure ghee and generous helpings of golden roasted cashews.',dta:'வறுத்த முந்திரிப் பருப்புகள் மற்றும் தூய நெய் சேர்த்து மணக்க மணக்க கிளறிய முந்திரி அல்வா.',img:'assets/no-image.svg',so:11,sz:sizes3(120,240,480)},
    {key:'soanPapdi',cid:sw,en:'Soan Papdi',ta:'சோன் பப்டி',den:'Airy, crisp, and flaky sweet with melt-in-mouth spun sugar layers, pistachios, and cardamom.',dta:'பஞ்சு போன்ற மென்மையான இழைகளும் பிஸ்தா நறுமணமும் கொண்ட மொறுமொறு சோன் பப்டி.',img:'assets/no-image.svg',so:12,sz:sizes3(120,240,480)},
    {key:'specialMysorePak',cid:sw,en:'Ghee Mysore Pak',ta:'நெய் மைசூர் பாக்',den:'Ultra-soft, melt-in-the-mouth royal Mysore Pak generously made with pure golden melted ghee.',dta:'அதிக நெய் சேர்த்து நாவில் வைத்ததும் கரையும் அதிசுவையான ஸ்பெஷல் நெய் மைசூர் பாக்.',img:'assets/no-image.svg',so:13,sz:sizes3(120,240,480)},
    {key:'palkova',cid:sw,en:'Palkova',ta:'பால்கோவா',den:'Authentic slow-simmered rich milk fudge with caramelized flavor and granular texture.',dta:'பசும்பாலில் மிதமான தீயில் பொறுமையாக கிளறி செய்யப்படும் பாரம்பரிய பால்கோவா.',img:'assets/no-image.svg',so:14,sz:sizes3(120,240,480)},
    {key:'milkCake',cid:sw,en:'Milk Cake',ta:'மில்க் கேக்',den:'Traditional Indian milk sweet with a rich caramelized center, granular bite, and fragrant cardamom.',dta:'இருவண்ண அடுக்குகள் மற்றும் கேரமல் சுவையுடன் கூடிய தித்திப்பான மில்க் கேக்.',img:'assets/no-image.svg',so:15,sz:sizes3(120,240,480)},
    {key:'kajuKatli',cid:sw,en:'Kaju Katli',ta:'காஜு கத்லி',den:'Signature cashew fudge diamonds made from premium Goan cashews with a smooth, velvety texture.',dta:'உயர்தர முந்திரிப் பருப்புகள் கொண்டு செய்யப்படும் பிரீமியம் காஜு கத்லி வைரத் துண்டுகள்.',img:'assets/no-image.svg',so:16,sz:sizes3(225,450,900)},
    {key:'butterMurukku',cid:sa,en:'Butter Murukku',ta:'வெண்ணெய் முறுக்கு',den:'Light, crispy, and melt-in-the-mouth spiral snacks enriched with fresh butter and cumin seeds.',dta:'வெண்ணெய் மற்றும் சீரகம் சேர்த்து மொறுமொறுவென சுடப்படும் சுவையான வெண்ணெய் முறுக்கு.',img:'assets/no-image.svg',so:1,sz:sizes3(75,150,300)},
    {key:'mixture',cid:sa,en:'Mixture',ta:'மிக்சர்',den:'Signature South Indian spicy mixture of crisp sev, crunchy boondhi, roasted peanuts, and curry leaves.',dta:'கார சேவ், பூந்தி, வறுத்த நிலக்கடலை மற்றும் நறுமணக் கறிவேப்பிலை கலந்த மொறுமொறு மிக்சர்.',img:'assets/no-image.svg',so:2,sz:sizes3(75,150,300)},
    {key:'motaMixture',cid:sa,en:'Mota Mixture',ta:'தடித்த மிக்சர்',den:'Hearty traditional mixture featuring thick crunchy gram flour crisps, lentils, and bold South Indian spices.',dta:'தடித்த காரசேவ், முந்திரி, பருப்பு வகைகள் மற்றும் தனித்துவ மசாலாக்கள் கலந்த தடித்த மிக்சர்.',img:'assets/no-image.svg',so:3,sz:sizes3(75,150,300)},
    {key:'ribbonMurukku',cid:sa,en:'Ribbon Murukku',ta:'ரிப்பன் முறுக்கு',den:'Crisp ribbon-shaped pakoda made with roasted gram flour, red chilli flakes, and asafoetida.',dta:'பெருங்காயம் மற்றும் மிளகாய் தூள் சுவையுடன் பொன்னிறமாய் பொரித்தெடுத்த ரிப்பன் முறுக்கு.',img:'assets/no-image.svg',so:4,sz:sizes3(75,150,300)},
    {key:'karaSev',cid:sa,en:'Kara Sev',ta:'கார சேவ்',den:'Spicy and peppery crunchy gram flour sev seasoned with crushed black pepper and garlic.',dta:'மிளகு மற்றும் பூண்டு மசாலா கலந்து காரசாரமாகத் தயாரிக்கப்படும் மொறுமொறு கார சேவ்.',img:'assets/no-image.svg',so:5,sz:sizes3(75,150,300)},
    {key:'karaBoondhi',cid:sa,en:'Kara Boondhi',ta:'கார பூந்தி',den:'Crispy fried golden boondhi pearls tossed with roasted peanuts, curry leaves, and spicy red masala.',dta:'நிலக்கடலை, முந்திரி மற்றும் கறிவேப்பிலையுடன் கார மசாலா தூவிய மொறுமொறு கார பூந்தி.',img:'assets/no-image.svg',so:6,sz:sizes3(75,150,300)},
    {key:'onionPakoda',cid:sa,en:'Onion Pakoda',ta:'வெங்காய பக்கோடா',den:'Deep-fried golden onion fritters with a crunchy crust and savory, aromatic spiced center.',dta:'நறுக்கிய வெங்காயம், புதினா மற்றும் மசாலா சேர்த்து மொறுமொறுப்பாக சுடப்பட்ட வெங்காய பக்கோடா.',img:'assets/no-image.svg',so:7,sz:sizes3(75,150,300)},
    {key:'garlicSev',cid:sa,en:'Garlic Sev',ta:'பூண்டு சேவ்',den:'Crunchy tea-time sev packed with the intense aromatic punch of fresh garlic and red chillies.',dta:'பூண்டின் அட்டகாசமான நறுமணமும் மிளகாய் காரமும் நிறைந்த மொறுமொறு பூண்டு சேவ்.',img:'assets/no-image.svg',so:8,sz:sizes3(75,150,300)},
    {key:'kadalaPakoda',cid:sa,en:'Kadala Pakoda',ta:'கடலை பக்கோடா',den:'Crunchy whole roasted peanuts coated in a spiced gram flour batter and fried crisp.',dta:'மசாலா கடலை மாவு பூசி பொன்னிறமாய் பொரித்தெடுத்த மொறுமொறு கடலை பக்கோடா.',img:'assets/no-image.svg',so:9,sz:sizes3(75,150,300)},
    {key:'splMixture',cid:sa,en:'SPL Mixture',ta:'ஸ்பெஷல் மிக்சர்',den:'Royal festive mixture loaded with roasted cashews, raisins, spiced sev, and premium dry nuts.',dta:'முந்திரி, உலர் திராட்சை மற்றும் பிரீமியம் பருப்புகள் நிறைந்த விசேஷ ஸ்பெஷல் மிக்சர்.',img:'assets/no-image.svg',so:10,sz:[{n:'250 g',nt:'250 கிராம்',p:85},{n:'500 g',nt:'500 கிராம்',p:170},{n:'1 kg',nt:'1 கிலோ',p:340}]},
    {key:'potatoChips',cid:sa,en:'Potato Chips',ta:'உருளைக்கிழங்கு சிப்ஸ்',den:'Thinly sliced, ultra-crispy potato wafers lightly seasoned with sea salt and black pepper.',dta:'உருளைக்கிழங்கை மெல்லியதாக நறுக்கி மொறுமொறுவென பொரித்து உப்பு தூவிய கிளாசிக் சிப்ஸ்.',img:'assets/no-image.svg',so:11,sz:sizes3(100,200,400)},
    {key:'bananaChips',cid:sa,en:'Banana Chips',ta:'வாழைக்காய் சிப்ஸ்',den:'Authentic Kerala-style raw Nendran banana chips crisped to golden perfection in pure coconut oil.',dta:'நேந்திரன் வாழைக் காய்களை மெல்லிய வட்டங்களாய் பொரித்தெடுத்த பாரம்பரிய வாழைக்காய் சிப்ஸ்.',img:'assets/no-image.svg',so:12,sz:sizes3(100,200,400)},
  ];

  for (const p of seedProducts) {
    if (!await db.get('SELECT id FROM products WHERE key = ?', [p.key])) {
      const r = await db.run('INSERT INTO products (key, category_id, name_en, name_ta, desc_en, desc_ta, image, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p.key, p.cid, p.en, p.ta, p.den, p.dta, p.img, p.so]);
      for (let i = 0; i < p.sz.length; i++) {
        const s = p.sz[i];
        await db.run('INSERT INTO product_sizes (product_id, size_name, size_name_ta, price, sort_order) VALUES (?, ?, ?, ?, ?)', [r.lastID, s.n, s.nt, s.p, i]);
      }
    }
  }

  const allProds = await db.all('SELECT id, image FROM products');
  for (const p of allProds) {
    if (!p.image) await db.run('UPDATE products SET image = ? WHERE id = ?', ['assets/no-image.svg', p.id]);
  }
  console.log('Database initialized and seeded successfully.');
}

initDb().catch(err => console.error('Database init error:', err));
module.exports = db;