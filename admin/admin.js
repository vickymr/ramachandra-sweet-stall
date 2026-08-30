// ─── Auth Guard ───────────────────────────────────────────────────────────────
const token = localStorage.getItem('adminToken');
if (!token) { window.location.href = '/admin/login'; }

const USERNAME = localStorage.getItem('adminUsername') || 'admin';
document.getElementById('adminUsernameDisplay').textContent = USERNAME;

// ─── State ────────────────────────────────────────────────────────────────────
let allProducts = [];
let allOrders = [];
let currentFilter = 'all';
let adminLang = 'en';
let editingProductId = null;
let pendingDeleteId = null;
let pendingDeleteType = null; // 'product' | 'order'

// ─── API Helper ───────────────────────────────────────────────────────────────
async function api(method, url, body = null) {
  const cacheBustUrl = method === 'GET' ? (url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`) : url;
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    cache: 'no-store'
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(cacheBustUrl, opts);
  if (res.status === 401) { localStorage.clear(); window.location.href = '/admin/login'; }
  return res;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.classList.remove('show'); }, 3000);
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.remove('hidden');
  document.getElementById(`nav-${name}`)?.classList.add('active');
  document.getElementById('topbarTitle').textContent = name.charAt(0).toUpperCase() + name.slice(1);
  closeSidebar();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); showSection(item.dataset.section); });
});

// Mobile sidebar
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
document.getElementById('menuToggleBtn').addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
});
overlay.addEventListener('click', closeSidebar);
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
}

// ─── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/admin/login';
});

// ─── Admin Language Toggle ────────────────────────────────────────────────────
function setAdminLang(lang) {
  adminLang = lang;
  document.getElementById('btnLangEn').classList.toggle('active', lang === 'en');
  document.getElementById('btnLangTa').classList.toggle('active', lang === 'ta');
  renderProducts();
}

// ─── Load All Data ────────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadProducts(), loadOrders()]);
  updateDashboardStats();
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
async function loadProducts() {
  const res = await api('GET', '/api/products/admin');
  allProducts = await res.json();
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  let products = allProducts;
  if (currentFilter === 'giftbox') {
    products = products.filter(p => p.category_slug === 'sweets' && p.in_giftbox !== 0);
  } else if (currentFilter !== 'all') {
    products = products.filter(p => p.category_slug === currentFilter);
  }
  if (!products.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-box-open"></i><p>No products found.</p></div>`;
    return;
  }
  grid.innerHTML = products.map(p => {
    const name = adminLang === 'ta' ? (p.name_ta || p.name_en) : p.name_en;
    const nameSub = adminLang === 'ta' ? p.name_en : (p.name_ta || '');
    const desc = adminLang === 'ta' ? (p.desc_ta || p.desc_en || '') : (p.desc_en || '');
    const sizes = p.sizes || [];
    const sizesHtml = sizes.map(s => `<span class="size-chip">${s.size_name} — ₹${s.price}</span>`).join('');
    const isActive = p.is_active === 1;
    const isSweet = p.category_slug === 'sweets';
    const inGiftbox = p.in_giftbox !== 0;

    return `
      <div class="product-card ${isActive ? '' : 'inactive'}" data-id="${p.id}">
        <div class="product-img-wrap">
          <img src="/${p.image || 'assets/no-image.svg'}" alt="${name}" onerror="this.src='/assets/no-image.svg'">
          <span class="product-cat-badge">${p.category_name || p.category_slug}</span>
          ${isSweet ? `
            <span class="product-status-badge ${inGiftbox ? 'badge-giftbox-on' : 'badge-giftbox-off'}" style="right:auto; left:8px; background:${inGiftbox ? '#7c3aed' : '#6b7280'};" title="Assorted Gift Box Inclusion">
              <i class="fa-solid fa-gift"></i> ${inGiftbox ? 'Gift Box' : 'No Gift Box'}
            </span>
          ` : ''}
          <span class="product-status-badge ${isActive ? 'badge-active' : 'badge-inactive'}">${isActive ? 'Active' : 'Hidden'}</span>
        </div>
        <div class="product-body">
          <div class="product-name">${name}</div>
          ${nameSub ? `<div class="product-name-ta">${nameSub}</div>` : ''}
          <div class="product-desc">${desc || 'No description'}</div>
          <div class="product-sizes">${sizesHtml || '<span style="font-size:0.75rem;color:#9a8070">No sizes added</span>'}</div>
        </div>
        <div class="product-actions">
          <button class="btn-icon" onclick="openEditProduct(${p.id})"><i class="fa-solid fa-pen"></i> Edit</button>
          ${isSweet ? `
            <button class="btn-icon ${inGiftbox ? 'btn-toggle-on' : 'btn-toggle-off'}" onclick="toggleGiftbox(${p.id})" title="${inGiftbox ? 'Remove from Assorted Gift Box' : 'Add to Assorted Gift Box'}">
              <i class="fa-solid fa-gift"></i> ${inGiftbox ? 'Remove Giftbox' : '+ Add Giftbox'}
            </button>
          ` : ''}
          <button class="btn-icon ${isActive ? 'btn-toggle-on' : 'btn-toggle-off'}" onclick="toggleProduct(${p.id})">
            <i class="fa-solid fa-${isActive ? 'eye' : 'eye-slash'}"></i> ${isActive ? 'Hide' : 'Show'}
          </button>
          <button class="btn-icon btn-delete" onclick="confirmDelete('product', ${p.id}, '${name.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`;
  }).join('');
}

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderProducts();
  });
});

// ─── Toggle Product Visibility ────────────────────────────────────────────────
async function toggleProduct(id) {
  const res = await api('PATCH', `/api/products/admin/${id}/toggle`);
  if (res.ok) {
    const data = await res.json();
    const product = allProducts.find(p => p.id === id);
    if (product) product.is_active = data.is_active;
    renderProducts();
    updateDashboardStats();
    toast(data.is_active ? 'Product is now visible to customers.' : 'Product hidden from customers.', data.is_active ? 'success' : 'info');
  } else { toast('Failed to update product.', 'error'); }
}

// ─── Toggle Giftbox Inclusion ──────────────────────────────────────────────────
async function toggleGiftbox(id) {
  const res = await api('PATCH', `/api/products/admin/${id}/giftbox`);
  if (res.ok) {
    const data = await res.json();
    const product = allProducts.find(p => p.id === id);
    if (product) product.in_giftbox = data.in_giftbox;
    renderProducts();
    toast(data.in_giftbox ? 'Sweet added to Build Your Assorted Gift Box!' : 'Sweet removed from Build Your Assorted Gift Box.', data.in_giftbox ? 'success' : 'info');
  } else { toast('Failed to update gift box status.', 'error'); }
}

// ─── Add Product Modal ────────────────────────────────────────────────────────
document.getElementById('addProductBtn').addEventListener('click', openAddProduct);

async function openAddProduct() {
  editingProductId = null;
  document.getElementById('modalTitle').textContent = 'Add New Product';
  document.getElementById('modalSaveBtn').innerHTML = '<i class="fa-solid fa-plus"></i> Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('fActive').checked = true;
  document.getElementById('fInGiftbox').checked = true;
  document.getElementById('sizesContainer').innerHTML = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('imageUploadPrompt').style.display = '';
  await loadCategoryDropdown();
  document.getElementById('productModal').classList.remove('hidden');
}

async function openEditProduct(id) {
  editingProductId = id;
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  document.getElementById('modalTitle').textContent = 'Edit Product';
  document.getElementById('modalSaveBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
  document.getElementById('productId').value = id;
  document.getElementById('fNameEn').value = product.name_en || '';
  document.getElementById('fNameTa').value = product.name_ta || '';
  document.getElementById('fDescEn').value = product.desc_en || '';
  document.getElementById('fDescTa').value = product.desc_ta || '';
  document.getElementById('fKey').value = product.key || '';
  document.getElementById('fActive').checked = product.is_active === 1;
  document.getElementById('fInGiftbox').checked = product.in_giftbox !== 0;

  // Image preview
  const preview = document.getElementById('imagePreview');
  const prompt = document.getElementById('imageUploadPrompt');
  if (product.image) {
    preview.src = '/' + product.image;
    preview.style.display = 'block';
    prompt.style.display = 'none';
  } else {
    preview.style.display = 'none';
    prompt.style.display = '';
  }

  await loadCategoryDropdown(product.category_id);

  // Load sizes
  const sizesContainer = document.getElementById('sizesContainer');
  sizesContainer.innerHTML = '';
  (product.sizes || []).forEach(s => addSizeRow(s.size_name, s.size_name_ta, s.price, s.id));

  document.getElementById('productModal').classList.remove('hidden');
}

async function loadCategoryDropdown(selectedId = null) {
  const res = await fetch('/api/products/categories');
  const cats = await res.json();
  const sel = document.getElementById('fCategory');
  sel.innerHTML = '<option value="">Select category</option>' +
    cats.map(c => `<option value="${c.id}" ${selectedId == c.id ? 'selected' : ''}>${c.name_en}</option>`).join('');
}

// ─── Image Upload ─────────────────────────────────────────────────────────────
document.getElementById('imageUploadArea').addEventListener('click', () => {
  document.getElementById('fImage').click();
});
document.getElementById('fImage').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('imagePreview');
  const prompt = document.getElementById('imageUploadPrompt');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
  prompt.style.display = 'none';
});

// ─── Custom Sizes ─────────────────────────────────────────────────────────────
document.getElementById('addSizeBtn').addEventListener('click', () => addSizeRow());

function addSizeRow(name = '', nameTa = '', price = '', sizeId = null) {
  const container = document.getElementById('sizesContainer');
  const row = document.createElement('div');
  row.className = 'size-row';
  if (sizeId) row.dataset.sizeId = sizeId;
  row.innerHTML = `
    <input type="text" class="form-input size-name" placeholder="Size (e.g. 250 g)" value="${name}" style="max-width:140px">
    <input type="text" class="form-input size-name-ta" placeholder="Tamil (e.g. 250 கிராம்)" value="${nameTa}" style="max-width:150px">
    <input type="number" class="form-input size-price" placeholder="₹ Price" value="${price}" min="0" style="max-width:100px">
    <button type="button" class="btn-remove-size" title="Remove"><i class="fa-solid fa-xmark"></i></button>
  `;
  row.querySelector('.btn-remove-size').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

// ─── Save Product (Add / Edit) ────────────────────────────────────────────────
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('modalSaveBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  const id = document.getElementById('productId').value;
  const body = {
    key: document.getElementById('fKey').value.trim(),
    category_id: parseInt(document.getElementById('fCategory').value),
    name_en: document.getElementById('fNameEn').value.trim(),
    name_ta: document.getElementById('fNameTa').value.trim(),
    desc_en: document.getElementById('fDescEn').value.trim(),
    desc_ta: document.getElementById('fDescTa').value.trim(),
    is_active: document.getElementById('fActive').checked ? 1 : 0,
    in_giftbox: document.getElementById('fInGiftbox').checked ? 1 : 0,
  };

  // Collect sizes
  const sizeRows = document.querySelectorAll('#sizesContainer .size-row');
  const sizes = [];
  sizeRows.forEach(row => {
    const sn = row.querySelector('.size-name').value.trim();
    const st = row.querySelector('.size-name-ta').value.trim();
    const sp = parseInt(row.querySelector('.size-price').value);
    if (sn && !isNaN(sp)) sizes.push({ size_name: sn, size_name_ta: st || sn, price: sp, id: row.dataset.sizeId || null });
  });
  body.sizes = sizes;

  let res;
  let savedId = id ? parseInt(id) : null;

  if (id) {
    // Update product details
    res = await api('PUT', `/api/products/admin/${id}`, body);
    if (res.ok) {
      // Sync sizes: delete all old sizes then re-add
      const product = allProducts.find(p => p.id === parseInt(id));
      if (product && product.sizes) {
        for (const s of product.sizes) {
          await api('DELETE', `/api/products/admin/sizes/${s.id}`);
        }
      }
      for (const s of sizes) {
        await api('POST', `/api/products/admin/${id}/sizes`, { size_name: s.size_name, size_name_ta: s.size_name_ta, price: s.price, sort_order: sizes.indexOf(s) });
      }
    }
  } else {
    res = await api('POST', '/api/products/admin', body);
    if (res.ok) {
      const data = await res.json();
      savedId = data?.product?.id || null;
    }
  }

  // Upload image if selected
  const imageFile = document.getElementById('fImage').files[0];
  let imageUploadSuccess = true;
  let imageErrorMessage = '';

  if (imageFile && res.ok && savedId) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const imgRes = await fetch(`/api/products/admin/${savedId}/image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!imgRes.ok) {
      imageUploadSuccess = false;
      const imgErr = await imgRes.json().catch(() => ({}));
      imageErrorMessage = imgErr.error || 'Image upload failed';
    }
  }

  btn.disabled = false;
  if (res.ok && imageUploadSuccess) {
    closeProductModal();
    await loadProducts();
    updateDashboardStats();
    toast(id ? 'Product updated successfully!' : 'Product added successfully!');
  } else {
    const err = res.ok ? { error: imageErrorMessage } : await res.json().catch(() => ({}));
    toast(err.error || 'Failed to save product.', 'error');
    btn.innerHTML = id ? '<i class="fa-solid fa-floppy-disk"></i> Save Changes' : '<i class="fa-solid fa-plus"></i> Add Product';
  }
});

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  document.getElementById('productForm').reset();
  document.getElementById('sizesContainer').innerHTML = '';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('imageUploadPrompt').style.display = '';
  editingProductId = null;
}
document.getElementById('modalClose').addEventListener('click', closeProductModal);
document.getElementById('modalCancelBtn').addEventListener('click', closeProductModal);
document.getElementById('productModal').addEventListener('click', e => {
  if (e.target === document.getElementById('productModal')) closeProductModal();
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────
async function loadOrders() {
  const res = await api('GET', '/api/orders/admin');
  allOrders = await res.json();
  renderOrders();
  updatePendingBadge();
}

function getOrderYMD(createdAtStr) {
  if (!createdAtStr) return '';
  const d = new Date(createdAtStr);
  if (isNaN(d.getTime())) {
    return String(createdAtStr).slice(0, 10);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateFriendly(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getFilteredOrders() {
  const statusVal = document.getElementById('orderStatusFilter')?.value || 'all';
  const dateVal = document.getElementById('orderDateFilter')?.value || '';

  let orders = allOrders;

  if (statusVal !== 'all') {
    orders = orders.filter(o => o.status === statusVal);
  }

  if (dateVal) {
    orders = orders.filter(o => {
      const ymd = getOrderYMD(o.created_at);
      const rawSlice = o.created_at ? String(o.created_at).slice(0, 10) : '';
      return ymd === dateVal || rawSlice === dateVal;
    });
  }

  return orders;
}

function renderOrders() {
  const dateVal = document.getElementById('orderDateFilter')?.value || '';
  const clearBtn = document.getElementById('clearDateBtn');
  if (clearBtn) {
    clearBtn.style.display = dateVal ? 'inline-flex' : 'none';
  }

  const orders = getFilteredOrders();
  const wrap = document.getElementById('ordersTableWrap');

  if (!orders.length) {
    const emptyMsg = dateVal 
      ? `No orders found for ${formatDateFriendly(dateVal)}.` 
      : `No orders found.`;
    wrap.innerHTML = `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>${emptyMsg}</p></div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Customer</th>
          <th>Phone</th>
          <th>Items Ordered</th>
          <th>Delivery Address</th>
          <th>Date & Slot</th>
          <th>Total</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => {
          const items = Array.isArray(o.items) ? o.items : [];
          const itemsSummary = items.map(i => `${i.name || i.nameEn || ''} (${i.size || ''}) x${i.quantity || 1}`).join(', ');
          return `
          <tr>
            <td><strong>${o.order_id}</strong><br><small style="color:#9a8070">${new Date(o.created_at).toLocaleDateString('en-IN')}</small></td>
            <td><strong>${o.customer_name}</strong></td>
            <td>
              <a class="wa-link" href="https://wa.me/91${o.phone_number}" target="_blank">
                <i class="fa-brands fa-whatsapp"></i>${o.phone_number}
              </a>
            </td>
            <td><div class="order-items-preview" title="${itemsSummary}">${itemsSummary || '—'}</div></td>
            <td style="max-width:180px;font-size:0.8rem">${o.delivery_address}</td>
            <td style="font-size:0.8rem">${o.delivery_date || '—'}<br>${o.time_slot || '—'}</td>
            <td><strong style="color:#F37021">₹${o.total_price}</strong></td>
            <td>
              <select class="filter-select" style="font-size:0.75rem;padding:5px 8px" onchange="updateOrderStatus(${o.id}, this.value)">
                ${['Pending','Confirmed','Delivered','Cancelled'].map(s =>
                  `<option ${o.status===s?'selected':''} value="${s}">${s}</option>`
                ).join('')}
              </select>
            </td>
            <td>
              <button class="btn-icon" onclick="viewOrderDetail(${o.id})" style="justify-content:center">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="btn-icon btn-delete" onclick="confirmDelete('order', ${o.id}, '${o.order_id}')" style="justify-content:center; margin-top:6px">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// Order Filter & Export Listeners
document.getElementById('orderStatusFilter')?.addEventListener('change', () => renderOrders());
document.getElementById('orderDateFilter')?.addEventListener('change', () => renderOrders());
document.getElementById('clearDateBtn')?.addEventListener('click', () => {
  const dateInput = document.getElementById('orderDateFilter');
  if (dateInput) dateInput.value = '';
  renderOrders();
});
document.getElementById('exportOrdersPdfBtn')?.addEventListener('click', exportOrdersPdf);

function exportOrdersPdf() {
  const orders = getFilteredOrders();
  if (!orders.length) {
    toast('No orders available to export for the current selection.', 'error');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    toast('PDF library is loading. Please try again in a moment.', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const dateVal = document.getElementById('orderDateFilter')?.value || '';
  const statusVal = document.getElementById('orderStatusFilter')?.value || 'all';

  const brandSaffron = [243, 112, 33];
  const charcoal = [45, 26, 0];

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(brandSaffron[0], brandSaffron[1], brandSaffron[2]);
  doc.text("Sri Ramachandra Sweets & Bakery", 14, 16);

  // Sub-title
  doc.setFontSize(12);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  const titleText = dateVal 
    ? `Orders Report – ${formatDateFriendly(dateVal)}` 
    : "Orders Report – All Dates";
  doc.text(titleText, 14, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 90, 75);
  const filterDetails = [];
  if (statusVal !== 'all') filterDetails.push(`Status: ${statusVal}`);
  filterDetails.push(`Generated: ${new Date().toLocaleString('en-IN')}`);
  doc.text(filterDetails.join('  |  '), 14, 29);

  // Prepare table rows for autotable
  const tableData = orders.map(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    const itemsStr = items.map(i => `${i.name || i.nameEn || ''} (${i.size || ''}) x${i.quantity || 1}`).join(', ');
    const orderDateStr = new Date(o.created_at).toLocaleDateString('en-IN');
    return [
      o.order_id,
      o.customer_name,
      `+91 ${o.phone_number}`,
      orderDateStr,
      itemsStr || '—',
      `Rs. ${o.total_price}`,
      o.status
    ];
  });

  const totalAmount = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);

  doc.autoTable({
    startY: 33,
    head: [['Order ID', 'Customer Name', 'Contact', 'Order Date', 'Ordered Items', 'Total Amount', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: brandSaffron,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: 'middle',
      font: 'helvetica',
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 26 },
      3: { cellWidth: 22 },
      4: { cellWidth: 46 },
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'center' }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const totalPages = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${data.pageNumber} of ${totalPages}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
    }
  });

  // Summary box at bottom
  let finalY = doc.lastAutoTable.finalY + 6;
  if (finalY + 16 > doc.internal.pageSize.height - 15) {
    doc.addPage();
    finalY = 20;
  }

  // Draw background box for totals
  doc.setFillColor(253, 247, 240);
  doc.roundedRect(14, finalY, 182, 14, 3, 3, 'F');
  doc.setDrawColor(243, 112, 33);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, finalY, 182, 14, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text(`Total Orders: ${orders.length}`, 20, finalY + 9);

  doc.setTextColor(brandSaffron[0], brandSaffron[1], brandSaffron[2]);
  doc.text(`Total Order Amount: Rs. ${totalAmount}`, 135, finalY + 9);

  // Save PDF
  const filename = dateVal 
    ? `Orders-Report-${dateVal}.pdf` 
    : `Orders-Report-All-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  toast(`PDF report downloaded successfully!`);
}

async function updateOrderStatus(id, status) {
  const res = await api('PATCH', `/api/orders/admin/${id}/status`, { status });
  if (res.ok) {
    const order = allOrders.find(o => o.id === id);
    if (order) order.status = status;
    updateDashboardStats();
    updatePendingBadge();
    toast(`Order status updated to ${status}.`);
  } else { toast('Failed to update status.', 'error'); }
}

function viewOrderDetail(id) {
  const o = allOrders.find(o => o.id === id);
  if (!o) return;
  const items = Array.isArray(o.items) ? o.items : [];
  document.getElementById('orderModalTitle').textContent = `Order — ${o.order_id}`;
  document.getElementById('orderModalBody').innerHTML = `
    <div class="order-detail-grid">
      <div class="order-detail-item"><label>Order ID</label><p>${o.order_id}</p></div>
      <div class="order-detail-item"><label>Date & Time</label><p>${new Date(o.created_at).toLocaleString('en-IN')}</p></div>
      <div class="order-detail-item"><label>Customer Name</label><p>${o.customer_name}</p></div>
      <div class="order-detail-item"><label>Phone</label>
        <p><a class="wa-link" href="https://wa.me/91${o.phone_number}" target="_blank"><i class="fa-brands fa-whatsapp"></i> ${o.phone_number}</a></p>
      </div>
      <div class="order-detail-item" style="grid-column:1/-1"><label>Delivery Address</label><p>${o.delivery_address}</p></div>
      <div class="order-detail-item"><label>Delivery Date</label><p>${o.delivery_date || '—'}</p></div>
      <div class="order-detail-item"><label>Time Slot</label><p>${o.time_slot || '—'}</p></div>
      <div class="order-detail-item"><label>Payment</label><p>${o.payment_method}</p></div>
      <div class="order-detail-item"><label>Status</label><p><span class="status-chip status-${o.status}">${o.status}</span></p></div>
    </div>
    <div class="order-items-list">
      <h4>Ordered Items</h4>
      ${items.map(item => `
        <div class="order-item-row">
          <span>${item.nameEn || item.name} ${item.size ? `(${item.size})` : ''}</span>
          <span>Qty: ${item.quantity || 1} × ₹${item.priceVal || item.price || 0} = <strong>₹${(item.quantity || 1) * (item.priceVal || item.price || 0)}</strong></span>
        </div>`).join('') || '<p style="color:#9a8070;font-size:0.84rem">No item details</p>'}
      <div class="order-total"><span>Total Amount</span><span>₹${o.total_price}</span></div>
    </div>`;
  document.getElementById('orderModal').classList.remove('hidden');
}

document.getElementById('orderModalClose').addEventListener('click', () => document.getElementById('orderModal').classList.add('hidden'));
document.getElementById('orderModal').addEventListener('click', e => {
  if (e.target === document.getElementById('orderModal')) document.getElementById('orderModal').classList.add('hidden');
});

function updatePendingBadge() {
  const pending = allOrders.filter(o => o.status === 'Pending').length;
  const badge = document.getElementById('pendingBadge');
  badge.style.display = pending > 0 ? 'inline-block' : 'none';
  badge.textContent = pending;
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function confirmDelete(type, id, name) {
  pendingDeleteId = id;
  pendingDeleteType = type;
  document.getElementById('confirmText').textContent = `Are you sure you want to delete "${name}"?`;
  document.getElementById('confirmModal').classList.remove('hidden');
}

document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirm);
document.getElementById('confirmModalClose').addEventListener('click', closeConfirm);
document.getElementById('confirmModal').addEventListener('click', e => {
  if (e.target === document.getElementById('confirmModal')) closeConfirm();
});

function closeConfirm() {
  document.getElementById('confirmModal').classList.add('hidden');
  pendingDeleteId = null;
  pendingDeleteType = null;
}

document.getElementById('confirmOkBtn').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('confirmOkBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  let res;
  if (pendingDeleteType === 'product') {
    res = await api('DELETE', `/api/products/admin/${pendingDeleteId}`);
    if (res.ok) {
      allProducts = allProducts.filter(p => p.id !== pendingDeleteId);
      renderProducts();
      updateDashboardStats();
      toast('Product deleted successfully.');
    } else { toast('Failed to delete product.', 'error'); }
  } else if (pendingDeleteType === 'order') {
    res = await api('DELETE', `/api/orders/admin/${pendingDeleteId}`);
    if (res.ok) {
      allOrders = allOrders.filter(o => o.id !== pendingDeleteId);
      renderOrders();
      updateDashboardStats();
      updatePendingBadge();
      toast('Order deleted successfully.');
    } else { toast('Failed to delete order.', 'error'); }
  }

  btn.disabled = false;
  btn.textContent = 'Yes, Delete';
  closeConfirm();
});

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
function updateDashboardStats() {
  document.getElementById('statTotalProducts').textContent = allProducts.length;
  document.getElementById('statActiveProducts').textContent = allProducts.filter(p => p.is_active).length;
  document.getElementById('statTotalOrders').textContent = allOrders.length;
  const pending = allOrders.filter(o => o.status === 'Pending').length;
  document.getElementById('statPendingOrders').textContent = pending;

  // Recent orders table (last 5)
  const recent = [...allOrders].slice(0, 5);
  const wrap = document.getElementById('recentOrdersTable');
  if (!recent.length) {
    wrap.innerHTML = `<div class="empty-state" style="padding:30px"><i class="fa-solid fa-inbox"></i><p>No orders yet.</p></div>`;
    return;
  }
  wrap.innerHTML = `<table>
    <thead><tr><th>Order ID</th><th>Customer</th><th>Phone</th><th>Total</th><th>Status</th></tr></thead>
    <tbody>
      ${recent.map(o => `
        <tr>
          <td><strong>${o.order_id}</strong></td>
          <td>${o.customer_name}</td>
          <td>${o.phone_number}</td>
          <td><strong style="color:#F37021">₹${o.total_price}</strong></td>
          <td><span class="status-chip status-${o.status}">${o.status}</span></td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

// ─── Save & Publish Live Changes ────────────────────────────────────────────────
async function publishChanges() {
  const btns = document.querySelectorAll('.btn-save-publish');
  btns.forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving & Publishing...';
  });

  await loadProducts();

  setTimeout(() => {
    btns.forEach(btn => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Published Live!';
      setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save & Publish Changes';
      }, 3000);
    });
    toast('🎉 All product changes saved & published live to customer website!', 'success');
  }, 400);
}

// ─── Initialize ───────────────────────────────────────────────────────────────
loadAll();

// ─── ADMIN USERS MANAGEMENT ───────────────────────────────────────────────────
async function loadAdmins() {
  const wrap = document.getElementById('adminsTableWrap');
  wrap.innerHTML = '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Loading admins...</div>';
  try {
    const res = await api('GET', '/api/auth/admins');
    const admins = await res.json();
    const myId = JSON.parse(atob(localStorage.getItem('adminToken').split('.')[1])).id;

    if (!admins.length) {
      wrap.innerHTML = '<div class="empty-state"><i class="fa-solid fa-user-slash"></i><p>No admin users found.</p></div>';
      return;
    }

    wrap.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Username</th>
            <th>Created On</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${admins.map(a => `
            <tr>
              <td>${a.id}</td>
              <td>
                <span style="display:inline-flex;align-items:center;gap:8px;">
                  <i class="fa-solid fa-user-shield" style="color:#c0922a;"></i>
                  <strong>${a.username}</strong>
                  ${a.id === myId ? '<span style="font-size:0.7rem;background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:99px;font-weight:600;">You</span>' : ''}
                </span>
              </td>
              <td>${a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '—'}</td>
              <td>
                ${a.id !== myId ? `
                  <button class="btn-danger" style="padding:6px 14px;font-size:0.8rem;" onclick="deleteAdmin(${a.id}, '${a.username}')">
                    <i class="fa-solid fa-trash"></i> Remove
                  </button>
                ` : '<span style="color:#aaa;font-size:0.82rem;">Cannot remove yourself</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load admins.</p></div>`;
  }
}

async function deleteAdmin(id, username) {
  if (!confirm(`Remove admin "${username}"? They will no longer be able to log in.`)) return;
  try {
    const res = await api('DELETE', `/api/auth/admins/${id}`);
    const data = await res.json();
    if (!res.ok) { toast('❌ ' + (data.error || 'Failed to remove admin.'), 'error'); return; }
    toast(`✅ Admin "${username}" removed successfully.`, 'success');
    loadAdmins();
  } catch (e) {
    toast('❌ Network error. Please try again.', 'error');
  }
}

// Wire up Add Admin button
document.getElementById('addAdminBtn').addEventListener('click', () => {
  document.getElementById('addAdminForm').style.display = 'block';
  document.getElementById('newAdminUsername').focus();
});

document.getElementById('cancelAddAdminBtn').addEventListener('click', () => {
  document.getElementById('addAdminForm').style.display = 'none';
  document.getElementById('newAdminUsername').value = '';
  document.getElementById('newAdminPassword').value = '';
});

document.getElementById('saveAdminBtn').addEventListener('click', async () => {
  const username = document.getElementById('newAdminUsername').value.trim();
  const password = document.getElementById('newAdminPassword').value;
  if (!username || !password) { toast('❌ Please fill in both username and password.', 'error'); return; }

  const btn = document.getElementById('saveAdminBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';

  try {
    const res = await api('POST', '/api/auth/admins', { username, password });
    const data = await res.json();
    if (!res.ok) {
      toast('❌ ' + (data.error || 'Failed to create admin.'), 'error');
    } else {
      toast(`✅ Admin "${username}" created! They can now log in.`, 'success');
      document.getElementById('addAdminForm').style.display = 'none';
      document.getElementById('newAdminUsername').value = '';
      document.getElementById('newAdminPassword').value = '';
      loadAdmins();
    }
  } catch (e) {
    toast('❌ Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Create Admin';
  }
});

// Load admins when section is clicked
document.getElementById('nav-admins').addEventListener('click', loadAdmins);
