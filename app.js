// ===== ARTHOLST — Telegram Mini App =====
// Главный файл приложения

// --- Глобальные переменные ---
let config = null;
let cart = [];
let appliedPromo = null;
let currentPage = 'home';
let checkoutStep = 1;
let bannerIndex = 0;
let bannerInterval = null;
let touchStartX = 0;
let touchEndX = 0;

// Данные заказа
let orderData = {
  contact: { name: '', phone: '' },
  delivery: { method: '', address: {}, outsideMkad: false },
};

// Telegram WebApp
const tg = window.Telegram?.WebApp;

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', async () => {
  // Телеграм
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#1a1a1a');
    tg.setBackgroundColor('#0a0a0a');
  }

  // Загрузка конфига
  try {
    const res = await fetch('config.json');
    config = await res.json();
  } catch (e) {
    console.error('Ошибка загрузки config.json', e);
    return;
  }

  // Загрузка корзины из localStorage
  loadCart();

  // Рендер главной
  renderBanners();
  renderAdvantages();
  renderCatalog();
  renderFooter();
  updateCartBadge();

  // Запуск автопрокрутки баннеров
  startBannerAutoplay();
});

// ===== НАВИГАЦИЯ =====
function navigateTo(page) {
  haptic();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  currentPage = page;
  window.scrollTo(0, 0);

  if (page === 'cart') renderCart();
  if (page === 'checkout') {
    checkoutStep = 1;
    renderCheckout();
  }
}

// ===== HAPTIC FEEDBACK =====
function haptic(type) {
  try {
    tg?.HapticFeedback?.impactOccurred(type || 'medium');
  } catch (e) {}
}

// ===== ТОСТ =====
function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== БАННЕРЫ =====
function renderBanners() {
  const track = document.getElementById('banner-track');
  const dots = document.getElementById('banner-dots');
  if (!config.banners.length) return;

  track.innerHTML = config.banners.map((b, i) => `
    <div class="banner-slide" style="background:${b.gradient}" onclick="openBannerModal(${i})">
      <div class="banner-icon">${b.icon}</div>
      <div class="banner-title">${b.title}</div>
      <div class="banner-subtitle">${b.subtitle}</div>
    </div>
  `).join('');

  dots.innerHTML = config.banners.map((_, i) => `
    <div class="banner-dot${i === 0 ? ' active' : ''}" onclick="goToBanner(${i})"></div>
  `).join('');

  // Свайп
  const slider = document.getElementById('banner-slider');
  slider.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  slider.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToBanner(bannerIndex + 1);
      else goToBanner(bannerIndex - 1);
    }
  }, { passive: true });
}

function goToBanner(index) {
  const total = config.banners.length;
  bannerIndex = ((index % total) + total) % total;
  document.getElementById('banner-track').style.transform = `translateX(-${bannerIndex * 100}%)`;
  document.querySelectorAll('.banner-dot').forEach((d, i) => {
    d.classList.toggle('active', i === bannerIndex);
  });
  restartBannerAutoplay();
}

function startBannerAutoplay() {
  bannerInterval = setInterval(() => goToBanner(bannerIndex + 1), 4000);
}

function restartBannerAutoplay() {
  clearInterval(bannerInterval);
  startBannerAutoplay();
}

function openBannerModal(i) {
  haptic('light');
  const b = config.banners[i];
  let html = `
    <div class="modal-handle"></div>
    <button class="modal-close" onclick="closeModalBtn()">✕</button>
    <div class="modal-icon">${b.icon}</div>
    <div class="modal-title">${b.title}</div>
    <div class="modal-text">${b.full_description}</div>
  `;
  if (b.promo_code) {
    html += `
      <div class="modal-promo">
        <div class="modal-promo-label">Ваш промокод</div>
        <div class="modal-promo-code">${b.promo_code}</div>
        <button class="btn-copy-promo" onclick="copyPromo('${b.promo_code}')">📋 Скопировать</button>
      </div>
    `;
  }
  showModal(html);
}

// ===== ПРЕИМУЩЕСТВА =====
function renderAdvantages() {
  const list = document.getElementById('advantages-list');
  list.innerHTML = config.advantages.map((a, i) => `
    <div class="advantage-card" onclick="openAdvantageModal(${i})">
      <span class="advantage-icon">${a.icon}</span>
      <span class="advantage-text">${a.short}</span>
    </div>
  `).join('');
}

function openAdvantageModal(i) {
  haptic('light');
  const a = config.advantages[i];
  const html = `
    <div class="modal-handle"></div>
    <button class="modal-close" onclick="closeModalBtn()">✕</button>
    <div class="modal-icon">${a.icon}</div>
    <div class="modal-title">${a.title}</div>
    <div class="modal-text">${a.full_description}</div>
  `;
  showModal(html);
}

// ===== КАТАЛОГ =====
function renderCatalog() {
  const grid = document.getElementById('catalog-grid');
  grid.innerHTML = config.sizes.map((s, i) => {
    let badge = '';
    if (s.hit) badge = '<span class="size-badge hit">🔥 ХИТ</span>';
    else if (s.popular) badge = '<span class="size-badge popular">⭐ ПОПУЛЯРНЫЙ</span>';

    return `
      <div class="size-card" style="animation: fadeInUp 0.4s ease ${i * 0.05}s both">
        ${badge}
        <button class="size-info-btn" onclick="event.stopPropagation();showSizeInfo(${i})">ℹ️</button>
        <div class="size-svg">${canvasSVG(s.width, s.height)}</div>
        <div class="size-dimensions">${s.width}×${s.height} см</div>
        <div class="size-price">${s.price} BYN</div>
        <button class="btn-add-cart" id="btn-add-${i}" onclick="event.stopPropagation();addToCart(${i})">
          + В корзину
        </button>
      </div>
    `;
  }).join('');
}

// SVG-иконка холста с пропорциями
function canvasSVG(w, h, size) {
  size = size || 70;
  const maxDim = Math.max(w, h);
  const sw = (w / maxDim) * (size * 0.65);
  const sh = (h / maxDim) * (size * 0.65);
  const x = (size - sw) / 2;
  const y = (size - sh) / 2;
  const depth = 4;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
    <!-- Тень -->
    <rect x="${x + 3}" y="${y + 3}" width="${sw}" height="${sh}" rx="2" fill="rgba(0,0,0,0.3)"/>
    <!-- Торец подрамника -->
    <rect x="${x + depth}" y="${y + depth}" width="${sw}" height="${sh}" rx="1.5" fill="#1a1a1a" stroke="#555" stroke-width="0.5"/>
    <!-- Холст (фронт) -->
    <rect x="${x}" y="${y}" width="${sw}" height="${sh}" rx="2" fill="#3a3a3a" stroke="url(#svg-grad-main)" stroke-width="1.8"/>
    <!-- Текстура холста -->
    <line x1="${x + 4}" y1="${y + sh * 0.3}" x2="${x + sw - 4}" y2="${y + sh * 0.3}" stroke="#444" stroke-width="0.3"/>
    <line x1="${x + 4}" y1="${y + sh * 0.6}" x2="${x + sw - 4}" y2="${y + sh * 0.6}" stroke="#444" stroke-width="0.3"/>
    <line x1="${x + sw * 0.35}" y1="${y + 4}" x2="${x + sw * 0.35}" y2="${y + sh - 4}" stroke="#444" stroke-width="0.3"/>
    <line x1="${x + sw * 0.65}" y1="${y + 4}" x2="${x + sw * 0.65}" y2="${y + sh - 4}" stroke="#444" stroke-width="0.3"/>
    <!-- Иконка горы/пейзаж -->
    <polygon points="${x + sw * 0.2},${y + sh * 0.75} ${x + sw * 0.45},${y + sh * 0.35} ${x + sw * 0.65},${y + sh * 0.55} ${x + sw * 0.8},${y + sh * 0.4} ${x + sw * 0.95},${y + sh * 0.75}" fill="url(#svg-grad-main)" opacity="0.25"/>
  </svg>`;
}

function showSizeInfo(i) {
  haptic('light');
  const s = config.sizes[i];
  const html = `
    <div class="modal-handle"></div>
    <button class="modal-close" onclick="closeModalBtn()">✕</button>
    <div class="modal-icon">🖼</div>
    <div class="modal-title">${s.width}×${s.height} см</div>
    <div class="modal-text">
💰 Цена картины: <b>${s.price} BYN</b>

🎁 Подарочная упаковка: <b>${s.packaging_price} BYN</b>

📮 Доставка Белпочтой: <b>${s.delivery_price} BYN</b>
🚗 Курьер по Минску (в пределах МКАД): <b>${config.delivery.courier_minsk.inside_mkad} BYN</b>
🚗 Курьер за МКАД (до 5 км): <b>${config.delivery.courier_minsk.outside_mkad} BYN</b>
📍 Самовывоз: <b>Бесплатно</b>

✨ При заказе от ${config.delivery.free_from} BYN — доставка бесплатно!</div>
  `;
  showModal(html);
}

// ===== FOOTER =====
function renderFooter() {
  const info = config.shop_info;
  document.getElementById('footer-instagram').textContent = info.instagram;
  document.getElementById('footer-since').textContent = 'Работаем с ' + info.since_year + ' года';
  document.getElementById('footer-clients').textContent = info.happy_clients.toLocaleString('ru') + '+ довольных клиентов';
}

// ===== МОДАЛЬНОЕ ОКНО =====
function showModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  content.innerHTML = html;
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e.target === e.currentTarget) closeModalBtn();
}

function closeModalBtn() {
  document.getElementById('modal-overlay').classList.remove('show');
  document.body.style.overflow = '';
}

function copyPromo(code) {
  haptic();
  navigator.clipboard?.writeText(code).then(() => {
    showToast('✅ Промокод скопирован!');
  }).catch(() => {
    showToast('Промокод: ' + code);
  });
}

// ===== КОРЗИНА =====
function addToCart(sizeIndex) {
  haptic();
  cart.push({
    sizeIndex,
    packaging: false,
    comment: ''
  });
  saveCart();
  updateCartBadge();

  // Анимация кнопки
  const btn = document.getElementById('btn-add-' + sizeIndex);
  if (btn) {
    btn.classList.add('added');
    btn.textContent = '✓ Добавлено';
    // Ripple
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = '20px';
    ripple.style.left = '50%';
    ripple.style.top = '50%';
    btn.appendChild(ripple);
    setTimeout(() => {
      btn.classList.remove('added');
      btn.textContent = '+ В корзину';
      ripple.remove();
    }, 1200);
  }

  showToast('🛒 Добавлено в корзину');
}

function removeFromCart(index) {
  haptic('light');
  cart.splice(index, 1);
  saveCart();
  renderCart();
  updateCartBadge();
}

function clearCart() {
  if (cart.length === 0) return;
  haptic();
  cart = [];
  appliedPromo = null;
  saveCart();
  renderCart();
  updateCartBadge();
}

function togglePackaging(index) {
  haptic('light');
  cart[index].packaging = !cart[index].packaging;
  saveCart();
  renderCart();
}

function updateComment(index, text) {
  cart[index].comment = text;
  saveCart();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  badge.textContent = cart.length;
  badge.classList.toggle('show', cart.length > 0);
}

function saveCart() {
  try {
    localStorage.setItem('artholst_cart', JSON.stringify(cart));
    if (appliedPromo) {
      localStorage.setItem('artholst_promo', appliedPromo);
    } else {
      localStorage.removeItem('artholst_promo');
    }
  } catch (e) {}
}

function loadCart() {
  try {
    const saved = localStorage.getItem('artholst_cart');
    if (saved) cart = JSON.parse(saved);
    const promo = localStorage.getItem('artholst_promo');
    if (promo) appliedPromo = promo;
  } catch (e) {}
}

// ===== РАСЧЁТЫ =====
function calcSubtotals() {
  let items = 0, packaging = 0;
  cart.forEach(item => {
    const s = config.sizes[item.sizeIndex];
    items += s.price;
    if (item.packaging) packaging += s.packaging_price;
  });
  return { items, packaging };
}

function calcDiscount(subtotal) {
  // Скидка 15% при 3+ картинах
  let discountPercent = 0;
  let discountSource = '';

  if (cart.length >= 3) {
    discountPercent = 15;
    discountSource = '15% за 3+ картины';
  }

  // Промокод (может быть больше или дополнительный — берём максимальную)
  if (appliedPromo && config.promo_codes[appliedPromo]) {
    const promo = config.promo_codes[appliedPromo];
    if (promo.discount_percent > discountPercent) {
      discountPercent = promo.discount_percent;
      discountSource = promo.description;
    }
  }

  // Если 3+ картин, всегда 15% (больше промокода)
  const amount = Math.round(subtotal * discountPercent / 100);
  return { percent: discountPercent, amount, source: discountSource };
}

function calcDeliveryPost() {
  // Белпочта: самый дорогой полная цена, остальные 50%
  if (cart.length === 0) return 0;
  const prices = cart.map(item => config.sizes[item.sizeIndex].delivery_price).sort((a, b) => b - a);
  let total = prices[0]; // Максимальная — полная
  for (let i = 1; i < prices.length; i++) {
    total += Math.round(prices[i] * 0.5);
  }
  return total;
}

function calcDeliveryCost(method, outsideMkad) {
  const { items, packaging } = calcSubtotals();
  const subtotal = items + packaging;

  // Бесплатная доставка от free_from
  if (subtotal >= config.delivery.free_from && method !== 'pickup') return 0;

  if (method === 'pickup') return 0;
  if (method === 'courier') {
    return outsideMkad ? config.delivery.courier_minsk.outside_mkad : config.delivery.courier_minsk.inside_mkad;
  }
  if (method === 'post') {
    return calcDeliveryPost();
  }
  return 0;
}

function calcTotal(deliveryMethod, outsideMkad) {
  const { items, packaging } = calcSubtotals();
  const subtotal = items + packaging;
  const discount = calcDiscount(items);
  const delivery = calcDeliveryCost(deliveryMethod || '', outsideMkad || false);
  const total = subtotal - discount.amount + delivery;
  return { items, packaging, discount, delivery, total };
}

// ===== РЕНДЕР КОРЗИНЫ =====
function renderCart() {
  const content = document.getElementById('cart-content');
  const summary = document.getElementById('cart-summary');

  if (cart.length === 0) {
    content.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <div class="cart-empty-text">Корзина пуста</div>
        <p style="color:#666;font-size:14px;margin-bottom:24px">Добавьте картины из каталога</p>
        <button class="btn-add-more" onclick="navigateTo('home')">← На главную</button>
      </div>
    `;
    summary.style.display = 'none';
    return;
  }

  let html = '';
  cart.forEach((item, i) => {
    const s = config.sizes[item.sizeIndex];
    html += `
      <div class="cart-item">
        <div class="cart-item-top">
          <div class="cart-item-svg">${canvasSVG(s.width, s.height, 56)}</div>
          <div class="cart-item-info">
            <div class="cart-item-size">${s.width}×${s.height} см</div>
            <div class="cart-item-price">${s.price} BYN</div>
          </div>
          <button class="cart-item-delete" onclick="removeFromCart(${i})">🗑</button>
        </div>
        <div class="toggle-row">
          <span class="toggle-label">🎁 Подарочная упаковка <span class="toggle-price">+${s.packaging_price} BYN</span></span>
          <div class="toggle-switch${item.packaging ? ' on' : ''}" onclick="togglePackaging(${i})"></div>
        </div>
        <div class="cart-comment">
          <textarea placeholder="Что изменить или доработать в фото?" oninput="updateComment(${i}, this.value)">${item.comment || ''}</textarea>
          <div class="cart-photo-note">📎 Фото отправьте после оформления заказа</div>
        </div>
      </div>
    `;
  });

  // Промокод
  html += `
    <div class="promo-section">
      <div class="promo-label">🏷 Промокод</div>
      <div class="promo-row">
        <input class="promo-input" id="promo-input" placeholder="Введите промокод" value="${appliedPromo || ''}">
        <button class="promo-apply" onclick="applyPromo()">Применить</button>
      </div>
      <div class="promo-msg" id="promo-msg"></div>
    </div>
  `;

  // Кнопка добавить ещё
  html += `<button class="btn-add-more" onclick="navigateTo('home')">+ Добавить ещё картину</button>`;

  content.innerHTML = html;

  // Если промокод был применён — показать сообщение
  if (appliedPromo) {
    const msg = document.getElementById('promo-msg');
    msg.textContent = '✅ Скидка применена!';
    msg.className = 'promo-msg success';
  }

  // Итоговая плашка
  const totals = calcTotal();
  let summaryHtml = `
    <div class="summary-row">
      <span>Товары (${cart.length} шт.)</span>
      <span>${totals.items} BYN</span>
    </div>
  `;
  if (totals.packaging > 0) {
    summaryHtml += `
      <div class="summary-row">
        <span>Упаковка</span>
        <span>${totals.packaging} BYN</span>
      </div>
    `;
  }
  if (totals.discount.amount > 0) {
    summaryHtml += `
      <div class="summary-row discount">
        <span>${totals.discount.source}</span>
        <span>-${totals.discount.amount} BYN</span>
      </div>
    `;
  }
  summaryHtml += `
    <div class="summary-row total">
      <span>Итого</span>
      <span class="summary-val">${totals.total} BYN</span>
    </div>
    <button class="btn-checkout" onclick="navigateTo('checkout')">Оформить заказ</button>
  `;
  summary.innerHTML = summaryHtml;
  summary.style.display = 'block';
}

// ===== ПРОМОКОД =====
function applyPromo() {
  haptic();
  const input = document.getElementById('promo-input');
  const msg = document.getElementById('promo-msg');
  const code = input.value.trim().toUpperCase();

  if (!code) {
    msg.textContent = '❌ Введите промокод';
    msg.className = 'promo-msg error';
    return;
  }

  const promo = config.promo_codes[code];
  if (!promo) {
    msg.textContent = '❌ Промокод недействителен';
    msg.className = 'promo-msg error';
    appliedPromo = null;
    saveCart();
    renderCart();
    return;
  }

  // Проверка дня недели
  const today = new Date().getDay(); // 0=вс, 1=пн, ..., 3=ср, 6=сб
  if (promo.valid_days && !promo.valid_days.includes(today)) {
    msg.textContent = '❌ Промокод действует только в среду и субботу';
    msg.className = 'promo-msg error';
    appliedPromo = null;
    saveCart();
    renderCart();
    return;
  }

  appliedPromo = code;
  saveCart();
  renderCart();
  showToast('✅ Промокод применён!');
}

// ===== ОФОРМЛЕНИЕ =====
function renderCheckout() {
  renderProgressBar();
  const content = document.getElementById('checkout-content');

  if (checkoutStep === 1) renderStep1(content);
  else if (checkoutStep === 2) renderStep2(content);
  else if (checkoutStep === 3) renderStep3(content);
}

function renderProgressBar() {
  const bar = document.getElementById('progress-bar');
  const steps = ['Контакты', 'Доставка', 'Подтверждение'];
  bar.innerHTML = steps.map((s, i) => {
    const num = i + 1;
    const circleClass = num < checkoutStep ? 'done' : (num === checkoutStep ? 'active' : '');
    const lineClass = num < checkoutStep ? 'active' : '';
    let html = `<div class="progress-step">
      <div class="progress-circle ${circleClass}">${num < checkoutStep ? '✓' : num}</div>
    </div>`;
    if (i < steps.length - 1) {
      html += `<div class="progress-line ${lineClass}"></div>`;
    }
    return html;
  }).join('');
}

function checkoutBack() {
  haptic();
  if (checkoutStep > 1) {
    checkoutStep--;
    renderCheckout();
  } else {
    navigateTo('cart');
  }
}

// --- Шаг 1: Контакты ---
function renderStep1(container) {
  container.innerHTML = `
    <div class="checkout-step active">
      <h3 style="font-size:20px;font-weight:700;margin-bottom:24px;margin-top:8px">👤 Контактные данные</h3>
      <div class="form-group">
        <label class="form-label">ФИО *</label>
        <input class="form-input" id="inp-name" placeholder="Иванов Иван Иванович" value="${orderData.contact.name}">
        <div class="form-error" id="err-name">Введите ваше имя</div>
      </div>
      <div class="form-group">
        <label class="form-label">Телефон *</label>
        <input class="form-input" id="inp-phone" placeholder="+375 (XX) XXX-XX-XX" type="tel" value="${orderData.contact.phone}" oninput="maskPhone(this)">
        <div class="form-error" id="err-phone">Введите корректный телефон</div>
      </div>
      <button class="btn-next" onclick="submitStep1()">Далее →</button>
    </div>
  `;
}

function maskPhone(input) {
  let val = input.value.replace(/\D/g, '');
  if (val.startsWith('375')) val = val.substring(3);
  else if (val.startsWith('8')) val = val.substring(1);

  let formatted = '+375';
  if (val.length > 0) formatted += ' (' + val.substring(0, 2);
  if (val.length >= 2) formatted += ') ' + val.substring(2, 5);
  if (val.length >= 5) formatted += '-' + val.substring(5, 7);
  if (val.length >= 7) formatted += '-' + val.substring(7, 9);

  input.value = formatted;
}

function submitStep1() {
  haptic();
  const name = document.getElementById('inp-name').value.trim();
  const phone = document.getElementById('inp-phone').value.trim();
  let valid = true;

  if (!name || name.length < 2) {
    document.getElementById('inp-name').classList.add('error');
    document.getElementById('err-name').classList.add('show');
    valid = false;
  } else {
    document.getElementById('inp-name').classList.remove('error');
    document.getElementById('err-name').classList.remove('show');
  }

  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 12) {
    document.getElementById('inp-phone').classList.add('error');
    document.getElementById('err-phone').classList.add('show');
    valid = false;
  } else {
    document.getElementById('inp-phone').classList.remove('error');
    document.getElementById('err-phone').classList.remove('show');
  }

  if (!valid) return;

  orderData.contact = { name, phone };
  checkoutStep = 2;
  renderCheckout();
  window.scrollTo(0, 0);
}

// --- Шаг 2: Доставка ---
function renderStep2(container) {
  const { items, packaging } = calcSubtotals();
  const subtotal = items + packaging;
  const isFree = subtotal >= config.delivery.free_from;

  const courierPriceInside = isFree ? 0 : config.delivery.courier_minsk.inside_mkad;
  const courierPriceOutside = isFree ? 0 : config.delivery.courier_minsk.outside_mkad;
  const postPrice = isFree ? 0 : calcDeliveryPost();

  container.innerHTML = `
    <div class="checkout-step active">
      <h3 style="font-size:20px;font-weight:700;margin-bottom:24px;margin-top:8px">🚚 Способ доставки</h3>

      <!-- Курьер -->
      <div class="delivery-card" id="del-courier" onclick="selectDelivery('courier')">
        <div class="delivery-card-top">
          <div class="delivery-card-left">
            <span class="delivery-card-icon">🚗</span>
            <span class="delivery-card-name">Курьер по Минску</span>
          </div>
          <span class="delivery-card-price${isFree ? ' free' : ''}" id="courier-price-label">
            ${isFree ? 'БЕСПЛАТНО' : courierPriceInside + ' BYN'}
          </span>
        </div>
        <div class="delivery-card-details">
          <div class="delivery-card-note">В пределах МКАД: ${isFree ? 'Бесплатно' : courierPriceInside + ' BYN'} · За МКАД (до 5 км): ${isFree ? 'Бесплатно' : courierPriceOutside + ' BYN'}</div>
          <div class="form-group">
            <label class="form-label">Улица *</label>
            <input class="form-input" id="inp-street" placeholder="ул. Примерная">
          </div>
          <div class="form-group">
            <label class="form-label">Дом *</label>
            <input class="form-input" id="inp-house" placeholder="12а">
          </div>
          <div style="display:flex;gap:12px">
            <div class="form-group" style="flex:1">
              <label class="form-label">Подъезд</label>
              <input class="form-input" id="inp-entrance" placeholder="1">
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Этаж</label>
              <input class="form-input" id="inp-floor" placeholder="5">
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Квартира</label>
              <input class="form-input" id="inp-apt" placeholder="42">
            </div>
          </div>
          ${!isFree ? `
          <div class="checkbox-row" id="chk-mkad" onclick="toggleMkad()">
            <div class="checkbox-box">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="checkbox-label">За МКАД (до 5 км) — ${courierPriceOutside} BYN</span>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Самовывоз -->
      <div class="delivery-card" id="del-pickup" onclick="selectDelivery('pickup')">
        <div class="delivery-card-top">
          <div class="delivery-card-left">
            <span class="delivery-card-icon">📍</span>
            <span class="delivery-card-name">Самовывоз</span>
          </div>
          <span class="delivery-card-price free">БЕСПЛАТНО</span>
        </div>
        <div class="delivery-card-details">
          <div class="delivery-card-note">📍 ${config.delivery.pickup.address}</div>
        </div>
      </div>

      <!-- Белпочта -->
      <div class="delivery-card" id="del-post" onclick="selectDelivery('post')">
        <div class="delivery-card-top">
          <div class="delivery-card-left">
            <span class="delivery-card-icon">📮</span>
            <span class="delivery-card-name">Белпочта</span>
          </div>
          <span class="delivery-card-price${isFree ? ' free' : ''}">${isFree ? 'БЕСПЛАТНО' : postPrice + ' BYN'}</span>
        </div>
        <div class="delivery-card-details">
          <div class="form-group">
            <label class="form-label">Полный адрес *</label>
            <input class="form-input" id="inp-post-addr" placeholder="г. Гомель, ул. Ленина, д. 10, кв. 5">
          </div>
          <div class="form-group">
            <label class="form-label">Индекс</label>
            <input class="form-input" id="inp-post-index" placeholder="246000" type="tel">
          </div>
        </div>
      </div>

      <div class="form-error" id="err-delivery" style="text-align:center;margin-top:12px">Выберите способ доставки</div>
      <button class="btn-next" onclick="submitStep2()">Далее →</button>
    </div>
  `;
}

function selectDelivery(method) {
  haptic('light');
  orderData.delivery.method = method;
  orderData.delivery.outsideMkad = false;

  document.querySelectorAll('.delivery-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('del-' + method).classList.add('selected');
  document.getElementById('err-delivery').classList.remove('show');
}

function toggleMkad() {
  haptic('light');
  const chk = document.getElementById('chk-mkad');
  chk.classList.toggle('checked');
  orderData.delivery.outsideMkad = chk.classList.contains('checked');

  // Обновить цену курьера
  const { items, packaging } = calcSubtotals();
  const subtotal = items + packaging;
  const isFree = subtotal >= config.delivery.free_from;
  if (!isFree) {
    const price = orderData.delivery.outsideMkad
      ? config.delivery.courier_minsk.outside_mkad
      : config.delivery.courier_minsk.inside_mkad;
    const label = document.getElementById('courier-price-label');
    if (label) label.textContent = price + ' BYN';
  }
}

function submitStep2() {
  haptic();
  const method = orderData.delivery.method;

  if (!method) {
    document.getElementById('err-delivery').classList.add('show');
    return;
  }

  if (method === 'courier') {
    const street = document.getElementById('inp-street')?.value.trim();
    const house = document.getElementById('inp-house')?.value.trim();
    if (!street || !house) {
      showToast('❌ Заполните адрес доставки');
      return;
    }
    orderData.delivery.address = {
      street,
      house,
      entrance: document.getElementById('inp-entrance')?.value.trim() || '',
      floor: document.getElementById('inp-floor')?.value.trim() || '',
      apt: document.getElementById('inp-apt')?.value.trim() || '',
    };
  } else if (method === 'post') {
    const addr = document.getElementById('inp-post-addr')?.value.trim();
    if (!addr) {
      showToast('❌ Заполните адрес для Белпочты');
      return;
    }
    orderData.delivery.address = {
      full: addr,
      index: document.getElementById('inp-post-index')?.value.trim() || '',
    };
  } else {
    orderData.delivery.address = { full: config.delivery.pickup.address };
  }

  checkoutStep = 3;
  renderCheckout();
  window.scrollTo(0, 0);
}

// --- Шаг 3: Подтверждение ---
function renderStep3(container) {
  const method = orderData.delivery.method;
  const totals = calcTotal(method, orderData.delivery.outsideMkad);

  // Адрес строка
  let addressStr = '';
  if (method === 'courier') {
    const a = orderData.delivery.address;
    addressStr = `ул. ${a.street}, д. ${a.house}`;
    if (a.apt) addressStr += `, кв. ${a.apt}`;
    if (orderData.delivery.outsideMkad) addressStr += ' (за МКАД)';
  } else if (method === 'post') {
    addressStr = orderData.delivery.address.full;
    if (orderData.delivery.address.index) addressStr += ', индекс: ' + orderData.delivery.address.index;
  } else {
    addressStr = config.delivery.pickup.address;
  }

  const methodNames = { courier: '🚗 Курьер по Минску', pickup: '📍 Самовывоз', post: '📮 Белпочта' };

  let itemsHtml = '';
  cart.forEach((item, i) => {
    const s = config.sizes[item.sizeIndex];
    itemsHtml += `
      <div class="confirm-row">
        <span>${i + 1}. ${s.width}×${s.height} см ${item.packaging ? '🎁' : ''}</span>
        <span>${s.price}${item.packaging ? ' + ' + s.packaging_price : ''} BYN</span>
      </div>
    `;
    if (item.comment) {
      itemsHtml += `<div style="font-size:12px;color:#666;padding:2px 0 4px 14px">💬 ${item.comment}</div>`;
    }
  });

  const prepay = Math.ceil(totals.total * 0.5);
  const onDelivery = totals.total - prepay;

  container.innerHTML = `
    <div class="checkout-step active">
      <h3 style="font-size:20px;font-weight:700;margin-bottom:20px;margin-top:8px">📋 Подтверждение заказа</h3>

      <!-- Состав -->
      <div class="confirm-card">
        <div class="confirm-card-header">
          <span class="confirm-card-title">📦 Состав заказа</span>
        </div>
        ${itemsHtml}
      </div>

      <!-- Контакты -->
      <div class="confirm-card">
        <div class="confirm-card-header">
          <span class="confirm-card-title">👤 Контакты</span>
          <button class="confirm-edit" onclick="checkoutStep=1;renderCheckout()">✏️ Изменить</button>
        </div>
        <div class="confirm-row"><span>ФИО</span><span>${orderData.contact.name}</span></div>
        <div class="confirm-row"><span>Телефон</span><span>${orderData.contact.phone}</span></div>
      </div>

      <!-- Доставка -->
      <div class="confirm-card">
        <div class="confirm-card-header">
          <span class="confirm-card-title">🚚 Доставка</span>
          <button class="confirm-edit" onclick="checkoutStep=2;renderCheckout()">✏️ Изменить</button>
        </div>
        <div class="confirm-row"><span>Способ</span><span style="text-align:right">${methodNames[method]}</span></div>
        <div class="confirm-row"><span>Адрес</span><span style="text-align:right;max-width:60%">${addressStr}</span></div>
        <div class="confirm-row"><span>Стоимость</span><span>${totals.delivery === 0 ? 'Бесплатно' : totals.delivery + ' BYN'}</span></div>
      </div>

      <!-- Итого -->
      <div class="confirm-total-card">
        <div class="confirm-total-row"><span>Товары</span><span>${totals.items} BYN</span></div>
        ${totals.packaging > 0 ? `<div class="confirm-total-row"><span>Упаковка</span><span>${totals.packaging} BYN</span></div>` : ''}
        ${totals.discount.amount > 0 ? `<div class="confirm-total-row discount"><span>${totals.discount.source}</span><span>-${totals.discount.amount} BYN</span></div>` : ''}
        <div class="confirm-total-row"><span>Доставка</span><span>${totals.delivery === 0 ? 'Бесплатно' : totals.delivery + ' BYN'}</span></div>
        <div class="confirm-total-row grand"><span>ИТОГО</span><span class="ctv">${totals.total} BYN</span></div>

        <div class="prepay-block">
          <div class="prepay-row">💳 Предоплата 50%: <b>${prepay} BYN</b></div>
          <div class="prepay-row">💵 При получении: <b>${onDelivery} BYN</b></div>
          <div class="prepay-note">Оплата только после согласования макета</div>
        </div>
      </div>

      <button class="btn-place-order" onclick="placeOrder()">✅ Оформить заказ</button>
    </div>
  `;
}

// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
function placeOrder() {
  haptic('heavy');
  const method = orderData.delivery.method;
  const totals = calcTotal(method, orderData.delivery.outsideMkad);

  // Генерация номера заказа
  const orderId = 'AH-' + Date.now().toString(36).toUpperCase().slice(-6);

  // Формируем текст для бота
  const orderText = formatOrderForBot(orderId, totals);

  // Отправка в Telegram
  try {
    if (tg?.sendData) {
      tg.sendData(JSON.stringify({
        type: 'order',
        orderId,
        text: orderText,
        data: {
          contact: orderData.contact,
          delivery: orderData.delivery,
          items: cart.map(item => {
            const s = config.sizes[item.sizeIndex];
            return {
              size: s.width + '×' + s.height,
              price: s.price,
              packaging: item.packaging,
              packagingPrice: item.packaging ? s.packaging_price : 0,
              comment: item.comment
            };
          }),
          promo: appliedPromo,
          totals
        }
      }));
    }
  } catch (e) {
    console.log('Telegram sendData недоступен', e);
  }

  // Показать успех
  showSuccess(orderId);

  // Очистка корзины
  cart = [];
  appliedPromo = null;
  saveCart();
  updateCartBadge();
}

function formatOrderForBot(orderId, totals) {
  const methodNames = { courier: 'Курьер по Минску', pickup: 'Самовывоз', post: 'Белпочта' };
  const user = tg?.initDataUnsafe?.user;

  let text = `🎨 НОВЫЙ ЗАКАЗ #${orderId}\n\n`;
  text += `━━━━━━━━━━━━━━━━━━━\n👤 КЛИЕНТ\n━━━━━━━━━━━━━━━━━━━\n`;
  text += `ФИО: ${orderData.contact.name}\n`;
  text += `Телефон: ${orderData.contact.phone}\n`;
  if (user) {
    text += `Telegram ID: ${user.id}\n`;
    if (user.username) text += `Username: @${user.username}\n`;
  }

  text += `\n━━━━━━━━━━━━━━━━━━━\n📦 ЗАКАЗ\n━━━━━━━━━━━━━━━━━━━\n`;
  cart.forEach((item, i) => {
    const s = config.sizes[item.sizeIndex];
    const num = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][i] || (i + 1) + '.';
    text += `\n${num} Размер: ${s.width}×${s.height} см\n`;
    text += `   Цена: ${s.price} BYN\n`;
    text += `   🎁 Упаковка: ${item.packaging ? 'Да (+' + s.packaging_price + ' BYN)' : 'Нет'}\n`;
    text += `   💬 Комментарий: ${item.comment || '—'}\n`;
  });

  if (appliedPromo) {
    text += `\n━━━━━━━━━━━━━━━━━━━\n🏷 ПРОМОКОД\n━━━━━━━━━━━━━━━━━━━\n`;
    text += `Промокод: ${appliedPromo}\n`;
    text += `Скидка: ${totals.discount.percent}% (-${totals.discount.amount} BYN)\n`;
  }

  // Адрес
  let addressStr = '';
  const method = orderData.delivery.method;
  if (method === 'courier') {
    const a = orderData.delivery.address;
    addressStr = `ул. ${a.street}, д. ${a.house}`;
    if (a.entrance) addressStr += `, подъезд ${a.entrance}`;
    if (a.floor) addressStr += `, этаж ${a.floor}`;
    if (a.apt) addressStr += `, кв. ${a.apt}`;
    if (orderData.delivery.outsideMkad) addressStr += ' (за МКАД)';
  } else if (method === 'post') {
    addressStr = orderData.delivery.address.full;
    if (orderData.delivery.address.index) addressStr += ', ' + orderData.delivery.address.index;
  } else {
    addressStr = config.delivery.pickup.address;
  }

  text += `\n━━━━━━━━━━━━━━━━━━━\n🚚 ДОСТАВКА\n━━━━━━━━━━━━━━━━━━━\n`;
  text += `Способ: ${methodNames[method]}\n`;
  text += `Адрес: ${addressStr}\n`;
  text += `Стоимость: ${totals.delivery === 0 ? 'БЕСПЛАТНО' : totals.delivery + ' BYN'}\n`;

  const prepay = Math.ceil(totals.total * 0.5);
  text += `\n━━━━━━━━━━━━━━━━━━━\n💰 РАСЧЁТ\n━━━━━━━━━━━━━━━━━━━\n`;
  text += `Товары:    ${totals.items} BYN\n`;
  if (totals.packaging > 0) text += `Упаковка:  ${totals.packaging} BYN\n`;
  if (totals.discount.amount > 0) text += `Скидка:    -${totals.discount.amount} BYN\n`;
  text += `Доставка:  ${totals.delivery === 0 ? 'БЕСПЛАТНО' : totals.delivery + ' BYN'}\n`;
  text += `─────────────────\n`;
  text += `ИТОГО:     ${totals.total} BYN\n\n`;
  text += `💳 Предоплата 50%:  ${prepay} BYN\n`;
  text += `💵 При получении:   ${totals.total - prepay} BYN\n`;
  text += `\n━━━━━━━━━━━━━━━━━━━\n`;
  text += `⏰ ${new Date().toLocaleString('ru-RU')}\n\n`;
  text += `📸 Ожидаем фото от клиента`;

  return text;
}

// ===== СТРАНИЦА УСПЕХА =====
function showSuccess(orderId) {
  const page = document.getElementById('page-success');
  page.innerHTML = `
    <div class="success-overlay">
      <svg class="success-check" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45"/>
        <polyline points="30,52 44,66 70,38"/>
      </svg>
      <div class="success-title">Заказ оформлен!</div>
      <div class="success-order-id">Номер заказа: #${orderId}</div>
      <div class="success-text">
        Мы свяжемся с вами в Telegram для согласования макета. Отправьте фото менеджеру.
      </div>
      <a href="https://t.me/oformitszakaz" target="_blank" class="btn-success-manager" onclick="haptic()">
        ✈️ Написать менеджеру
      </a>
      <button class="btn-success-home" onclick="navigateTo('home')">На главную</button>
    </div>
  `;
  navigateTo('success');
  launchConfetti();
}

// ===== КОНФЕТТИ =====
function launchConfetti() {
  const colors = ['#ff6b35', '#f7931e', '#764ba2', '#667eea', '#f093fb', '#fff'];
  const container = document.getElementById('page-success');
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 6 + Math.random() * 8;
    const left = Math.random() * 100;
    const delay = Math.random() * 1.5;
    const duration = 2 + Math.random() * 2;
    const shape = Math.random() > 0.5 ? '50%' : '2px';

    piece.style.cssText = `
      width: ${size}px; height: ${size}px; background: ${color};
      border-radius: ${shape};
      left: ${left}%; top: -10px;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), (duration + delay) * 1000 + 100);
  }
}
