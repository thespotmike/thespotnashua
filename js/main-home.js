/* ============================================================
   THE SPOT NASHUA - Homepage JavaScript
   ============================================================
   Loaded ONLY on index.html. Contains the hero slider and the
   reviews carousel - neither has any DOM presence on inner pages,
   so loading them sitewide was pure dead weight (~189 KiB unused
   JS flagged by Mobile PSI).
   ============================================================ */

'use strict';

/* -------------------------------------------------------
   HERO SLIDER
------------------------------------------------------- */
function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.slider-dot');
  const prev   = document.querySelector('.slider-arrow-prev');
  const next   = document.querySelector('.slider-arrow-next');

  if (!slides.length) return;

  let current = 0;
  let timer;
  // Respect prefers-reduced-motion: do not auto-advance.
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
  }

  function advance() { goTo(current + 1); }

  function startTimer() {
    clearInterval(timer);
    if (reducedMotion) return;
    timer = setInterval(advance, 8000);
  }

  goTo(0);
  startTimer();

  prev?.addEventListener('click', () => { goTo(current - 1); startTimer(); });
  next?.addEventListener('click', () => { goTo(current + 1); startTimer(); });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startTimer(); });
  });

  // Pause auto-advance when the tab is hidden (battery + cognitive load).
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      clearInterval(timer);
    } else {
      startTimer();
    }
  });
}

/* -------------------------------------------------------
   REVIEW CAROUSEL (Maps + Reviews combined section)
   - Auto-advances every 1500ms
   - Permanently stops on ANY user interaction (click, touch,
     keyboard, focus, hover >500ms) - never resumes.
   - Respects prefers-reduced-motion (no auto-advance).
   - Pauses on tab hidden; only resumes if user hasn't
     interacted yet.
------------------------------------------------------- */
function initReviewCarousel() {
  var viewport = document.querySelector('.review-carousel-viewport');
  var track = document.querySelector('.review-carousel-track');
  var cards = document.querySelectorAll('.review-card');
  var dotsContainer = document.querySelector('.review-dots');

  var prevBtn = document.querySelector('.review-nav-prev') || document.querySelector('.review-arrow-prev');
  var nextBtn = document.querySelector('.review-nav-next') || document.querySelector('.review-arrow-next');

  if (!track || !cards.length || !viewport) return;

  var currentIndex = 0;
  var autoTimer = null;
  var hoverTimer = null;
  var userInteracted = false; // permanent latch - once true, never auto-advance again
  var AUTO_INTERVAL_MS = 1500;
  var HOVER_INTERACTION_MS = 500;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var isGridLayout = !!document.querySelector('.maps-reviews-grid');

  var carouselColumn = document.querySelector('.review-carousel-column');
  var wrap = carouselColumn || document.querySelector('.review-carousel-wrap');

  // Visually-hidden live region for screen-reader announcements
  // ("Review 3 of 13") - separate from card aria-live so we control timing.
  var liveRegion = document.createElement('div');
  liveRegion.className = 'sr-only review-live-region';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
  if (wrap) wrap.appendChild(liveRegion);

  function getCardsPerView() {
    if (isGridLayout) return 1;
    var w = window.innerWidth;
    if (w <= 600) return 1;
    if (w <= 900) return 2;
    return 3;
  }

  function getMaxIndex() {
    var perView = getCardsPerView();
    return Math.max(0, cards.length - perView);
  }

  function updateTrack() {
    var perView = getCardsPerView();
    var cardWidthPercent = 100 / perView;

    for (var i = 0; i < cards.length; i++) {
      cards[i].style.flex = '0 0 ' + cardWidthPercent + '%';
    }

    var offset = -(currentIndex * cardWidthPercent);
    track.style.transform = 'translateX(' + offset + '%)';

    updateDots();
    announceCurrent();
  }

  function announceCurrent() {
    // Announce "Review X of Y" - only meaningful while auto-advancing
    // or after manual nav, but always safe to update.
    if (!liveRegion) return;
    var total = cards.length;
    var displayIndex = currentIndex + 1;
    liveRegion.textContent = 'Review ' + displayIndex + ' of ' + total;
  }

  function buildDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    var maxIdx = getMaxIndex();
    var totalDots = maxIdx + 1;

    for (var i = 0; i < totalDots; i++) {
      var dot = document.createElement('button');
      dot.className = 'review-dot' + (i === currentIndex ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to review ' + (i + 1));
      dot.dataset.index = i;
      dot.addEventListener('click', function() {
        handleUserInteraction();
        goTo(parseInt(this.dataset.index));
      });
      dotsContainer.appendChild(dot);
    }
  }

  function updateDots() {
    if (!dotsContainer) return;
    var dots = dotsContainer.querySelectorAll('.review-dot');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('active', i === currentIndex);
    }
  }

  function goTo(idx) {
    var maxIdx = getMaxIndex();
    currentIndex = Math.max(0, Math.min(idx, maxIdx));
    updateTrack();
  }

  function advance() {
    var maxIdx = getMaxIndex();
    if (currentIndex >= maxIdx) {
      goTo(0);
    } else {
      goTo(currentIndex + 1);
    }
  }

  function startAuto() {
    if (userInteracted || reducedMotion) return;
    stopAuto();
    autoTimer = setInterval(advance, AUTO_INTERVAL_MS);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // Single permanent stop. Called by every interaction handler.
  // Idempotent - safe to call repeatedly.
  function handleUserInteraction() {
    if (userInteracted) return;
    userInteracted = true;
    stopAuto();
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    // Turn off live-region announcements once user has control - 
    // they don't need screen-reader chatter on every manual nav.
    if (liveRegion) liveRegion.setAttribute('aria-live', 'off');
    // Detach the interaction listeners so they don't keep firing.
    detachInteractionListeners();
  }

  // ---- Interaction listeners (named so we can remove them) ----
  function onPrevClick() {
    handleUserInteraction();
    goTo(currentIndex - 1);
  }
  function onNextClick() {
    handleUserInteraction();
    goTo(currentIndex + 1);
  }
  function onKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleUserInteraction();
      goTo(currentIndex - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleUserInteraction();
      goTo(currentIndex + 1);
    }
  }
  function onTouchStart() {
    handleUserInteraction();
  }
  function onFocusIn() {
    handleUserInteraction();
  }
  function onMouseEnter() {
    if (userInteracted) return;
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(function() {
      handleUserInteraction();
    }, HOVER_INTERACTION_MS);
  }
  function onMouseLeave() {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  }

  function attachInteractionListeners() {
    if (prevBtn) prevBtn.addEventListener('click', onPrevClick);
    if (nextBtn) nextBtn.addEventListener('click', onNextClick);
    if (carouselColumn) carouselColumn.addEventListener('keydown', onKeyDown);
    if (viewport) viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    if (wrap) {
      wrap.addEventListener('mouseenter', onMouseEnter);
      wrap.addEventListener('mouseleave', onMouseLeave);
      wrap.addEventListener('focusin', onFocusIn);
    }
  }

  // After permanent stop: remove hover/focus/touch tripwires but
  // KEEP prev/next/keyboard so user retains manual control.
  function detachInteractionListeners() {
    if (viewport) viewport.removeEventListener('touchstart', onTouchStart);
    if (wrap) {
      wrap.removeEventListener('mouseenter', onMouseEnter);
      wrap.removeEventListener('mouseleave', onMouseLeave);
      wrap.removeEventListener('focusin', onFocusIn);
    }
    // prevBtn / nextBtn / keydown stay attached - they still navigate,
    // they just no longer need to call handleUserInteraction() (which
    // early-returns when userInteracted is already true, so it's a no-op).
  }

  attachInteractionListeners();

  // Handle resize
  var resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      if (currentIndex > getMaxIndex()) {
        currentIndex = getMaxIndex();
      }
      buildDots();
      updateTrack();
    }, 150);
  });

  // Pause auto-advance when tab is hidden. Only resume if user
  // hasn't interacted (startAuto self-guards on userInteracted +
  // reducedMotion, so no race on double-intervals).
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      stopAuto();
    } else {
      startAuto();
    }
  });

  // Init
  buildDots();
  updateTrack();
  startAuto(); // no-op if reducedMotion
}

/* -------------------------------------------------------
   INIT
------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function() {
  initHeroSlider();
  initReviewCarousel();
});
