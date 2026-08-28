// ── Product data loaded from backend API ──────────────────────────────────────
// These arrays are populated by loadProductsFromAPI() on page load.
// Do NOT hardcode product data here — use the Admin Dashboard to manage products.
let sweetGroups = [];
let savouryGroups = [];

/**
 * Converts a flat product + sizes array from the API
 * into the grouped format that the existing render functions expect.
 */
function apiDataToGroups(products) {
  // Group products by their unique price tier (sorted sizes joined)
  const groupMap = new Map();
  products.forEach(p => {
    const sizes = p.sizes || [];
    // Build a price-tier key so products with identical sizes group together
    const tierKey = sizes.map(s => `${s.size_name}:${s.price}`).join('|');
    if (!groupMap.has(tierKey)) {
      // Build priceHeader string from sizes
      const priceHeader = sizes.map(s => `₹${s.price} / ${s.size_name}`).join(' | ');
      const priceHeaderTa = sizes.map(s => `₹${s.price} / ${s.size_name_ta || s.size_name}`).join(' | ');
      groupMap.set(tierKey, {
        priceHeader,
        priceHeaderTa,
        sizes: sizes.map(s => ({ name: s.size_name, price: s.price })),
        sizesTa: sizes.map(s => ({ name: s.size_name_ta || s.size_name, price: s.price })),
        products: []
      });
    }
    groupMap.get(tierKey).products.push({
      key: p.key,
      nameEn: p.name_en,
      nameTa: p.name_ta,
      descEn: p.desc_en || '',
      descTa: p.desc_ta || '',
      image: p.image,
      in_giftbox: p.in_giftbox !== undefined ? p.in_giftbox : 1
    });
  });
  return Array.from(groupMap.values());
}

let previousProductsJson = "";

async function loadProductsFromAPI() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    const data = await res.json(); // [{category, products}, ...]

    const jsonStr = JSON.stringify(data);
    if (jsonStr === previousProductsJson) {
      return; // Skip DOM re-render if data has not changed to keep scroll silky smooth!
    }
    previousProductsJson = jsonStr;

    sweetGroups = [];
    savouryGroups = [];

    data.forEach(group => {
      const slug = group.category.slug;
      const groups = apiDataToGroups(group.products);
      if (slug === 'sweets') sweetGroups = groups;
      else if (slug === 'savouries') savouryGroups = groups;
    });

    // Re-render the product sections with live data & current search filter
    handleProductSearch();
    if (typeof renderGiftBoxSweets === "function") {
      renderGiftBoxSweets();
    }
  } catch (err) {
    console.warn('Could not load products from API, page may show empty sections.', err);
  }
}

const translations = {
  en: {
    page: {
      title: "Sri Ramachandra Sweets & Bakery"
    },
    brand: {
      name: "Sri Ramachandra Sweets & Bakery",
      aria: "Sri Ramachandra Sweets & Bakery home",
      since: "Since 1984"
    },
    nav: {
      aria: "Primary navigation",
      home: "Home",
      sweets: "Sweets",
      savouries: "Savouries",
      about: "About",
      contact: "Contact",
      openMenu: "Open menu",
      closeMenu: "Close menu"
    },
    language: {
      switchToTamil: "Switch language to Tamil",
      switchToEnglish: "Switch language to English"
    },
    hero: {
      eyebrow: "Traditional taste since 1984",
      title: "Sri Ramachandra Sweets & Bakery",
      subtitle: "Golden ghee, time-honored recipes, and sweets that make every celebration warmer.",
      cta: "View Menu",
      call: "Call to Order",
      sweetsCta: "Explore Sweets",
      savouriesCta: "Explore Savouries",
      highlightsAria: "Shop highlights",
      highlightFresh: "Small-batch cooking",
      highlightGhee: "Pure ghee sweets",
      highlightGift: "Festival gift boxes"
    },
    sweets: {
      eyebrow: "Signature Sweets",
      title: "Our Sweet Favourites",
      subtitle: "Made with slow-roasted flour, fragrant cardamom, premium nuts, and the unmistakable richness of traditional ghee."
    },
    search: {
      placeholder: "Search sweets or savouries..."
    },
    savouries: {
      eyebrow: "Fresh Savouries",
      title: "Crispy & Spicy Snacks",
      subtitle: "Freshly prepared with pure oil, hand-picked spices, and traditional recipes for that perfect crunchy bite."
    },
    about: {
      eyebrow: "Our heritage",
      title: "Sweetness made with patience, pride, and pure ingredients.",
      body: "For generations, Sri Ramachandra Sweets & Bakery has prepared beloved Indian sweets the traditional way: small batches, careful roasting, clean ingredients, and recipes that bring families back for one more box.",
      cta: "Visit Our Shop",
      promiseOneTitle: "Traditional Recipes",
      promiseOneText: "Measured by hand and perfected through daily practice.",
      promiseTwoTitle: "Fresh Ingredients",
      promiseTwoText: "Premium nuts, pure ghee, and aromatic spices.",
      promiseThreeTitle: "Gift Ready",
      promiseThreeText: "Packed beautifully for festivals, weddings, and family visits."
    },
    footer: {
      tagline: "Traditional taste, freshly prepared, warmly served.",
      contactTitle: "Contact",
      visitTitle: "Visit Us",
      address: "N Car St, OVK Nagar, Kiranur, Tamil Nadu 622502",
      directions: "Get directions",
      hours: "Open daily: 6:00 AM - 10:00 PM",
      copyright: "© 2026 Sri Ramachandra Sweets & Bakery. All rights reserved.",
      socialAria: "Social media links",
      facebook: "Follow us on Facebook",
      instagram: "Follow us on Instagram",
      whatsapp: "Message us on WhatsApp"
    },
    reviews: {
      eyebrow: "Customer Love",
      title: "What Our Customers Say"
    },
    cart: {
      title: "Your Order Basket",
      empty: "Your basket is empty. Add some fresh sweets and savouries!",
      totalLabel: "Total:",
      checkout: "Send Order via WhatsApp",
      open: "Open basket",
      close: "Close basket",
      note: "* Note: Prices on request will be calculated on call."
    },
    checkout: {
      dateLabel: "Preferred Delivery Date *",
      timeSlotLabel: "Preferred Time Slot *",
      selectSlot: "Select slot",
      slotMorning: "Morning (8 AM - 12 PM)",
      slotAfternoon: "Afternoon (12 PM - 4 PM)",
      slotEvening: "Evening (4 PM - 8 PM)"
    },
    guide: {
      tag: "Ordering Process",
      title: "How to Place Your Order",
      subtitle: "Simple 4-step process to get fresh sweets delivered to your door",
      step1: {
        title: "Browse & Add",
        desc: "Explore sweets and savouries. Choose weight (250g, 500g, 1kg) and add to cart."
      },
      step2: {
        title: "Enter Details",
        desc: "Open your basket, click checkout, and fill in your name, WhatsApp number, and address."
      },
      step3: {
        title: "Get PDF Receipt",
        desc: "Place order and your official PDF order receipt will download automatically."
      },
      step4: {
        title: "Confirm on WhatsApp",
        desc: "Click 'Open WhatsApp to Confirm' to send the text receipt directly to the owner."
      }
    },
    giftbox: {
      eyebrow: "Festival Special",
      title: "Build Your Assorted Gift Box",
      subtitle: "Mix and match your favorite sweets in a custom 500g or 1kg gift box.",
      selectSize: "Choose Box Size:",
      addBtn: "Add Custom Box to Cart",
      statusEmpty: "Add sweets to fill up your box!",
      dropzoneText: "Drag & Drop Sweets Here"
    }
  },
  ta: {
    page: {
      title: "ஸ்ரீ ராமச்சந்திரா ஸ்வீட் அண்ட் பேக்கரி"
    },
    brand: {
      name: "ஸ்ரீ ராமச்சந்திரா ஸ்வீட் அண்ட் பேக்கரி",
      aria: "ஸ்ரீ ராமச்சந்திரா ஸ்வீட் அண்ட் பேக்கரி முகப்பு",
      since: "1984 முதல்"
    },
    nav: {
      aria: "முதன்மை வழிசெலுத்தல்",
      home: "முகப்பு",
      sweets: "இனிப்புகள்",
      savouries: "கார வகைகள்",
      about: "எங்களைப் பற்றி",
      contact: "தொடர்பு",
      openMenu: "மெனுவை திறக்கவும்",
      closeMenu: "மெனுவை மூடவும்"
    },
    language: {
      switchToTamil: "தமிழுக்கு மாற்றவும்",
      switchToEnglish: "ஆங்கிலத்திற்கு மாற்றவும்"
    },
    hero: {
      eyebrow: "1984 முதல் பாரம்பரிய சுவை",
      title: "ஸ்ரீ ராமச்சந்திரா ஸ்வீட் அண்ட் பேக்கரி",
      subtitle: "தங்க நிற நெய், பாரம்பரிய சமையல் முறை, ஒவ்வொரு கொண்டாட்டத்தையும் இனிமையாக்கும் சுவை.",
      cta: "மெனுவைப் பார்க்க",
      call: "ஆர்டர் செய்ய அழைக்கவும்",
      sweetsCta: "இனிப்புகளை பார்க்க",
      savouriesCta: "கார வகைகளை பார்க்க",
      highlightsAria: "கடையின் சிறப்புகள்",
      highlightFresh: "சிறிய தொகுதிகளில் தயாரிப்பு",
      highlightGhee: "சுத்த நெய் இனிப்புகள்",
      highlightGift: "விழா பரிசுப் பெட்டிகள்"
    },
    sweets: {
      eyebrow: "பிரத்தியேக இனிப்புகள்",
      title: "எங்கள் சிறப்பு இனிப்புகள்",
      subtitle: "வறுத்த மாவு, ஏலக்காய், தரமான பருப்புகள் மற்றும் சுத்தமான நெய் கொண்டு செய்யப்பட்ட பாரம்பரிய இனிப்புகள்."
    },
    search: {
      placeholder: "இனிப்புகள் அல்லது காரங்களைத் தேடுங்கள்..."
    },
    savouries: {
      eyebrow: "புதிய கார வகைகள்",
      title: "மொறு மொறு கார வகைகள்",
      subtitle: "சுத்தமான எண்ணெய், தேர்ந்தெடுக்கப்பட்ட மசாலாக்கள் மற்றும் பாரம்பரிய சமையல் முறை கொண்டு செய்யப்பட்ட மொறு மொறு ஸ்நாக்ஸ்."
    },
    about: {
      eyebrow: "எங்கள் பாரம்பரியம்",
      title: "பொறுமை, பெருமை, சுத்தமான பொருட்களால் உருவாகும் இனிமை.",
      body: "பல தலைமுறைகளாக, ஸ்ரீ ராமச்சந்திரா ஸ்வீட் அண்ட் பேக்கரி சிறிய தொகுதிகள், கவனமான வறுத்தல், சுத்தமான பொருட்கள் மற்றும் குடும்பங்களை மீண்டும் வரவைக்கும் பாரம்பரிய சமையல் முறையுடன் இனிப்புகளை தயாரித்து வருகிறது.",
      cta: "எங்கள் கடைக்கு வாருங்கள்",
      promiseOneTitle: "பாரம்பரிய சமையல்",
      promiseOneText: "கையால் அளந்து, தினசரி பயிற்சியால் மேம்படுத்தப்படும் சுவை.",
      promiseTwoTitle: "புதிய பொருட்கள்",
      promiseTwoText: "தரமான பருப்புகள், சுத்த நெய் மற்றும் மணமிக்க மசாலா பொருட்கள்.",
      promiseThreeTitle: "பரிசுக்கு தயார்",
      promiseThreeText: "விழாக்கள், திருமணங்கள், குடும்ப சந்திப்புகளுக்காக அழகாக பேக் செய்யப்படும்.",
    },
    footer: {
      tagline: "பாரம்பரிய சுவை, புதிதாக தயாரிப்பு, அன்பான சேவை.",
      contactTitle: "தொடர்பு",
      visitTitle: "எங்களைச் சந்திக்க",
      address: "என் கார்ஸ் தெரு, ஓ.வி.கே நகர், கீரனூர், தமிழ்நாடு 622502",
      directions: "வழியைக் காண",
      hours: "தினமும் திறந்திருக்கும்: காலை 6:00 - இரவு 10:00",
      copyright: "© 2026 ஸ்ரீ ராமச்சந்திரா ஸ்வீட் அண்ட் பேக்கரி. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
      socialAria: "சமூக ஊடக இணைப்புகள்",
      facebook: "Facebook-இல் எங்களை பின்தொடரவும்",
      instagram: "Follow us on Instagram",
      whatsapp: "Message us on WhatsApp"
    },
    reviews: {
      eyebrow: "வாடிக்கையாளர் அன்பு",
      title: "எங்கள் வாடிக்கையாளர்கள் கூறுவது"
    },
    cart: {
      title: "உங்கள் ஆர்டர் கூடை",
      empty: "உங்கள் கூடை காலியாக உள்ளது. இனிப்புகள் மற்றும் கார வகைகளை சேர்க்கவும்!",
      totalLabel: "மொத்தம்:",
      checkout: "WhatsApp மூலம் ஆர்டர் செய்ய",
      open: "ஆர்டர் கூடையை திறக்கவும்",
      close: "ஆர்டர் கூடையை மூடவும்",
      note: "* குறிப்பு: விலை குறிப்பிடாத பொருட்களின் மதிப்பு பின்னர் கணக்கிடப்படும்."
    },
    checkout: {
      dateLabel: "விநியோக தேதி *",
      timeSlotLabel: "விருப்பமான நேர இடைவெளி *",
      selectSlot: "நேரத்தை தேர்வு செய்க",
      slotMorning: "காலை (8 AM - 12 PM)",
      slotAfternoon: "மதியம் (12 PM - 4 PM)",
      slotEvening: "மாலை (4 PM - 8 PM)"
    },
    guide: {
      tag: "ஆர்டர் செய்யும் முறை",
      title: "ஆர்டர் செய்வது எப்படி?",
      subtitle: "உங்கள் வீட்டிற்கே புதிய இனிப்புகளை விநியோகம் செய்ய எளிய 4 படிகள்",
      step1: {
        title: "கூடையில் சேர்க்கவும்",
        desc: "பொருட்களின் எடையை (250g, 500g, 1kg) தேர்வு செய்து கூடையில் சேர்க்கவும்."
      },
      step2: {
        title: "விவரங்களை அளிக்கவும்",
        desc: "கூடைப் பக்கத்தில் செக்அவுட் கிளிக் செய்து, உங்கள் பெயர், எண், முகவரியை உள்ளிடவும்."
      },
      step3: {
        title: "PDF ரசீதைப் பெறுக",
        desc: "ஆர்டர் செய்யவும். உங்களின் PDF ஆர்டர் ரசீது தானாகவே பதிவிறக்கம் செய்யபடும்."
      },
      step4: {
        title: "WhatsApp உறுதிப்படுத்தல்",
        desc: "'WhatsApp மூலம் உறுதி செய்' கிளிக் செய்து ஆர்டர் விவரங்களை கடைக்கு அனுப்பவும்."
      }
    },
    giftbox: {
      eyebrow: "பண்டிகை சிறப்பு",
      title: "தனிப்பயன் பரிசுப் பெட்டியை உருவாக்குங்கள்",
      subtitle: "உங்களுக்குப் பிடித்த இனிப்புகளைத் தேர்ந்தெடுத்து 500g அல்லது 1kg பெட்டியில் கலந்து வாங்குங்கள்.",
      selectSize: "பெட்டியின் அளவை தேர்வு செய்க:",
      addBtn: "கூடையில் சேர்க்கவும்",
      statusEmpty: "உங்கள் பெட்டியை நிரப்ப இனிப்புகளை சேர்க்கவும்!",
      dropzoneText: "இனிப்புகளை இங்கே இழுத்து போடவும்"
    }
  }
};

// DOM Selections
const languageToggle = document.querySelector("#languageToggle");
const menuToggle = document.querySelector("#menuToggle");
const navPanel = document.querySelector("#primaryMenu");
const sweetsContainer = document.querySelector("#sweetsContainer");
const savouriesContainer = document.querySelector("#savouriesContainer");

// Cart Elements
const cartToggle = document.querySelector("#cartToggle");
const cartDrawer = document.querySelector("#cartDrawer");
const cartBadge = document.querySelector("#cartBadge");
const cartItemsList = document.querySelector("#cartItemsList");
const cartTotal = document.querySelector("#cartTotal");
const cartNote = document.querySelector("#cartNote");
const checkoutBtn = document.querySelector("#checkoutBtn");

const savedLanguage = localStorage.getItem("ramachandran-language");
let currentLanguage = translations[savedLanguage] ? savedLanguage : "en";
let revealObserver;

// Cart State
let cart = [];
try {
  const savedCart = localStorage.getItem("ramachandran-cart");
  if (savedCart) {
    cart = JSON.parse(savedCart);
  }
} catch (e) {
  cart = [];
}

function getTranslation(path, language = currentLanguage) {
  return path.split(".").reduce((value, key) => value?.[key], translations[language]) || "";
}

function createGroupedProductCard(product, sizes, addText) {
  const article = document.createElement("article");
  article.className = "sweet-card reveal";

  const media = document.createElement("div");
  media.className = "card-media";

  const image = document.createElement("img");
  image.src = product.image || "assets/no-image.svg";
  image.alt = currentLanguage === "en" ? product.nameEn : product.nameTa;
  image.onerror = function() {
    this.src = "assets/no-image.svg";
  };
  media.appendChild(image);

  const content = document.createElement("div");
  content.className = "card-content";

  const titleRow = document.createElement("div");
  titleRow.className = "card-title-row";

  const title = document.createElement("h3");
  title.textContent = currentLanguage === "en" ? product.nameEn : product.nameTa;
  titleRow.append(title);

  const description = document.createElement("p");
  description.textContent = currentLanguage === "en" ? product.descEn : product.descTa;

  const selectorRow = document.createElement("div");
  selectorRow.className = "size-selector-row";

  const select = document.createElement("select");
  select.className = "size-selector";

  sizes.forEach((size, idx) => {
    const option = document.createElement("option");
    option.value = idx;
    option.textContent = `${size.name} — ₹${size.price}`;
    select.appendChild(option);
  });

  selectorRow.appendChild(select);

  const button = document.createElement("button");
  button.className = "order-btn";
  button.type = "button";

  const buttonText = document.createElement("span");
  buttonText.textContent = addText;

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-shopping-basket";
  icon.setAttribute("aria-hidden", "true");

  button.append(buttonText, icon);
  content.append(titleRow, description, selectorRow, button);
  article.append(media, content);

  button.addEventListener("click", () => {
    const selectedIdx = parseInt(select.value, 10);
    const selectedSize = sizes[selectedIdx];
    addToCart(
      `${product.key}-${selectedSize.name.replace(/\s+/g, "")}`,
      currentLanguage === "en" ? product.nameEn : product.nameTa,
      selectedSize.price,
      `₹${selectedSize.price}`,
      selectedSize.name,
      product.image,
      product.nameEn,
      selectedSize.name
    );
  });

  if (typeof init3DTilt === "function") {
    init3DTilt(article);
  }
  return article;
}

function matchProductSearch(product, searchQuery) {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase().trim();
  const nameEn = (product.nameEn || product.name_en || "").toLowerCase();
  const nameTa = (product.nameTa || product.name_ta || "").toLowerCase();
  const descEn = (product.descEn || product.desc_en || "").toLowerCase();
  const descTa = (product.descTa || product.desc_ta || "").toLowerCase();
  return nameEn.includes(q) || nameTa.includes(q) || descEn.includes(q) || descTa.includes(q);
}

function getProductSearchQuery() {
  const input = document.getElementById("productSearchInput");
  return input ? input.value.trim() : "";
}

function renderSweets(language = currentLanguage, searchQuery = getProductSearchQuery()) {
  if (!sweetsContainer) return 0;
  const grid = document.createElement("div");
  grid.className = "menu-grid";
  const addText = language === "en" ? "Add to Cart" : "கூடையில் சேர்க்க";
  let count = 0;

  sweetGroups.forEach((group) => {
    const sizes = language === "en" ? group.sizes : group.sizesTa;
    group.products.forEach((product) => {
      if (matchProductSearch(product, searchQuery)) {
        grid.appendChild(createGroupedProductCard(product, sizes, addText));
        count++;
      }
    });
  });

  if (count === 0 && searchQuery) {
    const noResultsMsg = language === "en" 
      ? `No sweets found matching "${searchQuery}"`
      : `"${searchQuery}" என்ற தேடலுக்கு இணையான இனிப்புகள் எதுவும் இல்லை`;
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding:32px; text-align:center; color:var(--muted);"><i class="fa-solid fa-magnifying-glass" style="font-size:2rem; margin-bottom:10px; color:var(--saffron);"></i><p style="font-weight:500;">${noResultsMsg}</p></div>`;
  }

  sweetsContainer.replaceChildren(grid);
  observeRevealElements(sweetsContainer);
  return count;
}

function renderSavouries(language = currentLanguage, searchQuery = getProductSearchQuery()) {
  if (!savouriesContainer) return 0;
  const grid = document.createElement("div");
  grid.className = "menu-grid";
  const addText = language === "en" ? "Add to Cart" : "கூடையில் சேர்க்க";
  let count = 0;

  savouryGroups.forEach((group) => {
    const sizes = language === "en" ? group.sizes : group.sizesTa;
    group.products.forEach((product) => {
      if (matchProductSearch(product, searchQuery)) {
        grid.appendChild(createGroupedProductCard(product, sizes, addText));
        count++;
      }
    });
  });

  if (count === 0 && searchQuery) {
    const noResultsMsg = language === "en" 
      ? `No savouries found matching "${searchQuery}"`
      : `"${searchQuery}" என்ற தேடலுக்கு இணையான காரவண்டிகள் எதுவும் இல்லை`;
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1; padding:32px; text-align:center; color:var(--muted);"><i class="fa-solid fa-magnifying-glass" style="font-size:2rem; margin-bottom:10px; color:var(--saffron);"></i><p style="font-weight:500;">${noResultsMsg}</p></div>`;
  }

  savouriesContainer.replaceChildren(grid);
  observeRevealElements(savouriesContainer);
  return count;
}

function handleProductSearch() {
  const input = document.getElementById("productSearchInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  const countEl = document.getElementById("searchResultsCount");
  
  const query = getProductSearchQuery();
  if (clearBtn) {
    clearBtn.style.display = query ? "flex" : "none";
  }

  const sweetsCount = renderSweets(currentLanguage, query);
  const savouriesCount = renderSavouries(currentLanguage, query);

  if (countEl) {
    if (query) {
      const total = sweetsCount + savouriesCount;
      const resultText = currentLanguage === "en"
        ? `Found ${total} item${total !== 1 ? 's' : ''} for "${query}"`
        : `"${query}" - ${total} பொருட்கள் கண்டறியப்பட்டன`;
      countEl.textContent = resultText;
      countEl.style.display = "block";
    } else {
      countEl.style.display = "none";
    }
  }
}

function applyTranslations(language) {
  document.documentElement.lang = language;
  document.title = getTranslation("page.title", language);
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = getTranslation(element.dataset.i18n, language);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    element.alt = getTranslation(element.dataset.i18nAlt, language);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", getTranslation(element.dataset.i18nAriaLabel, language));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = getTranslation(element.dataset.i18nPlaceholder, language);
  });

  handleProductSearch();
  
  // Re-render gift box builder elements
  if (typeof renderGiftBoxSweets === "function") {
    renderGiftBoxSweets();
    updateGiftBoxStats();
  }
  
  updateCartUI();

  languageToggle.textContent = language === "en" ? "தமிழ்" : "English";
  languageToggle.setAttribute("aria-label", getTranslation(language === "en" ? "language.switchToTamil" : "language.switchToEnglish", language));
  refreshMenuButtonLabel(language);
  
  if (typeof updateShopStatus === "function") {
    updateShopStatus();
  }
  if (typeof renderReviews === "function") {
    renderReviews();
  }
}

function refreshMenuButtonLabel(language = currentLanguage) {
  const isOpen = navPanel.classList.contains("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", getTranslation(isOpen ? "nav.closeMenu" : "nav.openMenu", language));
  menuToggle.querySelector("i").className = isOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars";
}

function setLanguage(language) {
  currentLanguage = language;
  localStorage.setItem("ramachandran-language", language);
  applyTranslations(language);
}

function closeMobileMenu() {
  navPanel.classList.remove("is-open");
  refreshMenuButtonLabel();
}

function observeRevealElements(scope = document) {
  const elements = scope.querySelectorAll(".reveal:not(.is-visible)");
  if (!revealObserver) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  elements.forEach((element) => revealObserver.observe(element));
}

// Cart State Handlers
function addToCart(id, name, priceVal, priceText, size, image, nameEn = null, sizeEn = null) {
  const existingItem = cart.find((item) => item.id === id);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id,
      name,
      priceVal,
      priceText,
      size,
      image,
      nameEn: nameEn || name,
      sizeEn: sizeEn || size,
      quantity: 1
    });
  }
  saveCart();
  updateCartUI();
  openCartDrawer();
}

function saveCart() {
  localStorage.setItem("ramachandran-cart", JSON.stringify(cart));
}

function updateCartQuantity(id, delta) {
  const item = cart.find((item) => item.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(id);
  } else {
    saveCart();
    updateCartUI();
  }
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
  updateCartUI();
}

function updateCartUI() {
  if (!cartItemsList) return;

  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartBadge) {
    cartBadge.textContent = totalQty;
    cartBadge.hidden = totalQty === 0;
  }

  if (cart.length === 0) {
    cartItemsList.innerHTML = `<p class="cart-empty">${getTranslation("cart.empty")}</p>`;
    if (cartTotal) cartTotal.textContent = "₹0";
    if (checkoutBtn) checkoutBtn.disabled = true;
    if (cartNote) cartNote.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  let totalPrice = 0;
  let hasPriceOnCall = false;

  cart.forEach((item) => {
    const itemEl = document.createElement("div");
    itemEl.className = "cart-item";

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    img.className = "cart-item-img";

    const details = document.createElement("div");
    details.className = "cart-item-details";

    const name = document.createElement("h4");
    name.className = "cart-item-name";
    name.textContent = item.name;

    const size = document.createElement("span");
    size.className = "cart-item-size";
    size.textContent = `${currentLanguage === "en" ? "Size" : "அளவு"}: ${item.size}`;

    const price = document.createElement("span");
    price.className = "cart-item-price";

    if (item.priceVal > 0) {
      const itemSubtotal = item.priceVal * item.quantity;
      totalPrice += itemSubtotal;
      price.textContent = `₹${itemSubtotal}`;
    } else {
      hasPriceOnCall = true;
      price.textContent = currentLanguage === "en" ? "Price on call" : "விலைக்கு அழைக்கவும்";
    }

    details.append(name, size, price);

    const actions = document.createElement("div");
    actions.className = "cart-item-actions";

    const qtyContainer = document.createElement("div");
    qtyContainer.className = "cart-item-quantity";

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "qty-btn";
    minusBtn.textContent = "-";
    minusBtn.addEventListener("click", () => updateCartQuantity(item.id, -1));

    const qtyVal = document.createElement("span");
    qtyVal.className = "qty-val";
    qtyVal.textContent = item.quantity;

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "qty-btn";
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", () => updateCartQuantity(item.id, 1));

    qtyContainer.append(minusBtn, qtyVal, plusBtn);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "cart-item-remove";
    removeBtn.textContent = currentLanguage === "en" ? "Remove" : "நீக்கு";
    removeBtn.addEventListener("click", () => removeFromCart(item.id));

    actions.append(qtyContainer, removeBtn);
    itemEl.append(img, details, actions);
    fragment.appendChild(itemEl);
  });

  cartItemsList.replaceChildren(fragment);

  if (cartTotal) {
    cartTotal.textContent = `₹${totalPrice}` + (hasPriceOnCall ? " +" : "");
  }
  if (cartNote) {
    cartNote.hidden = !hasPriceOnCall;
  }
  if (checkoutBtn) {
    checkoutBtn.disabled = false;
  }
}

function openCartDrawer() {
  if (cartDrawer) {
    cartDrawer.hidden = false;
    document.body.classList.add("is-locked");
  }
}

function closeCartDrawer() {
  if (cartDrawer) {
    cartDrawer.hidden = true;
    document.body.classList.remove("is-locked");
  }
}

function generateWhatsAppLink() {
  if (cart.length === 0) return;

  let totalPrice = 0;
  let hasPriceOnCall = false;
  let message = `Hello Sri Ramachandra Sweets & Bakery, I would like to place an order:\n\n`;

  cart.forEach((item, idx) => {
    let priceText = "";
    if (item.priceVal > 0) {
      const subtotal = item.priceVal * item.quantity;
      totalPrice += subtotal;
      priceText = `₹${subtotal} (₹${item.priceVal} each)`;
    } else {
      hasPriceOnCall = true;
      priceText = "Price on call";
    }
    message += `${idx + 1}. ${item.name} (${item.size}) x ${item.quantity} - ${priceText}\n`;
  });

  const totalStr = `₹${totalPrice}` + (hasPriceOnCall ? " + Price on call items" : "");
  message += `\n*Total Order Value:* ${totalStr}\n\nThank you!`;

  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/919626505520?text=${encodedText}`;
  window.open(whatsappUrl, "_blank");
}

// Checkout DOM Selections
const checkoutModal = document.querySelector("#checkoutModal");
const checkoutForm = document.querySelector("#checkoutForm");
const closeCheckoutBtn = document.querySelector("#closeCheckoutBtn");
const checkoutBackdrop = document.querySelector("#checkoutBackdrop");

const stepForm = document.querySelector("#checkoutStepForm");
const stepPayment = document.querySelector("#checkoutStepPayment");
const stepReceipt = document.querySelector("#checkoutStepReceipt");

const summaryItems = document.querySelector("#checkoutSummaryItems");
const summaryTotal = document.querySelector("#checkoutSummaryTotal");
const placeOrderBtn = document.querySelector("#placeOrderBtn");
const printableReceipt = document.querySelector("#printableReceipt");

const downloadReceiptBtn = document.querySelector("#downloadReceiptBtn");
const sendOwnerWhatsAppBtn = document.querySelector("#sendOwnerWhatsAppBtn");

// Form inputs
const custName = document.querySelector("#custName");
const custWhatsApp = document.querySelector("#custWhatsApp");
const custAddress = document.querySelector("#custAddress");
const deliveryDate = document.querySelector("#deliveryDate");
const deliveryTimeSlot = document.querySelector("#deliveryTimeSlot");

// Form errors
const nameError = document.querySelector("#nameError");
const phoneError = document.querySelector("#phoneError");
const addressError = document.querySelector("#addressError");

let checkoutData = {
  name: "",
  phone: "",
  address: "",
  deliveryDate: "",
  deliveryTimeSlot: "",
  paymentMethod: "COD",
  orderId: "",
  orderDate: "",
  items: []
};

// Open checkout modal
function openCheckout() {
  if (cart.length === 0) return;
  closeCartDrawer();
  
  // Reset form steps
  stepForm.hidden = false;
  stepPayment.hidden = true;
  stepReceipt.hidden = true;
  
  // Clear inputs
  custName.value = "";
  custWhatsApp.value = "";
  custAddress.value = "";
  if (deliveryDate) deliveryDate.value = "";
  if (deliveryTimeSlot) deliveryTimeSlot.value = "";
  
  // Set minimum date and default value to today
  if (deliveryDate) {
    const today = new Date().toISOString().split('T')[0];
    deliveryDate.setAttribute('min', today);
    deliveryDate.value = today;
  }
  
  // Clear errors
  custName.parentElement.classList.remove("has-error");
  custWhatsApp.parentElement.classList.remove("has-error");
  custAddress.parentElement.classList.remove("has-error");
  if (deliveryDate) deliveryDate.parentElement.classList.remove("has-error");
  if (deliveryTimeSlot) deliveryTimeSlot.parentElement.classList.remove("has-error");
  
  checkoutModal.hidden = false;
  document.body.classList.add("is-locked");
}

function closeCheckout() {
  checkoutModal.hidden = true;
  document.body.classList.remove("is-locked");
}

// Step 1: Submit Form details
checkoutForm.addEventListener("submit", (e) => {
  e.preventDefault();
  
  let isValid = true;
  
  // Validate name
  if (!custName.value.trim()) {
    custName.parentElement.classList.add("has-error");
    isValid = false;
  } else {
    custName.parentElement.classList.remove("has-error");
  }
  
  // Validate phone (strictly 10 digits)
  const phoneVal = custWhatsApp.value.trim().replace(/\D/g, "");
  if (phoneVal.length !== 10) {
    custWhatsApp.parentElement.classList.add("has-error");
    isValid = false;
  } else {
    custWhatsApp.parentElement.classList.remove("has-error");
  }
  
  // Validate address
  if (!custAddress.value.trim()) {
    custAddress.parentElement.classList.add("has-error");
    isValid = false;
  } else {
    custAddress.parentElement.classList.remove("has-error");
  }
  
  // Validate Delivery Date
  if (deliveryDate && !deliveryDate.value) {
    deliveryDate.parentElement.classList.add("has-error");
    isValid = false;
  } else if (deliveryDate) {
    deliveryDate.parentElement.classList.remove("has-error");
  }
  
  // Validate Time Slot
  if (deliveryTimeSlot && !deliveryTimeSlot.value) {
    deliveryTimeSlot.parentElement.classList.add("has-error");
    isValid = false;
  } else if (deliveryTimeSlot) {
    deliveryTimeSlot.parentElement.classList.remove("has-error");
  }
  
  if (!isValid) return;
  
  // Store customer details
  checkoutData.name = custName.value.trim();
  checkoutData.phone = phoneVal;
  checkoutData.address = custAddress.value.trim();
  checkoutData.deliveryDate = deliveryDate ? deliveryDate.value : "";
  checkoutData.deliveryTimeSlot = deliveryTimeSlot ? deliveryTimeSlot.value : "";
  
  // Transition to payment
  showCheckoutPaymentStep();
});

// Enforce 10-digit max length on phone input in real-time
if (custWhatsApp) {
  custWhatsApp.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
  });
}

function showCheckoutPaymentStep() {
  stepForm.hidden = true;
  stepPayment.hidden = false;
  
  // Populate summary items
  let summaryHtml = "";
  let total = 0;
  cart.forEach(item => {
    const itemTotal = item.priceVal * item.quantity;
    total += itemTotal;
    summaryHtml += `
      <div class="summary-item-row">
        <span>${item.name} (${item.size}) x ${item.quantity}</span>
        <span>₹${itemTotal}</span>
      </div>
    `;
  });
  
  summaryItems.innerHTML = summaryHtml;
  summaryTotal.textContent = `₹${total}`;
  
  checkoutData.paymentMethod = "COD";
  placeOrderBtn.disabled = false;
}

// Final Order Placement & WhatsApp Auto-Navigation
placeOrderBtn.addEventListener("click", async () => {
  placeOrderBtn.disabled = true;
  placeOrderBtn.textContent = 'Opening WhatsApp...';

  // Generate Order ID (SRB-YYYYMMDD-XXXX)
  const now = new Date();
  const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  checkoutData.orderId = `SRB-${dateStr}-${randomStr}`;
  
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  checkoutData.orderDate = now.toLocaleDateString('en-US', options);
  
  // Keep copy of cart items for receipt downloading
  checkoutData.items = [...cart];

  // ── Save order to backend database ──────────────────────────────────────────
  try {
    const totalPrice = cart.reduce((sum, item) => sum + (item.priceVal || 0) * (item.quantity || 1), 0);
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: checkoutData.name,
        phone_number: checkoutData.phone,
        delivery_address: checkoutData.address,
        delivery_date: checkoutData.deliveryDate,
        time_slot: checkoutData.deliveryTimeSlot,
        items: checkoutData.items,
        total_price: totalPrice,
        payment_method: 'Cash on Delivery'
      })
    });
  } catch (err) {
    console.warn('Could not save order to server:', err);
  }

  // Construct WhatsApp Order Message for Store Owner (+91 96265 05520)
  let message = `*NEW ORDER PLACED*\n`;
  message += `*Order ID:* ${checkoutData.orderId}\n`;
  message += `*Order Date:* ${checkoutData.orderDate}\n\n`;
  message += `*Customer Name:* ${checkoutData.name}\n`;
  message += `*Customer Phone:* +91 ${checkoutData.phone}\n`;
  message += `*Delivery Address:* ${checkoutData.address}\n`;
  message += `*Delivery Date:* ${checkoutData.deliveryDate}\n`;
  message += `*Time Slot:* ${checkoutData.deliveryTimeSlot}\n\n`;
  message += `*Ordered Items:*\n`;
  
  let orderTotal = 0;
  checkoutData.items.forEach((item, idx) => {
    const itemTotal = item.priceVal * item.quantity;
    orderTotal += itemTotal;
    message += `${idx + 1}. ${item.name} (${item.size}) x ${item.quantity} - ₹${itemTotal}\n`;
  });
  
  message += `\n*Total Amount:* ₹${orderTotal}\n`;
  message += `*Payment Method:* Cash on Delivery (COD)\n\n`;
  message += `Please confirm my order. Thank you!`;

  const waUrl = `https://api.whatsapp.com/send?phone=919626505520&text=${encodeURIComponent(message)}`;

  placeOrderBtn.disabled = false;
  placeOrderBtn.textContent = 'Place Order via WhatsApp';

  // Open WhatsApp automatically on customer's phone / device
  window.location.href = waUrl;

  // Show receipt screen in background
  showCheckoutReceiptStep();
});

function showCheckoutReceiptStep() {
  stepPayment.hidden = true;
  stepReceipt.hidden = false;
  
  // Render receipt html
  let itemsHtml = "";
  let total = 0;
  checkoutData.items.forEach(item => {
    const itemTotal = item.priceVal * item.quantity;
    total += itemTotal;
    itemsHtml += `
      <div class="receipt-table-item">
        <span>${item.name} (${item.size})</span>
        <span>${item.quantity}</span>
        <span>₹${itemTotal}</span>
      </div>
    `;
  });
  
  const paymentStatusText = "Payment Pending";
  const paymentStatusClass = "pending";
  
  printableReceipt.innerHTML = `
    <div class="receipt-logo">Sri Ramachandra Sweets & Bakery</div>
    <div class="receipt-metadata">
      <div class="receipt-meta-row">
        <span><strong>Order ID:</strong> ${checkoutData.orderId}</span>
        <span><strong>Date:</strong> ${checkoutData.orderDate}</span>
      </div>
      <div class="receipt-meta-row">
        <span><strong>Customer Name:</strong> ${checkoutData.name}</span>
        <span><strong>WhatsApp:</strong> +91 ${checkoutData.phone}</span>
      </div>
    </div>
    
    <div class="receipt-address">
      <strong>Delivery Details & Schedule</strong>
      <div style="margin-top: 4px;"><strong>Address:</strong> ${checkoutData.address}</div>
      <div style="margin-top: 4px;"><strong>Delivery Date:</strong> ${checkoutData.deliveryDate}</div>
      <div style="margin-top: 2px;"><strong>Time Slot:</strong> ${checkoutData.deliveryTimeSlot}</div>
    </div>
    
    <div class="receipt-table-header">
      <span>Item Description</span>
      <span>Qty</span>
      <span>Subtotal</span>
    </div>
    
    ${itemsHtml}
    
    <div class="receipt-total-box">
      <div class="receipt-total-row">
        <span>Grand Total:</span>
        <span>₹${total}</span>
      </div>
      <div class="receipt-payment-row">
        <span>Payment Method:</span>
        <span>Cash on Delivery (COD)</span>
      </div>
      <div class="receipt-payment-row">
        <span>Payment Status:</span>
        <span class="payment-status-badge ${paymentStatusClass}">${paymentStatusText}</span>
      </div>
    </div>
  `;
  
  // Auto-generate and download PDF for the customer
  generateReceiptPDF();

  // Clear Cart State
  cart = [];
  saveCart();
  updateCartUI();
}

function generateReceiptPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Color palette
  const saffronColor = [243, 112, 33];
  const charcoalColor = [27, 28, 30];
  const mutedColor = [100, 100, 100];

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(saffronColor[0], saffronColor[1], saffronColor[2]);
  doc.text("Sri Ramachandra Sweets & Bakery", 105, 20, { align: "center" });

  // Subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text("N Car St, OVK Nagar, Kiranur, Tamil Nadu 622502 | Ph: 9626505520", 105, 27, { align: "center" });

  // Divider line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(15, 33, 195, 33);

  // Receipt Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(charcoalColor[0], charcoalColor[1], charcoalColor[2]);
  doc.text("ORDER RECEIPT", 15, 43);

  // Metadata Columns
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Left Column
  doc.text(`Order ID: ${checkoutData.orderId}`, 15, 52);
  doc.text(`Date & Time: ${checkoutData.orderDate}`, 15, 58);

  // Right Column
  doc.text(`Customer Name: ${checkoutData.name}`, 110, 52);
  doc.text(`WhatsApp: +91 ${checkoutData.phone}`, 110, 58);

  // Delivery Details box
  doc.setFillColor(248, 248, 248);
  doc.rect(15, 66, 180, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text("DELIVERY DETAILS & SCHEDULE:", 18, 72);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(charcoalColor[0], charcoalColor[1], charcoalColor[2]);
  
  const splitAddress = doc.splitTextToSize(`Address: ${checkoutData.address}`, 172);
  doc.text(splitAddress, 18, 78);
  
  const scheduleText = `Delivery Date: ${checkoutData.deliveryDate}  |  Time Slot: ${checkoutData.deliveryTimeSlot}`;
  doc.text(scheduleText, 18, 89);

  // Table header
  let currentY = 98;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, currentY, 195, currentY);
  currentY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(charcoalColor[0], charcoalColor[1], charcoalColor[2]);
  doc.text("Item Description", 15, currentY);
  doc.text("Qty", 125, currentY, { align: "center" });
  doc.text("Price", 155, currentY, { align: "right" });
  doc.text("Total", 195, currentY, { align: "right" });

  currentY += 4;
  doc.line(15, currentY, 195, currentY);
  currentY += 8;

  // Table rows
  doc.setFont("helvetica", "normal");
  let grandTotal = 0;
  checkoutData.items.forEach(item => {
    const subtotal = item.priceVal * item.quantity;
    grandTotal += subtotal;
    
    const descText = `${item.nameEn || item.name} (${item.sizeEn || item.size})`;
    const splitDesc = doc.splitTextToSize(descText, 100);
    
    doc.text(splitDesc, 15, currentY);
    doc.text(String(item.quantity), 125, currentY, { align: "center" });
    doc.text(`Rs. ${item.priceVal}`, 155, currentY, { align: "right" });
    doc.text(`Rs. ${subtotal}`, 195, currentY, { align: "right" });
    
    const linesCount = splitDesc.length;
    currentY += (linesCount * 5) + 3;
  });

  doc.line(15, currentY, 195, currentY);
  currentY += 8;

  // Grand Total box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(saffronColor[0], saffronColor[1], saffronColor[2]);
  doc.text("Grand Total:", 120, currentY);
  doc.text(`Rs. ${grandTotal}`, 195, currentY, { align: "right" });

  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(charcoalColor[0], charcoalColor[1], charcoalColor[2]);
  doc.text("Payment Mode: Cash on Delivery (COD)", 120, currentY);

  currentY += 5;
  doc.text("Payment Status: Pending (COD)", 120, currentY);

  // Footer message
  currentY += 15;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text("Thank you for ordering with Sri Ramachandra Sweets & Bakery!", 105, currentY, { align: "center" });

  // Save the PDF
  doc.save(`Receipt-${checkoutData.orderId}.pdf`);
}

downloadReceiptBtn.addEventListener("click", generateReceiptPDF);

sendOwnerWhatsAppBtn.addEventListener("click", () => {
  let message = `*NEW ORDER RECEIVED*\n`;
  message += `*Order ID:* ${checkoutData.orderId}\n`;
  message += `*Order Date:* ${checkoutData.orderDate}\n\n`;
  message += `*Customer Name:* ${checkoutData.name}\n`;
  message += `*WhatsApp:* +91 ${checkoutData.phone}\n`;
  message += `*Delivery Address:* ${checkoutData.address}\n`;
  message += `*Delivery Date:* ${checkoutData.deliveryDate}\n`;
  message += `*Time Slot:* ${checkoutData.deliveryTimeSlot}\n\n`;
  message += `*Ordered Items:*\n`;
  
  let total = 0;
  checkoutData.items.forEach((item, idx) => {
    const itemTotal = item.priceVal * item.quantity;
    total += itemTotal;
    message += `${idx + 1}. ${item.name} (${item.size}) x ${item.quantity} - ₹${itemTotal}\n`;
  });
  
  message += `\n*Total Amount:* ₹${total}\n`;
  message += `*Payment Method:* Cash on Delivery (COD)\n`;
  message += `*Payment Status:* Payment Pending (COD)\n\n`;
  message += `Please confirm the order receipt. Thank you!`;
  
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/919626505520?text=${encodedText}`;
  window.open(whatsappUrl, "_blank");
});

// Event Listeners
languageToggle.addEventListener("click", () => {
  setLanguage(currentLanguage === "en" ? "ta" : "en");
});

menuToggle.addEventListener("click", () => {
  navPanel.classList.toggle("is-open");
  refreshMenuButtonLabel();
});

document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", closeMobileMenu);
});

if (cartToggle) {
  cartToggle.addEventListener("click", openCartDrawer);
}

document.querySelectorAll("[data-close-cart]").forEach((btn) => {
  btn.addEventListener("click", closeCartDrawer);
});

if (checkoutBtn) {
  checkoutBtn.addEventListener("click", openCheckout);
}

if (closeCheckoutBtn) {
  closeCheckoutBtn.addEventListener("click", closeCheckout);
}
if (checkoutBackdrop) {
  checkoutBackdrop.addEventListener("click", closeCheckout);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (cartDrawer && !cartDrawer.hidden) {
      closeCartDrawer();
    }
    if (checkoutModal && !checkoutModal.hidden) {
      if (stepReceipt.hidden) {
        closeCheckout();
      }
    }
  }
});

if ("IntersectionObserver" in window) {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });
}

observeRevealElements(document);

// Dark Mode Toggle Logic
const themeToggle = document.querySelector("#themeToggle");
const savedTheme = localStorage.getItem("ramachandran-theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark-mode");
  if (themeToggle) {
    themeToggle.querySelector("i").className = "fa-solid fa-sun";
  }
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("ramachandran-theme", isDark ? "dark" : "light");
    themeToggle.querySelector("i").className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
  });
}

// Gift Box Builder State & Logic
let giftBoxState = {
  targetWeight: 500, // 500 or 1000
  selectedSweets: {}, // key: weight in grams (e.g. "mysorePak": 200)
  totalWeight: 0,
  totalPrice: 0
};

// Elements
const giftboxSweetsMix = document.querySelector("#giftboxSweetsMix");
const boxCurrentWeight = document.querySelector("#boxCurrentWeight");
const boxTargetWeight = document.querySelector("#boxTargetWeight");
const boxCurrentPrice = document.querySelector("#boxCurrentPrice");
const boxProgressFill = document.querySelector("#boxProgressFill");
const boxStatusMessage = document.querySelector("#boxStatusMessage");
const addGiftBoxToCartBtn = document.querySelector("#addGiftBoxToCartBtn");

function getAvailableSweets() {
  const sweets = [];
  sweetGroups.forEach(group => {
    const size1kg = group.sizes.find(s => s.name === "1 kg");
    const price1kg = size1kg ? size1kg.price : 300;
    
    group.products.forEach(prod => {
      if (prod.key === "mixedSweetBox") return;
      if (prod.in_giftbox === 0) return; // Exclude sweets disabled for giftbox by admin
      sweets.push({
        key: prod.key,
        nameEn: prod.nameEn,
        nameTa: prod.nameTa,
        image: prod.image,
        pricePer100g: price1kg / 10
      });
    });
  });
  return sweets;
}

function renderGiftBoxSweets() {
  if (!giftboxSweetsMix) return;
  const sweets = getAvailableSweets();
  
  giftboxSweetsMix.innerHTML = "";
  sweets.forEach(sweet => {
    const currentWeight = giftBoxState.selectedSweets[sweet.key] || 0;
    const nameText = currentLanguage === "en" ? sweet.nameEn : sweet.nameTa;
    
    const card = document.createElement("div");
    card.className = "mix-card";
    card.setAttribute("draggable", "true");
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", sweet.key);
      e.dataTransfer.effectAllowed = "move";
    });
    card.innerHTML = `
      <img src="${sweet.image}" alt="${nameText}" class="mix-card-img">
      <div class="mix-card-info">
        <h4>${nameText}</h4>
        <span class="price-tag">₹${sweet.pricePer100g} / 100g</span>
      </div>
      <div class="mix-controls">
        <button type="button" class="btn-mix btn-minus" data-key="${sweet.key}">-</button>
        <span class="mix-qty">${currentWeight}g</span>
        <button type="button" class="btn-mix btn-plus" data-key="${sweet.key}">+</button>
      </div>
    `;
    
    card.querySelector(".btn-minus").addEventListener("click", () => updateSweetWeight(sweet.key, -100));
    card.querySelector(".btn-plus").addEventListener("click", () => updateSweetWeight(sweet.key, 100));
    
    giftboxSweetsMix.appendChild(card);
  });
}

function updateSweetWeight(key, change) {
  const sweets = getAvailableSweets();
  const sweet = sweets.find(s => s.key === key);
  if (!sweet) return;
  
  const currentVal = giftBoxState.selectedSweets[key] || 0;
  let newVal = currentVal + change;
  if (newVal < 0) newVal = 0;
  
  let potentialTotal = 0;
  for (const k in giftBoxState.selectedSweets) {
    if (k === key) {
      potentialTotal += newVal;
    } else {
      potentialTotal += giftBoxState.selectedSweets[k];
    }
  }
  
  if (potentialTotal > giftBoxState.targetWeight) {
    if (change > 0) {
      const remaining = giftBoxState.targetWeight - (potentialTotal - newVal);
      newVal = currentVal + remaining;
    }
  }
  
  if (newVal === 0) {
    delete giftBoxState.selectedSweets[key];
  } else {
    giftBoxState.selectedSweets[key] = newVal;
  }
  
  updateGiftBoxStats();
  renderGiftBoxSweets();
}

function updateGiftBoxStats() {
  if (!boxCurrentWeight) return;
  const sweets = getAvailableSweets();
  let totalW = 0;
  let totalP = 0;
  
  for (const key in giftBoxState.selectedSweets) {
    const w = giftBoxState.selectedSweets[key];
    const sweet = sweets.find(s => s.key === key);
    if (sweet) {
      totalW += w;
      totalP += (w / 100) * sweet.pricePer100g;
    }
  }
  
  giftBoxState.totalWeight = totalW;
  giftBoxState.totalPrice = totalP;
  
  boxCurrentWeight.textContent = totalW;
  boxCurrentPrice.textContent = `₹${totalP}`;
  
  const percentage = (totalW / giftBoxState.targetWeight) * 100;
  boxProgressFill.style.width = `${percentage}%`;
  
  if (totalW === 0) {
    boxStatusMessage.textContent = currentLanguage === "en" ? "Add sweets to fill up your box!" : "உங்கள் பெட்டியை நிரப்ப இனிப்புகளை சேர்க்கவும்!";
    addGiftBoxToCartBtn.disabled = true;
  } else if (totalW < giftBoxState.targetWeight) {
    const needed = giftBoxState.targetWeight - totalW;
    boxStatusMessage.textContent = currentLanguage === "en" ? `Add ${needed}g more to fill the box.` : `பெட்டியை நிரப்ப இன்னும் ${needed}g சேர்க்கவும்.`;
    addGiftBoxToCartBtn.disabled = true;
  } else {
    boxStatusMessage.textContent = currentLanguage === "en" ? "Your box is full and ready!" : "உங்கள் பெட்டி நிறைந்தது, ஆர்டர் செய்ய தயாராக உள்ளது!";
    addGiftBoxToCartBtn.disabled = false;
  }
}

// Bind size selectors
document.querySelectorAll(".btn-size").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".btn-size").forEach(b => b.classList.remove("active"));
    e.currentTarget.classList.add("active");
    
    const size = parseInt(e.currentTarget.dataset.size, 10);
    giftBoxState.targetWeight = size;
    boxTargetWeight.textContent = size;
    
    giftBoxState.selectedSweets = {};
    updateGiftBoxStats();
    renderGiftBoxSweets();
  });
});

if (addGiftBoxToCartBtn) {
  addGiftBoxToCartBtn.addEventListener("click", () => {
    if (giftBoxState.totalWeight !== giftBoxState.targetWeight) return;
    
    const contentsEn = [];
    const contentsTa = [];
    const sweets = getAvailableSweets();
    for (const key in giftBoxState.selectedSweets) {
      const sweet = sweets.find(s => s.key === key);
      if (sweet) {
        contentsEn.push(`${sweet.nameEn} (${giftBoxState.selectedSweets[key]}g)`);
        contentsTa.push(`${sweet.nameTa} (${giftBoxState.selectedSweets[key]}g)`);
      }
    }
    
    const boxTitleEn = `Custom Gift Box (${giftBoxState.targetWeight === 500 ? "500g" : "1kg"})`;
    const boxTitleTa = `தனிப்பயன் பரிசுப் பெட்டி (${giftBoxState.targetWeight === 500 ? "500g" : "1kg"})`;
    const boxDescEn = contentsEn.join(", ");
    const boxDescTa = contentsTa.join(", ");
    
    const giftBoxImage = "assets/hero-sweets.svg";
    addToCart(
      `custom-box-${Date.now()}`,
      currentLanguage === "en" ? boxTitleEn : boxTitleTa,
      giftBoxState.totalPrice,
      `₹${giftBoxState.totalPrice}`,
      currentLanguage === "en" ? boxDescEn : boxDescTa,
      giftBoxImage,
      boxTitleEn,
      boxDescEn
    );
    
    giftBoxState.selectedSweets = {};
    updateGiftBoxStats();
    renderGiftBoxSweets();
  });
}

// --- Interactive Animation Enhancements ---

// 1. 3D Card Tilt & Glare Shimmer
function init3DTilt(card) {
  if (!card) return;
  
  // Insert the glare overlay element inside the card if it doesn't exist
  let glare = card.querySelector(".card-glare");
  if (!glare) {
    glare = document.createElement("div");
    glare.className = "card-glare";
    card.appendChild(glare);
  }
  
  card.addEventListener("mousemove", (e) => {
    // Disable CSS animations for direct mouse response
    card.style.transition = "transform 50ms linear, box-shadow 150ms ease";
    
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Tilt angle max: 7 degrees
    const rotateX = ((centerY - y) / centerY) * 7;
    const rotateY = ((x - centerX) / centerX) * 7;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    
    // Position the radial glare overlay
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;
    glare.style.setProperty("--glare-x", `${percentX}%`);
    glare.style.setProperty("--glare-y", `${percentY}%`);
  });
  
  card.addEventListener("mouseleave", () => {
    // Restore smooth CSS transitions on exit
    card.style.transition = "transform 350ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 350ms ease";
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  });
}

// Initialize 3D Tilt on already rendered cards if any
document.querySelectorAll(".sweet-card, .savoury-card").forEach(card => {
  init3DTilt(card);
});

// 2. Mouse-Tracking Lantern Glow (Smooth follow lag using requestAnimationFrame)
const lanternGlow = document.querySelector("#lantern-glow");
let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;

document.addEventListener("mousemove", (e) => {
  targetX = e.clientX;
  targetY = e.clientY;
});

function animateLantern() {
  if (lanternGlow && document.body.classList.contains("dark-mode")) {
    // Interpolate positions for smooth following lag
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    
    // Add scroll coordinates to translate to absolute viewport fixed coordinates
    lanternGlow.style.left = `${currentX}px`;
    lanternGlow.style.top = `${currentY}px`;
  }
  requestAnimationFrame(animateLantern);
}
// Start tracking loop
requestAnimationFrame(animateLantern);

// 3. Drag and Drop for Custom Gift Box Builder
const giftboxDropzone = document.querySelector("#giftboxDropzone");

if (giftboxDropzone) {
  giftboxDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    giftboxDropzone.classList.add("drag-over");
    e.dataTransfer.dropEffect = "move";
  });
  
  giftboxDropzone.addEventListener("dragleave", () => {
    giftboxDropzone.classList.remove("drag-over");
  });
  
  giftboxDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    giftboxDropzone.classList.remove("drag-over");
    
    const sweetKey = e.dataTransfer.getData("text/plain");
    if (sweetKey) {
      // Add 100g of the dropped sweet
      updateSweetWeight(sweetKey, 100);
      
      // Visual bounce feedback
      giftboxDropzone.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.08)' },
        { transform: 'scale(1)' }
      ], {
        duration: 320,
        easing: 'ease-out'
      });
    }
  });
}

// --- Reviews & Shop Status Indicators ---

// 1. Shop Timings Live Status Indicator (6:00 AM - 10:00 PM)
function updateShopStatus() {
  const statusBadge = document.querySelector("#liveStatusBadge");
  if (!statusBadge) return;
  
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeVal = hours * 100 + minutes; // e.g. 2130
  
  // Timing range: 6:00 AM (600) to 10:00 PM (2200)
  const isOpen = timeVal >= 600 && timeVal < 2200;
  
  if (isOpen) {
    statusBadge.className = "live-status-badge status-open";
    statusBadge.innerHTML = `<span class="live-status-dot"></span>${currentLanguage === "en" ? "Open Now" : "இப்போது திறந்துள்ளது"}`;
  } else {
    statusBadge.className = "live-status-badge status-closed";
    statusBadge.innerHTML = `<span class="live-status-dot"></span>${currentLanguage === "en" ? "Closed Now" : "இப்போது மூடப்பட்டுள்ளது"}`;
  }
}

// 2. Customer Reviews Data & Rendering
const reviewsData = [
  {
    textEn: "The Special Mysore Pak is outstanding! It literally melts in the mouth. Highly recommended for any festival.",
    textTa: "ஸ்பெஷல் மைசூர் பாக் அருமையாக உள்ளது! வாயில் வைத்ததும் கரைகிறது. பண்டிகைகளுக்கு மிகவும் பரிந்துரைக்கிறேன்.",
    authorEn: "Vignesh Kumar",
    authorTa: "விக்னேஷ் குமார்"
  },
  {
    textEn: "I always order their Boondhi Laddus and Savoury Mixture for family gatherings. Consistent taste and quality for years.",
    textTa: "குடும்ப விழாக்களுக்கு எப்போதும் பூந்தி லட்டு மற்றும் கார கலவையை ஆர்டர் செய்வேன். பல வருடங்களாக மாறாத தரம்.",
    authorEn: "Ramanathan S.",
    authorTa: "ராமநாதன் எஸ்."
  },
  {
    textEn: "Amazing quality and pure ghee aroma. The option to build a custom gift box is a fantastic addition!",
    textTa: "அற்புதமான தரம் மற்றும் சுத்தமான நெய் மணம். நமக்கு பிடித்த இனிப்புகளை கலந்து பெட்டி செய்யும் வசதி மிகவும் அருமை!",
    authorEn: "Meenakshi Sundaram",
    authorTa: "மீனாட்சி சுந்தரம்"
  }
];

let currentReviewIdx = 0;

function renderReviews() {
  const slider = document.querySelector("#reviewsSlider");
  if (!slider) return;
  
  slider.innerHTML = "";
  reviewsData.forEach(rev => {
    const text = currentLanguage === "en" ? rev.textEn : rev.textTa;
    const author = currentLanguage === "en" ? rev.authorEn : rev.authorTa;
    
    const slide = document.createElement("div");
    slide.className = "review-card";
    slide.innerHTML = `
      <div class="review-stars">
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
      </div>
      <p class="review-text">"${text}"</p>
      <span class="review-author">${author}</span>
    `;
    
    // Bind 3D tilt response to the slide!
    if (typeof init3DTilt === "function") {
      init3DTilt(slide);
    }
    
    slider.appendChild(slide);
  });
  
  updateSliderPosition();
}

function updateSliderPosition() {
  const slider = document.querySelector("#reviewsSlider");
  if (!slider) return;
  slider.style.transform = `translateX(-${currentReviewIdx * 100}%)`;
}

// Bind navigation arrows
document.querySelector("#prevReview")?.addEventListener("click", () => {
  currentReviewIdx = (currentReviewIdx - 1 + reviewsData.length) % reviewsData.length;
  updateSliderPosition();
});

document.querySelector("#nextReview")?.addEventListener("click", () => {
  currentReviewIdx = (currentReviewIdx + 1) % reviewsData.length;
  updateSliderPosition();
});

// Bind Product Search Bar Events
const searchInput = document.getElementById("productSearchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");

if (searchInput) {
  searchInput.addEventListener("input", handleProductSearch);
}
if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    if (searchInput) {
      searchInput.value = "";
      handleProductSearch();
      searchInput.focus();
    }
  });
}

// Initial translations run
applyTranslations(currentLanguage);

// Fetch live products from backend database & auto-sync admin updates live
loadProductsFromAPI();

// Automatically refresh products every 4 seconds to sync live admin edits
setInterval(loadProductsFromAPI, 4000);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    loadProductsFromAPI();
  }
});

