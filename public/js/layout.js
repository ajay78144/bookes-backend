/**
 * BookSaw - Shared Header/Footer Injector
 * Call initPage() on every page to inject consistent header + footer
 */

// Ensure Favicon is dynamically mounted if missing
(function ensureFavicon() {
  if (typeof document === 'undefined') return;
  if (!document.querySelector("link[rel*='icon']")) {
    const isSub = typeof window !== 'undefined' && window.location.pathname.includes('/admin/');
    const prefix = isSub ? '../images/' : 'images/';
    const linkSvg = document.createElement('link');
    linkSvg.rel = 'icon';
    linkSvg.type = 'image/svg+xml';
    linkSvg.href = prefix + 'favicon.svg';
    document.head.appendChild(linkSvg);

    const linkPng = document.createElement('link');
    linkPng.rel = 'icon';
    linkPng.type = 'image/png';
    linkPng.href = prefix + 'favicon.png';
    document.head.appendChild(linkPng);
  }
})();

function getHeaderHTML(activePage) {
  return `
  <div id="header-wrap">
    <div class="top-content">
      <div class="container-fluid px-3 px-md-4 px-xl-5">
        <div class="row align-items-center">
          <div class="col-md-5 col-6">
            <div class="social-links">
              <ul>
                <li><a href="#" title="Facebook"><i class="icon icon-facebook"></i></a></li>
                <li><a href="#" title="Twitter"><i class="icon icon-twitter"></i></a></li>
                <li><a href="#" title="YouTube"><i class="icon icon-youtube-play"></i></a></li>
                <li><a href="#" title="Behance"><i class="icon icon-behance-square"></i></a></li>
              </ul>
            </div>
          </div>
          <div class="col-md-7 col-6">
            <div class="right-element">
              <div class="currency-wrapper" title="Select your country currency">
                <span class="currency-icon">🌐</span>
                <select id="currency-selector" title="Select Currency"></select>
                <span class="currency-arrow">▾</span>
              </div>
              <a href="login.html" class="for-buy" id="account-btn"><i class="icon icon-user"></i><span>Account</span></a>
              <a href="#" class="for-buy" id="logout-btn" style="display:none"><i class="icon icon-exit"></i><span>Logout</span></a>
              <a href="cart.html" class="for-buy cart" id="cart-btn">
                <i class="icon icon-clipboard"></i><span>Cart (<span id="cart-count">0</span>)</span>
              </a>
              <div class="action-menu">
                <div class="search-bar">
                  <a href="#" class="search-button search-toggle" data-selector="#header-wrap" title="Search books">
                    <i class="icon icon-search"></i>
                  </a>
                  <form role="search" id="search-form" class="search-box">
                    <input class="search-field text search-input" placeholder="Search books, authors..." type="search" id="search-input" autocomplete="off">
                  </form>
                </div>
                <div id="search-results-dropdown" class="search-results-dropdown" style="display:none;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <header id="header">
      <div class="container-fluid px-3 px-md-4 px-xl-5">
        <div class="row align-items-center">
          <div class="col-md-3 col-6">
            <div class="main-logo">
              <a href="index.html"><img src="images/main-logo.png" alt="BookSaw Logo"></a>
            </div>
          </div>
          <div class="col-md-9 col-6">
            <nav id="navbar">
              <div class="main-menu">
                <ul class="menu-list" id="main-menu-list">
                  <li class="menu-item ${activePage === 'home' ? 'active' : ''}"><a href="index.html">Home</a></li>
                  <li class="menu-item ${activePage === 'shop' ? 'active' : ''}"><a href="shop.html">Shop</a></li>
                  <li class="menu-item ${activePage === 'blog' ? 'active' : ''}"><a href="blog.html">Articles</a></li>
                  <li class="menu-item ${activePage === 'about' ? 'active' : ''}"><a href="about.html">About</a></li>
                  <li class="menu-item ${activePage === 'contact' ? 'active' : ''}"><a href="contact.html">Contact</a></li>
                  <li class="menu-item" id="admin-nav-link" style="display:none">
                    <a href="admin/dashboard.html">⚙ Admin</a>
                  </li>
                </ul>
                <button type="button" class="hamburger" id="nav-toggle-btn" aria-label="Toggle Navigation Menu" aria-expanded="false" onclick="toggleMobileNav(event)">
                  <span class="bar bar-1"></span>
                  <span class="bar bar-2"></span>
                  <span class="bar bar-3"></span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>
      <div class="mobile-nav-backdrop" id="mobile-nav-backdrop"></div>
    </header>
  </div>`;
}

function getFooterHTML() {
  return `
  <div class="newsletter-section">
    <div class="container">
      <span class="newsletter-badge">📬 Join 25,000+ Book Lovers</span>
      <h2>Stay Updated With Our Latest Releases</h2>
      <p>Subscribe to our newsletter for exclusive book discounts, author interviews, and weekly reading recommendations delivered straight to your inbox.</p>
      <form class="newsletter-form" onsubmit="subscribeNewsletter(event)">
        <div class="newsletter-input-wrap">
          <span class="newsletter-input-icon">✉️</span>
          <input type="email" placeholder="Enter your email address..." required autocomplete="email">
        </div>
        <button type="submit">Subscribe</button>
      </form>
      <div class="newsletter-trust">
        <span>🔒 No spam, ever</span>
        <span>•</span>
        <span>✓ Weekly curated recommendations</span>
        <span>•</span>
        <span>✓ Unsubscribe anytime</span>
      </div>
    </div>
  </div>

  <footer class="main-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html"><img src="images/main-logo.png" alt="BookSaw" class="footer-logo"></a>
          <p>BookSaw is your premier digital book platform. Discover thousands of handpicked titles with instant PDF downloads and interactive in-browser reading across 36+ global currencies.</p>
          <ul class="footer-contact-list">
            <li><span class="contact-icon">📍</span> 123 Bookseller Row, New York, NY 10001</li>
            <li><span class="contact-icon">📞</span> +1 (800) 555-BOOK (2665)</li>
            <li><span class="contact-icon">✉️</span> support@booksaw.com</li>
          </ul>
          <div class="footer-social">
            <a href="#" title="Facebook"><i class="icon icon-facebook"></i></a>
            <a href="#" title="Twitter"><i class="icon icon-twitter"></i></a>
            <a href="#" title="YouTube"><i class="icon icon-youtube-play"></i></a>
            <a href="#" title="Behance"><i class="icon icon-behance-square"></i></a>
          </div>
        </div>

        <div class="footer-col">
          <h4>Explore Books</h4>
          <ul>
            <li><a href="shop.html">All Books</a></li>
            <li><a href="shop.html?category=all&filter=featured">Featured Titles</a></li>
            <li><a href="shop.html?sort=rating">Best Sellers</a></li>
            <li><a href="shop.html?filter=onsale">Special Offers</a></li>
            <li><a href="blog.html">Articles & Reviews</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Customer Care</h4>
          <ul>
            <li><a href="account.html">My Library</a></li>
            <li><a href="cart.html">Shopping Cart</a></li>
            <li><a href="checkout.html">Instant Checkout</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact Support</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Policies & Info</h4>
          <ul>
            <li><a href="digital-access.html">Instant Digital Access</a></li>
            <li><a href="refund-policy.html">Refund & Guarantee</a></li>
            <li><a href="privacy.html">Privacy Policy</a></li>
            <li><a href="terms.html">Terms of Service</a></li>
            <li><a href="contact.html#faq">FAQ & Help Center</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} BookSaw. All rights reserved.</p>
        <div class="footer-bottom-currency">
          <span>⚡ Instant Digital Access • Multi-Currency Support</span>
        </div>
        <div class="footer-payment-methods">
          <span class="payment-badge">VISA</span>
          <span class="payment-badge">Mastercard</span>
          <span class="payment-badge">PayPal</span>
          <span class="payment-badge">Apple Pay</span>
          <span class="payment-badge">Stripe</span>
        </div>
      </div>
    </div>
  </footer>`;
}

function subscribeNewsletter(e) {
  e.preventDefault();
  const form = e.target;
  const input = form.querySelector('input[type="email"]');
  const btn = form.querySelector('button[type="submit"]');
  const email = input ? input.value.trim() : '';

  if (!email) return;

  const originalText = btn ? btn.textContent : 'Subscribe';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'Subscribing...';
  }

  setTimeout(() => {
    // Store in subscriber list
    try {
      const subs = JSON.parse(localStorage.getItem('bs_newsletter_subscribers') || '[]');
      if (!subs.includes(email)) subs.push(email);
      localStorage.setItem('bs_newsletter_subscribers', JSON.stringify(subs));
    } catch(err){}

    if (btn) {
      btn.innerHTML = '✓ Subscribed!';
      btn.style.background = '#2e7d32';
    }

    if (typeof showToast === 'function') {
      showToast(`🎉 Welcome to BookSaw! A 10% welcome coupon was sent to ${email}`, 'success');
    }

    setTimeout(() => {
      form.reset();
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.style.background = '';
      }
    }, 2500);
  }, 450);
}

function initPage(activePage = 'home') {
  // Initialize and auto-hide the global page loader
  if (typeof BSLoader !== 'undefined') BSLoader.init();

  // Never inject header or footer on auth pages (login / register)
  if (activePage === 'login' || activePage === 'register' || (typeof document !== 'undefined' && document.body && document.body.classList.contains('auth-page'))) {
    return;
  }

  // Inject header
  const headerPlaceholder = document.getElementById('page-header');
  if (headerPlaceholder) headerPlaceholder.innerHTML = getHeaderHTML(activePage);

  // Inject footer
  const footerPlaceholder = document.getElementById('page-footer');
  if (footerPlaceholder) footerPlaceholder.innerHTML = getFooterHTML();

  // Auto-initialize header systems
  if (typeof initHeader === 'function') initHeader();
  if (typeof initCurrencyUI === 'function') initCurrencyUI();
  if (typeof detectAndSetCurrency === 'function') detectAndSetCurrency();
  if (typeof updateCartBadge === 'function') updateCartBadge();
  if (typeof updateAuthUI === 'function') updateAuthUI();
  if (typeof initSearch === 'function') initSearch();
  if (typeof updateAllPrices === 'function') updateAllPrices();

  // Search toggle click
  var searchToggle = document.querySelector('.search-toggle');
  var headerWrap = document.getElementById('header-wrap');
  var searchBar = document.querySelector('.search-bar');
  if (searchToggle && headerWrap) {
    searchToggle.addEventListener('click', function(e) {
      e.preventDefault();
      var input = headerWrap.querySelector('.search-input');
      var query = (input ? input.value : '').trim();

      if (headerWrap.classList.contains('show') && query.length > 0) {
        window.location.href = 'shop.html?search=' + encodeURIComponent(query);
        return;
      }

      headerWrap.classList.toggle('show');
      if (searchBar) searchBar.classList.toggle('active');
      searchToggle.classList.toggle('active');

      if (input && headerWrap.classList.contains('show')) {
        setTimeout(function() { input.focus(); }, 100);
      } else {
        var dropdown = document.getElementById('search-results-dropdown');
        if (dropdown) dropdown.style.display = 'none';
      }
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.search-bar, .search-toggle, #search-results-dropdown')) {
        if (searchToggle) searchToggle.classList.remove('active');
        if (searchBar) searchBar.classList.remove('active');
        if (headerWrap) headerWrap.classList.remove('show');
        var dropdown = document.getElementById('search-results-dropdown');
        if (dropdown) dropdown.style.display = 'none';
      }
    });
  }
}
