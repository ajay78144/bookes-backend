/**
 * BookSaw E-Commerce - Main Application Script
 * Handles: header sticky, currency, cart badge, auth, search, toasts, products
 */

// ── Header Sticky, Height Sync & Hamburger ─────────────────────────────────
function initHeader() {
  var wasSticky = false;

  function updateHeaderState() {
    var hw = document.getElementById('header-wrap');
    if (hw) {
      var scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      var isScrolled = scrollY > 70;

      if (isScrolled !== wasSticky) {
        wasSticky = isScrolled;
        if (isScrolled) {
          hw.classList.add('sticky', 'header-scrolled');
        } else {
          hw.classList.remove('sticky', 'header-scrolled');
        }
      }

      var h = hw.offsetHeight || 118;
      document.documentElement.style.setProperty('--header-height', h + 'px');
    }
  }

  // Passive scroll listener for smooth 60fps performance
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', updateHeaderState, { passive: true });
  window.addEventListener('orientationchange', updateHeaderState);

  // Initial calculation
  updateHeaderState();
  setTimeout(updateHeaderState, 150);

  // ── Bulletproof Responsive Hamburger & Mobile Menu ───────────────────────────
  function toggleMobileNav(e) {
    if (e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }
    var btn = document.querySelector('.hamburger');
    var menuList = document.querySelector('.menu-list');
    var backdrop = document.getElementById('mobile-nav-backdrop');
    if (!btn || !menuList) return;

    var isOpen = btn.classList.contains('active');
    if (isOpen) {
      closeMobileNav();
    } else {
      btn.classList.add('active');
      btn.setAttribute('aria-expanded', 'true');
      menuList.classList.add('responsive');
      if (backdrop) backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    setTimeout(updateHeaderState, 150);
  }

  function closeMobileNav() {
    var btn = document.querySelector('.hamburger');
    var menuList = document.querySelector('.menu-list');
    var backdrop = document.getElementById('mobile-nav-backdrop');
    if (btn) {
      btn.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    }
    if (menuList) menuList.classList.remove('responsive');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  window.toggleMobileNav = toggleMobileNav;
  window.closeMobileNav = closeMobileNav;

  // Hamburger Click Handler (native + delegated)
  var hamburger = document.querySelector('.hamburger');
  if (hamburger) {
    hamburger.onclick = toggleMobileNav;
  }

  var backdrop = document.getElementById('mobile-nav-backdrop');
  if (backdrop) {
    backdrop.onclick = closeMobileNav;
  }

  // Close when clicking any nav item link
  document.querySelectorAll('.menu-list .menu-item a').forEach(function(link) {
    link.addEventListener('click', closeMobileNav);
  });

  // Close when clicking outside of navbar
  document.addEventListener('click', function(e) {
    var nav = document.getElementById('navbar');
    var btn = document.querySelector('.hamburger');
    if (btn && btn.classList.contains('active')) {
      if (nav && !nav.contains(e.target) && !e.target.closest('.hamburger')) {
        closeMobileNav();
      }
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileNav();
  });

  // Active nav link highlight
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.menu-list a').forEach(function(link) {
    if (link.getAttribute('href') === currentPage) {
      var li = link.closest('li');
      if (li) li.classList.add('active');
    }
  });
}

// ── Auth UI ────────────────────────────────────────────────────────────────
function updateAuthUI() {
  var user = DB.getCurrentUser();
  var accountBtn = document.getElementById('account-btn');
  var logoutBtn = document.getElementById('logout-btn');
  var adminLink = document.getElementById('admin-nav-link');

  if (accountBtn) {
    if (user) {
      accountBtn.innerHTML = '<i class="icon icon-user"></i><span>' + user.name.split(' ')[0] + ' (Profile)</span>';
      accountBtn.href = 'account.html';
      accountBtn.title = 'My Profile, Purchased Books & Activity';
    } else {
      accountBtn.innerHTML = '<i class="icon icon-user"></i><span>Sign In</span>';
      accountBtn.href = 'login.html';
      accountBtn.title = 'Sign In to Buy Books';
    }
  }

  if (logoutBtn) {
    if (user) {
      logoutBtn.style.display = 'inline-flex';
      logoutBtn.onclick = function(e) {
        e.preventDefault();
        DB.logout();
        showToast('Logged out successfully', 'info');
        setTimeout(function() { window.location.href = 'index.html'; }, 800);
      };
    } else {
      logoutBtn.style.display = 'none';
    }
  }

  if (adminLink) {
    adminLink.style.display = DB.isAdmin() ? 'list-item' : 'none';
  }
}

// ── Cart Badge ─────────────────────────────────────────────────────────────
function updateCartBadge() {
  var count = DB.cartCount();
  var badge = document.getElementById('cart-count');
  var cartBtn = document.getElementById('cart-btn');

  if (badge) badge.textContent = count;

  if (cartBtn) {
    var totalUSD = DB.getCart().reduce(function(s, c) { return s + c.priceUSD * c.qty; }, 0);
    cartBtn.innerHTML = '<i class="icon icon-clipboard"></i><span>Cart (' + count + ')&nbsp; ' + Currency.formatSelected(totalUSD) + '</span>';
  }
}

// ── Currency UI ────────────────────────────────────────────────────────────
function initCurrencyUI() {
  var sel = document.getElementById('currency-selector');
  if (!sel) return;

  var currencies = Currency.getAllCurrencies();
  sel.innerHTML = '';
  Object.keys(currencies).forEach(function(code) {
    var info = currencies[code];
    var opt = document.createElement('option');
    opt.value = code;
    opt.textContent = info.flag + ' ' + code + ' (' + info.symbol + ')';
    opt.title = info.name + ' (' + code + ')';
    sel.appendChild(opt);
  });

  sel.value = Currency.getSelected();

  sel.addEventListener('change', function() {
    DB.setSelectedCurrency(sel.value);
    updateAllPrices();
    updateCartBadge();
    var info = Currency.getInfo(sel.value);
    showToast((info.flag || '💱') + ' Currency switched to ' + info.name + ' (' + sel.value + ')', 'success');
  });
}

async function detectAndSetCurrency() {
  var settings = DB.getCurrencySettings();
  if (!settings.autoDetected) {
    try {
      var result = await Currency.detectCountry();
      if (result.currency && result.currency !== 'USD') {
        DB.setSelectedCurrency(result.currency);
        var sel = document.getElementById('currency-selector');
        if (sel) sel.value = result.currency;
        updateAllPrices();
        updateCartBadge();
        var info = Currency.getInfo(result.currency);
        showToast((info.flag || '💱') + ' Location detected (' + result.country + '). Currency set to ' + info.name + ' (' + result.currency + ')', 'info');
      }
    } catch(e) {}
  } else {
    var sel = document.getElementById('currency-selector');
    if (sel) sel.value = Currency.getSelected();
  }
}

// ── Price Rendering ────────────────────────────────────────────────────────
function updateAllPrices() {
  document.querySelectorAll('[data-price-usd]').forEach(function(el) {
    var usd = parseFloat(el.dataset.priceUsd);
    if (!isNaN(usd)) el.textContent = Currency.formatSelected(usd);
  });
  document.querySelectorAll('[data-orig-price-usd]').forEach(function(el) {
    var usd = parseFloat(el.dataset.origPriceUsd);
    if (!isNaN(usd)) el.textContent = Currency.formatSelected(usd);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Search & Live Autocomplete ──────────────────────────────────────────────
function initSearch() {
  var searchForm = document.getElementById('search-form');
  var searchInput = document.getElementById('search-input');
  var searchBar = document.querySelector('.search-bar');
  var searchToggle = document.querySelector('.search-toggle');
  var headerWrap = document.getElementById('header-wrap');
  
  if (!searchBar || !searchInput) return;

  // Create or grab results dropdown
  var dropdown = document.getElementById('search-results-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'search-results-dropdown';
    dropdown.className = 'search-results-dropdown';
    dropdown.style.display = 'none';
    (searchBar.parentElement || searchBar).appendChild(dropdown);
  }

  // Clear button
  var clearBtn = document.getElementById('search-clear-btn');
  if (!clearBtn) {
    clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.id = 'search-clear-btn';
    clearBtn.className = 'search-clear-btn';
    clearBtn.innerHTML = '✕';
    clearBtn.title = 'Clear search';
    clearBtn.style.display = 'none';
    if (searchForm) searchForm.appendChild(clearBtn);
  }

  function performLiveSearch(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      clearBtn.style.display = 'none';
      return;
    }
    clearBtn.style.display = 'inline-block';

    var allBooks = DB.getBooks();
    var matches = allBooks.filter(function(b) {
      return (b.title && b.title.toLowerCase().includes(q)) ||
             (b.author && b.author.toLowerCase().includes(q)) ||
             (b.genre && b.genre.toLowerCase().includes(q)) ||
             (b.category && b.category.toLowerCase().includes(q));
    });

    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="search-dropdown-empty">No books found for "<strong>' + escapeHtml(q) + '</strong>"<br><a href="shop.html" style="color:var(--primary);font-size:12px;margin-top:6px;display:inline-block;">Browse all books →</a></div>';
    } else {
      var html = '<div class="search-dropdown-header" style="padding:6px 14px 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;font-weight:700;">Matching Books (' + matches.length + ')</div>';
      matches.slice(0, 5).forEach(function(b) {
        var priceFormatted = Currency.formatSelected(b.priceUSD);
        html += '<a href="product.html?id=' + b.id + '" class="search-result-item">' +
          '<img src="' + b.image + '" alt="' + escapeHtml(b.title) + '" class="search-result-thumb">' +
          '<div class="search-result-info">' +
            '<h4 class="search-result-title">' + escapeHtml(b.title) + '</h4>' +
            '<p class="search-result-author">by ' + escapeHtml(b.author) + ' &bull; <span style="text-transform:capitalize;">' + escapeHtml(b.category || '') + '</span></p>' +
            '<div class="search-result-price">' + priceFormatted + '</div>' +
          '</div>' +
        '</a>';
      });
      if (matches.length > 5) {
        html += '<a href="shop.html?search=' + encodeURIComponent(q) + '" class="search-dropdown-footer">View all ' + matches.length + ' books for "' + escapeHtml(q) + '" &rarr;</a>';
      } else {
        html += '<a href="shop.html?search=' + encodeURIComponent(q) + '" class="search-dropdown-footer">See all in Shop &rarr;</a>';
      }
      dropdown.innerHTML = html;
    }
    dropdown.style.display = 'block';
  }

  // Live input handler with debounce
  var debounceTimer;
  searchInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      performLiveSearch(searchInput.value);
    }, 180);
  });

  // Clear button action
  clearBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    searchInput.value = '';
    performLiveSearch('');
    searchInput.focus();
  });

  // Submit handler
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var q = searchInput.value.trim();
      if (q) window.location.href = 'shop.html?search=' + encodeURIComponent(q);
    });
  }

  // Click outside to close dropdown
  document.addEventListener('click', function(e) {
    if (!searchBar.contains(e.target)) {
      dropdown.style.display = 'none';
      if (!searchInput.value.trim() && headerWrap) {
        headerWrap.classList.remove('show');
        if (searchToggle) searchToggle.classList.remove('active');
        searchBar.classList.remove('active');
      }
    }
  });

  // ESC key closes
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      if (headerWrap) headerWrap.classList.remove('show');
      if (searchToggle) searchToggle.classList.remove('active');
      searchBar.classList.remove('active');
    }
  });
}

// ── Toast Notifications ────────────────────────────────────────────────────
function showToast(message, type) {
  type = type || 'success';
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  var toast = document.createElement('div');
  toast.className = 'bs-toast bs-toast-' + type;
  var icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  toast.innerHTML = '<span class="toast-icon">' + (icons[type] || '✓') + '</span><span class="toast-msg">' + message + '</span>';
  container.appendChild(toast);

  requestAnimationFrame(function() { toast.classList.add('show'); });

  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
  }, 3500);
}

// ── Add to Cart ────────────────────────────────────────────────────────────
// ── Add to Cart (Strict Authentication Gate) ──────────────────────────────────
function addToCart(bookId, qty, e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }

  qty = qty || 1;
  var book = DB.getBook(parseInt(bookId));
  if (!book) return false;

  // ── MANDATORY LOGIN GATE ──────────────────────────────────────────────────
  // Only registered & logged-in users are allowed to add books to cart or buy!
  if (!DB.isLoggedIn()) {
    showAuthGateModal(book.id, 'add_to_cart');
    return false;
  }

  // Add book to localStorage cart
  var added = DB.addToCart(book, qty);
  if (!added) {
    showAuthGateModal(book.id, 'add_to_cart');
    return false;
  }

  updateCartBadge();

  // Instant button feedback
  var targetBtn = e && (e.currentTarget || e.target);
  if (targetBtn && targetBtn.tagName === 'BUTTON') {
    var originalText = targetBtn.innerText;
    targetBtn.innerText = '✓ Added to Cart!';
    targetBtn.style.background = '#15803d';
    targetBtn.style.color = '#ffffff';
    targetBtn.disabled = true;
    setTimeout(function() {
      targetBtn.innerText = originalText;
      targetBtn.style.background = '';
      targetBtn.style.color = '';
      targetBtn.disabled = false;
    }, 1500);
  }

  // Pulse animation on cart in header
  var btn = document.getElementById('cart-btn');
  if (btn) {
    btn.style.transform = 'scale(1.22)';
    btn.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    setTimeout(function() { btn.style.transform = ''; }, 350);
  }

  var safeTitle = escapeHtml(book.title);
  var priceFormatted = Currency.formatSelected(book.priceUSD);
  var toastHtml = '<div style="display:flex;flex-direction:column;gap:6px;width:100%;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
      '<span style="font-weight:700;color:#2c2723;font-size:13.5px;line-height:1.3;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"' + safeTitle + '"</span>' +
      '<span style="color:#74642F;font-weight:700;font-size:13px;white-space:nowrap;">' + priceFormatted + '</span>' +
    '</div>' +
    '<div style="font-size:12px;color:#555;">Added to your cart! 🛒</div>' +
    '<div style="display:flex;gap:8px;margin-top:4px;">' +
      '<a href="cart.html" style="flex:1;text-align:center;padding:5px 8px;background:#f5f2eb;color:#74642F;border:1px solid #dcd4c3;border-radius:5px;font-size:11.5px;font-weight:700;text-decoration:none;">View Cart</a>' +
      '<a href="checkout.html" style="flex:1;text-align:center;padding:5px 8px;background:#74642F;color:#ffffff;border-radius:5px;font-size:11.5px;font-weight:700;text-decoration:none;">Buy Now →</a>' +
    '</div>' +
  '</div>';

  showToast(toastHtml, 'success');
  return true;
}

// ── Interactive Auth Gate Modal ─────────────────────────────────────────────
function showAuthGateModal(bookId, intent) {
  var book = bookId ? DB.getBook(parseInt(bookId)) : null;
  var currentUrl = window.location.pathname.split('/').pop() || 'index.html';
  if (window.location.search) currentUrl += window.location.search;

  var redirectTarget = (intent === 'buy_now' || intent === 'checkout') ? 'checkout.html' : currentUrl;
  var loginUrl = 'login.html?redirect=' + encodeURIComponent(redirectTarget);
  var registerUrl = 'register.html?redirect=' + encodeURIComponent(redirectTarget);

  var modal = document.getElementById('bs-auth-gate-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bs-auth-gate-modal';
    document.body.appendChild(modal);
  }

  var bookPreviewHtml = '';
  if (book) {
    var safeTitle = escapeHtml(book.title);
    var price = Currency.formatSelected(book.priceUSD);
    bookPreviewHtml =
      '<div class="bs-auth-book-preview">' +
        '<img src="' + book.image + '" alt="' + safeTitle + '" class="bs-auth-book-img" onerror="this.src=\'images/default.png\'">' +
        '<div class="bs-auth-book-info">' +
          '<div class="bs-auth-book-title">' + safeTitle + '</div>' +
          '<div class="bs-auth-book-author">by ' + escapeHtml(book.author) + '</div>' +
          '<div class="bs-auth-book-price">' + price + '</div>' +
        '</div>' +
      '</div>';
  }

  var titleText = intent === 'buy_now' ? 'Sign In to Buy This Book' : (intent === 'checkout' ? 'Sign In to Complete Checkout' : 'Sign In to Add to Cart & Buy');
  var descText = 'Only registered readers can add books to cart and purchase. All book purchases and PDF licenses are permanently attached to your personal BookSaw library.';

  modal.innerHTML =
    '<div class="bs-auth-card">' +
      '<button type="button" class="bs-auth-close-btn" onclick="closeAuthGateModal()" title="Close">&times;</button>' +
      '<div class="bs-auth-icon-wrap">🔒</div>' +
      '<h3 class="bs-auth-title">' + titleText + '</h3>' +
      '<p class="bs-auth-desc">' + descText + '</p>' +
      bookPreviewHtml +
      '<ul class="bs-auth-perks">' +
        '<li><span class="check">✓</span> <span>Permanent digital ownership bound to your account</span></li>' +
        '<li><span class="check">✓</span> <span>Instant in-browser reader + offline PDF download</span></li>' +
        '<li><span class="check">✓</span> <span>Sync your reading progress across all devices</span></li>' +
      '</ul>' +
      '<div class="bs-auth-actions">' +
        '<a href="' + loginUrl + '" class="bs-auth-btn-login">Sign In to Your Account →</a>' +
        '<a href="' + registerUrl + '" class="bs-auth-btn-register">Create Free Account (30 seconds)</a>' +
      '</div>' +
    '</div>';

  modal.onclick = function(e) {
    if (e.target === modal) closeAuthGateModal();
  };

  modal.classList.add('active');
  showToast('🔒 Please Sign In or Register to add books to cart & buy!', 'warning');
}

function closeAuthGateModal() {
  var modal = document.getElementById('bs-auth-gate-modal');
  if (modal) modal.classList.remove('active');
}

// ── Wishlist ───────────────────────────────────────────────────────────────
function toggleWishlist(bookId, e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  var inWL = DB.toggleWishlist(parseInt(bookId));
  var btns = document.querySelectorAll('[data-wishlist="' + bookId + '"]');
  btns.forEach(function(btn) {
    btn.classList.toggle('active', inWL);
    btn.setAttribute('title', inWL ? 'Remove from Wishlist' : 'Add to Wishlist');
    var svg = btn.querySelector('.heart-svg');
    if (svg) {
      svg.setAttribute('fill', inWL ? '#ef4444' : 'none');
      svg.setAttribute('stroke', inWL ? '#ef4444' : '#444');
    }
  });

  // Also update product page main wishlist button if present
  var mainBtn = document.getElementById('wishlist-btn-main');
  if (mainBtn) {
    mainBtn.innerHTML = inWL ? '❤️ Wishlisted' : '🤍 Wishlist';
  }

  showToast(inWL ? 'Added to wishlist ❤️' : 'Removed from wishlist', inWL ? 'success' : 'info');
}

// ── Product Card Generator ─────────────────────────────────────────────────
function createBookCard(book) {
  var inWL = DB.inWishlist(book.id);
  var price = Currency.formatSelected(book.priceUSD);
  var origPrice = book.originalPriceUSD ? Currency.formatSelected(book.originalPriceUSD) : null;

  var currentUser = DB.getCurrentUser();
  var isOwned = DB.isBookPurchased(book.id, currentUser ? currentUser.id : null);

  return '<div class="product-item" data-book-id="' + book.id + '">' +
    '<figure class="product-style">' +
      '<a href="product.html?id=' + book.id + '" class="product-thumb-link">' +
        '<img src="' + book.image + '" alt="' + book.title + '" loading="lazy" onerror="this.src=\'images/default.png\'">' +
      '</a>' +
      '<button type="button" class="add-to-cart" onclick="' + (isOwned ? 'window.location.href=\'reader.html?id=' + book.id + '\'' : 'addToCart(' + book.id + ', 1, event)') + '">' +
        (isOwned ? 'Read Book' : 'Add to Cart') +
      '</button>' +
      '<div class="card-side-actions">' +
        '<button type="button" class="circle-btn-action wishlist-btn ' + (inWL ? 'active' : '') + '" data-wishlist="' + book.id + '" onclick="toggleWishlist(' + book.id + ', event)" title="' + (inWL ? 'Remove from Wishlist' : 'Add to Wishlist') + '" aria-label="Wishlist">' +
          '<svg class="heart-svg" viewBox="0 0 24 24" width="15" height="15" fill="' + (inWL ? '#ef4444' : 'none') + '" stroke="' + (inWL ? '#ef4444' : '#444') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>' +
          '</svg>' +
        '</button>' +
      '</div>' +
    '</figure>' +
    '<figcaption>' +
      '<h3><a href="product.html?id=' + book.id + '">' + book.title + '</a></h3>' +
      '<span class="author">' + book.author + '</span>' +
      '<div class="item-price">' +
        (origPrice ? '<span class="prev-price" data-orig-price-usd="' + book.originalPriceUSD + '">' + origPrice + '</span> ' : '') +
        '<span class="current-price" data-price-usd="' + book.priceUSD + '">' + price + '</span>' +
      '</div>' +
    '</figcaption>' +
  '</div>';
}

function generateStars(rating) {
  var stars = '';
  for (var i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) stars += '★';
    else if (i - 0.5 <= rating) stars += '½';
    else stars += '☆';
  }
  return '<span class="stars">' + stars + '</span>';
}

// ── Auth Guards ────────────────────────────────────────────────────────────
function requireLogin() {
  if (!DB.isLoggedIn()) {
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!DB.isAdmin()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}


/* ═══════════════════════════════════════════════════════════════════════
   BOOKSAW GLOBAL PAGE LOADER MODULE
   Beautiful book icon with spinning circular ring — appears on every page
   ═══════════════════════════════════════════════════════════════════════ */
var BSLoader = (function () {
  'use strict';

  // ── Build the loader HTML string ──────────────────────────────────────────
  function _buildHTML(variant, label) {
    var cls = variant ? ' bsl--' + variant : '';
    var lbl = label || (variant === 'admin' ? 'Loading Panel' : 'Loading');
    var logoSrc = 'images/main-logo.png';

    return '<div id="bs-page-loader" class="' + cls + '" role="status" aria-label="Loading">' +
      '<img class="bsl-logo-mark" src="' + logoSrc + '" alt="BookSaw">' +
      '<div class="bsl-particles">' +
        '<div class="bsl-particle"></div><div class="bsl-particle"></div>' +
        '<div class="bsl-particle"></div><div class="bsl-particle"></div>' +
        '<div class="bsl-particle"></div><div class="bsl-particle"></div>' +
        '<div class="bsl-particle"></div><div class="bsl-particle"></div>' +
        '<div class="bsl-particle"></div><div class="bsl-particle"></div>' +
      '</div>' +
      '<div class="bsl-ring-wrap">' +
        '<svg class="bsl-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
          '<circle class="bsl-track" cx="50" cy="50" r="44"/>' +
          '<circle class="bsl-arc-inner" cx="50" cy="50" r="38"/>' +
          '<circle class="bsl-arc" cx="50" cy="50" r="44"/>' +
        '</svg>' +
        '<span class="bsl-book-icon" aria-hidden="true">📖</span>' +
      '</div>' +
      '<div class="bsl-dots">' +
        '<span></span><span></span><span></span><span></span><span></span>' +
      '</div>' +
      '<div class="bsl-label">' + lbl + '</div>' +
    '</div>';
  }

  // ── Detect page type for correct variant ─────────────────────────────────
  function _detectVariant() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('/admin/') !== -1) return 'admin';
    if (path.indexOf('login.html') !== -1 || path.indexOf('register.html') !== -1) return 'auth';
    return '';
  }

  // ── Detect label for current page ─────────────────────────────────────────
  function _detectLabel() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('shop') !== -1)          return 'Loading Store';
    if (path.indexOf('reader') !== -1)         return 'Opening Book';
    if (path.indexOf('checkout') !== -1)       return 'Preparing Checkout';
    if (path.indexOf('cart') !== -1)           return 'Loading Cart';
    if (path.indexOf('account') !== -1)        return 'Loading Account';
    if (path.indexOf('order-success') !== -1)  return 'Confirming Order';
    if (path.indexOf('admin/dashboard') !== -1) return 'Dashboard';
    if (path.indexOf('admin/books') !== -1)    return 'Managing Books';
    if (path.indexOf('admin/orders') !== -1)   return 'Loading Orders';
    if (path.indexOf('admin/users') !== -1)    return 'Loading Users';
    if (path.indexOf('admin/') !== -1)         return 'Loading Panel';
    if (path.indexOf('login') !== -1)          return 'Sign In';
    if (path.indexOf('register') !== -1)       return 'Create Account';
    if (path.indexOf('blog') !== -1)           return 'Loading Blog';
    if (path.indexOf('product') !== -1)        return 'Opening Book';
    if (path.indexOf('contact') !== -1)        return 'Loading';
    return 'Loading';
  }

  // ── Inject loader DOM (idempotent) ─────────────────────────────────────────
  function inject(variant, label) {
    if (document.getElementById('bs-page-loader')) return;
    var v = variant !== undefined ? variant : _detectVariant();
    var l = label !== undefined ? label : _detectLabel();
    var div = document.createElement('div');
    div.innerHTML = _buildHTML(v, l);
    document.body.insertBefore(div.firstChild, document.body.firstChild);
  }

  // ── Hide loader with fade-out transition ──────────────────────────────────
  function hide(delay) {
    var ms = typeof delay === 'number' ? delay : 0;
    setTimeout(function () {
      var el = document.getElementById('bs-page-loader');
      if (el) {
        el.classList.add('bs-loader--hidden');
        // Remove from DOM after transition completes
        setTimeout(function () {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 700);
      }
    }, ms);
  }

  // ── Show loader (re-inject if removed) ────────────────────────────────────
  function show(label) {
    var existing = document.getElementById('bs-page-loader');
    if (existing) {
      existing.classList.remove('bs-loader--hidden');
    } else {
      inject(undefined, label);
    }
  }

  // ── Intercept all internal <a> clicks to show loader briefly ─────────────
  function _initLinkInterception() {
    document.addEventListener('click', function (e) {
      var anchor = e.target.closest('a[href]');
      if (!anchor) return;

      var href = anchor.getAttribute('href') || '';

      // Skip: external links, anchors, js: links, mailto, tel, blank targets
      if (!href || href.charAt(0) === '#' ||
          href.indexOf('://') !== -1 ||
          href.indexOf('mailto:') === 0 ||
          href.indexOf('tel:') === 0 ||
          href.indexOf('javascript:') === 0 ||
          anchor.getAttribute('target') === '_blank' ||
          anchor.hasAttribute('data-no-loader') ||
          e.ctrlKey || e.metaKey || e.shiftKey) {
        return;
      }

      // Show loader for internal page navigation
      e.preventDefault();
      var dest = href;
      show();
      setTimeout(function () {
        window.location.href = dest;
      }, 220);
    }, true);
  }

  // ── Init: inject + auto-hide when DOM is ready ────────────────────────────
  function init() {
    inject();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        hide(350);
        _initLinkInterception();
      });
    } else {
      hide(350);
      _initLinkInterception();
    }
    // Safety net: always hide after 4 seconds maximum
    setTimeout(function () { hide(); }, 4000);
  }

  // ── Create inline (section-level) loader HTML ─────────────────────────────
  function inlineHTML(label) {
    return '<div class="bsl-inline">' +
      '<div class="bsl-ring-wrap">' +
        '<svg class="bsl-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
          '<circle class="bsl-track" cx="50" cy="50" r="44"/>' +
          '<circle class="bsl-arc" cx="50" cy="50" r="44"/>' +
        '</svg>' +
        '<span class="bsl-book-icon">📖</span>' +
      '</div>' +
      '<div class="bsl-label">' + (label || 'Loading') + '</div>' +
    '</div>';
  }

  return { init: init, show: show, hide: hide, inject: inject, inlineHTML: inlineHTML };
}());

// Auto-init as soon as this script runs (before DOM is fully painted)
// The loader is injected immediately so there's no white-flash
(function () {
  if (typeof document === 'undefined') return;
  // body may not exist yet if script is in <head>
  if (document.body) {
    BSLoader.inject();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      BSLoader.inject();
    });
  }
}());

