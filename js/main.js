/* ============================================================
   THE SPOT NASHUA - Main JavaScript (site-wide)
   ============================================================
   Loaded on every page. Contains only site-wide functionality:
   nav, scroll animations, active-nav highlighting, newsletter float
   bar, nav subscribe scroll-to-footer, dynamic copyright year, and
   a conditional initDynamicCalendar() call (live-music.html only).

   Page-specific features have been moved to:
     - js/main-home.js   (hero slider + reviews carousel, index.html only)

   Contact and booking forms are now embedded Tally forms (no site-side
   JS handler). The footer/popup email-signup functions that used to
   post to a SaaS backend have been removed - initNewsletterFloat() and
   initNavSubscribe() remain but are currently unused (see INIT ALL).
   ============================================================ */

'use strict';

/* -------------------------------------------------------
   1. NAV - Hamburger + Overlay
------------------------------------------------------- */
function initNav() {
  const hamburger = document.querySelector('.hamburger');
  const overlay   = document.querySelector('.nav-overlay');
  const backdrop  = document.querySelector('.nav-overlay-backdrop');

  if (!hamburger || !overlay || !backdrop) return;

  function toggleNav(open) {
    hamburger.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      // Focus the first focusable element inside the overlay for keyboard users.
      const firstFocusable = overlay.querySelector('button, a');
      if (firstFocusable) firstFocusable.focus();
    } else {
      // Return focus to the hamburger when closing via keyboard.
      hamburger.focus();
    }
  }

  hamburger.addEventListener('click', () => toggleNav(!overlay.classList.contains('open')));
  backdrop.addEventListener('click', () => toggleNav(false));

  // Close button inside overlay
  const closeBtn = document.createElement('button');
  closeBtn.className = 'nav-overlay-close';
  closeBtn.setAttribute('aria-label', 'Close menu');
  closeBtn.type = 'button';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => toggleNav(false));
  overlay.insertBefore(closeBtn, overlay.firstChild);

  // Close overlay when a nav link is tapped
  overlay.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => toggleNav(false));
  });

  // Close overlay on Escape (no keyboard trap).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      toggleNav(false);
    }
  });
}

/* -------------------------------------------------------
   2. SCROLL ANIMATIONS (fade-in on scroll)
------------------------------------------------------- */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

/* -------------------------------------------------------
   3. ACTIVE NAV LINK highlight (mobile + desktop)
------------------------------------------------------- */
function setActiveNavLink() {
  const currentPath = window.location.pathname.replace(/\/(index\.html)?$/, '') || '/';
  document.querySelectorAll('.nav-overlay a, .desktop-nav a:not(.nav-cta):not(.nav-subscribe)').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href === '#' || href.includes('#')) return;
    const linkPath = new URL(href, window.location.href).pathname.replace(/\/(index\.html)?$/, '') || '/';
    if (linkPath === currentPath) {
      a.classList.add('active');
    }
  });
}

/* -------------------------------------------------------
   4. NEWSLETTER FLOATING CTA - carousel text
------------------------------------------------------- */
function initNewsletterFloat() {
  try { if (sessionStorage.getItem('spot_nl_dismissed')) return; } catch(e) {}
  const messages = ['Subscribe to our Newsletter', 'Live Music Events'];
  let idx = 0;

  const bar = document.createElement('div');
  bar.className = 'newsletter-float';
  bar.setAttribute('role', 'button');
  bar.setAttribute('aria-label', 'Subscribe to newsletter');

  bar.innerHTML =
    '<div class="newsletter-float-inner">' +
      '<svg class="newsletter-float-icon" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' +
      '<div class="newsletter-float-text"><span>' + messages[0] + '</span></div>' +
      '<span class="newsletter-float-arrow">↑</span>' +
      '<a href="https://www.google.com/maps/dir/?api=1&destination=217+Main+Street+Nashua+NH+03060" target="_blank" rel="noopener noreferrer" class="newsletter-float-maps" aria-label="Get directions to The Spot on Google Maps" title="Get Directions">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' +
      '</a>' +
    '</div>';

  var closeBtn = document.createElement('span');
  closeBtn.className = 'newsletter-float-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = 'cursor:pointer;font-size:18px;padding:0 8px;opacity:0.7;';
  closeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    bar.style.display = 'none';
    try { sessionStorage.setItem('spot_nl_dismissed', '1'); } catch(e) {}
  });
  bar.querySelector('.newsletter-float-inner').appendChild(closeBtn);

  document.body.appendChild(bar);

  bar.addEventListener('click', function(e) {
    if (e.target.closest('.newsletter-float-maps')) return;
    const signup = document.querySelector('.footer-signup');
    if (signup) {
      signup.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = signup.querySelector('input[type="email"]');
      if (input) setTimeout(function() { input.focus(); }, 600);
    }
  });

  function cycleText() {
    const textEl = bar.querySelector('.newsletter-float-text span');
    if (!textEl) return;
    textEl.classList.add('slide-up');
    setTimeout(function() {
      idx = (idx + 1) % messages.length;
      textEl.textContent = messages[idx];
      textEl.classList.remove('slide-up');
      textEl.classList.add('slide-down');
      // Use double rAF instead of a forced-reflow read (`void offsetWidth`)
      // to commit slide-down then transition off - eliminates a layout
      // thrash flagged by PSI.
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          textEl.classList.remove('slide-down');
        });
      });
    }, 500);
  }

  // Respect prefers-reduced-motion: skip the text cycle entirely for users
  // who request reduced motion.
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cycleTimer = reducedMotion ? null : setInterval(cycleText, 3500);

  document.addEventListener('visibilitychange', function() {
    // Pause newsletter text cycling when tab is hidden
    if (document.hidden) {
      clearInterval(cycleTimer);
      cycleTimer = null;
    } else {
      if (!cycleTimer && !reducedMotion) {
        cycleTimer = setInterval(cycleText, 3500);
      }
    }
  });
}

/* -------------------------------------------------------
   5. DYNAMIC COPYRIGHT YEAR
------------------------------------------------------- */
function updateCopyrightYear() {
  document.querySelectorAll('.footer-copyright').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/2024–\d{2}/, '2024–' + new Date().getFullYear().toString().slice(2));
  });
}

/* -------------------------------------------------------
   6. NAV SUBSCRIBE BUTTON - scrolls to footer signup
------------------------------------------------------- */
function initNavSubscribe() {
  document.querySelectorAll('.nav-subscribe').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var signup = document.querySelector('.footer-signup');
      if (signup) {
        signup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var input = signup.querySelector('input[type="email"]');
        if (input) setTimeout(function() { input.focus(); }, 600);
      }
    });
  });
}

/* -------------------------------------------------------
   7. LAZY-LOAD GOOGLE MAPS - IntersectionObserver swap
   -----------------------------------------------------
   PSI flagged ~188 KiB of unused Google Maps JS on first
   paint. Pages now ship a <div class="map-placeholder"
   data-map-embed="..."> instead of the iframe; we swap in
   the real iframe only when the placeholder enters the
   viewport (with a 300px head-start so the user never sees
   a blank box). Saves the full Maps JS payload for any
   session that doesn't scroll to the map.
------------------------------------------------------- */
function initLazyMaps() {
  const placeholders = document.querySelectorAll('[data-map-embed]');
  if (!placeholders.length) return;

  // Older browsers: fallback to immediate load (still better than nothing).
  if (typeof IntersectionObserver === 'undefined') {
    placeholders.forEach(swapInIframe);
    return;
  }

  function swapInIframe(el) {
    const src = el.getAttribute('data-map-embed');
    if (!src) return;
    const title = el.getAttribute('data-map-title') || 'Google Maps';
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title;
    iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    iframe.setAttribute('allowfullscreen', '');
    // If the placeholder has a border-radius inline, carry it onto the iframe
    // so the swap is visually seamless.
    const radius = el.style.borderRadius;
    if (radius) iframe.style.borderRadius = radius;
    el.innerHTML = '';
    el.appendChild(iframe);
  }

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      swapInIframe(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '300px' }); // start loading 300px before scrolling into view

  placeholders.forEach(function(p) { observer.observe(p); });
}

/* -------------------------------------------------------
   INIT ALL
------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('js-loaded');

  initNav();
  initScrollAnimations();
  // Newsletter feature suspended: initNewsletterFloat(), initNavSubscribe()
  // intentionally not called.
  setActiveNavLink();
  updateCopyrightYear();
  initLazyMaps();

  // Page-specific bundles register their own handlers on DOMContentLoaded
  // (see main-home.js).

  // Dynamic calendar only runs on live-music.html (where calendar.js is also
  // loaded). The function check keeps every other page from erroring.
  if (typeof initDynamicCalendar === 'function') initDynamicCalendar();
});
