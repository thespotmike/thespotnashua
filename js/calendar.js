'use strict';

/* ============================================================
   THE SPOT NASHUA - Dynamic Calendar Renderer
   ============================================================
   Reads event data from window.SPOT_EVENTS (set by calendar-data.js)
   and renders monthly calendar grids with prev/next navigation.

   Called from DOMContentLoaded in main.js:
     initDynamicCalendar();
   ============================================================ */

/**
 * Event type keys mapped to display labels for calendar tags.
 */
var CALENDAR_TYPE_LABELS = {
  'open-mic':   'Open Mic',
  'dj':         'DJ',
  'trivia':     'Trivia',
  'karaoke':    'Karaoke',
  'acoustic':   'Acoustic',
  'comedy':     'Comedy',
  'sound-bath': 'Sound Bath',
  'poetry':     'Poetry',
  'live-band':  'Live Band',
  'special':    'Special'
};

/**
 * Month names for title display.
 */
var CALENDAR_MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

/**
 * Day-of-week header labels (Sunday-first).
 */
var CALENDAR_DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// (Removed CALENDAR_WEEKLY_RECURRING on 2026-05-01.)
// Same lesson as the menu: hardcoding the weekly Mon–Thu recurring events
// here meant the calendar showed events even when Mike had nothing entered,
// AND any event he typed got rendered alongside a duplicate hardcoded copy.
// As of 2026-08-10 Mike's Google Calendar (see js/calendar-data.js) is the
// single source of truth - if a weekly Open Mic should show up, Mike adds
// a recurring event in Google Calendar.

/**
 * Zero-pad a number to two digits.
 */
function calPad(n) {
  return n < 10 ? '0' + n : '' + n;
}

/**
 * Escape HTML before innerHTML interpolation. Mirrors the helper used by
 * `pages/menu.html`'s inline fetcher. Without this, any tenant-supplied
 * event title (Mike's dashboard input) becomes a stored-XSS sink the
 * moment it's rendered in `calBuildMonth` via the `.innerHTML` write
 * downstream - and CSP `'unsafe-inline'` does not block onerror handlers.
 */
function calEsc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/**
 * Format a date as 'YYYY-MM-DD' for lookup in SPOT_EVENTS.
 */
function calDateKey(year, month, day) {
  return year + '-' + calPad(month + 1) + '-' + calPad(day);
}

/**
 * Get the number of days in a given month (0-indexed month).
 */
function calDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the day-of-week the first of the month falls on (0 = Sunday).
 */
function calFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

/**
 * Get the display label for an event chip.
 * Prefers the event's actual name (what Mike typed in his dashboard) so
 * a custom event titled "Beer Pong Tournament" doesn't get rewritten as
 * the bland type label. Falls back to the type label, then "Event".
 */
function calEventLabel(event) {
  if (event.name && String(event.name).trim()) return event.name;
  if (event.type && CALENDAR_TYPE_LABELS[event.type]) {
    return CALENDAR_TYPE_LABELS[event.type];
  }
  return 'Event';
}

/**
 * Build the HTML string for a single month's calendar.
 *
 * @param {number} year       - Full year (e.g. 2026)
 * @param {number} month      - Zero-indexed month (0 = January)
 * @param {string} theme      - 'cal-dark' or 'cal-light'
 * @param {Object} eventsData - The window.SPOT_EVENTS object
 * @returns {string} HTML string for the full month section
 */
function calBuildMonth(year, month, theme, eventsData) {
  var today = new Date();
  var todayYear = today.getFullYear();
  var todayMonth = today.getMonth();
  var todayDate = today.getDate();

  var daysInMonth = calDaysInMonth(year, month);
  var firstDow = calFirstDayOfWeek(year, month);
  var monthName = CALENDAR_MONTH_NAMES[month];
  var isDark = theme === 'cal-dark';

  // Determine if a given day is in the past
  // A day is past if it's before today (not including today)
  function isDayPast(day) {
    var cellDate = new Date(year, month, day);
    var todayStart = new Date(todayYear, todayMonth, todayDate);
    return cellDate < todayStart;
  }

  function isDayToday(day) {
    return year === todayYear && month === todayMonth && day === todayDate;
  }

  // Section background
  var sectionBg = isDark ? '#0a0a0a' : '#fff';
  var titleColor = isDark ? 'var(--silver-primary)' : 'var(--dark-deep)';
  var subtitleColor = isDark ? 'rgba(255,255,255,0.6)' : 'var(--text-body)';

  var html = '';

  // Wave divider between months
  if (isDark) {
    html += '<div class="wave-divider" style="background:#fff;">';
    html += '<svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">';
    html += '<path d="M0,40 C360,0 1080,80 1440,40 L1440,80 L0,80 Z" fill="#0a0a0a"/>';
    html += '</svg></div>';
  } else {
    html += '<div class="wave-divider" style="background:#0a0a0a;">';
    html += '<svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">';
    html += '<path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#ffffff"/>';
    html += '</svg></div>';
  }

  // Section open
  var sectionId = CALENDAR_MONTH_NAMES[month].toLowerCase() + '-events';
  html += '<section id="' + sectionId + '" style="background:' + sectionBg + ';padding:60px 0;">';
  html += '<div class="container">';

  // Title
  html += '<h2 style="font-family:\'Norwester\',sans-serif;font-size:clamp(32px,5vw,56px);color:' + titleColor + ';text-align:center;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;" class="animate-on-scroll">';
  html += monthName + ' ' + year;
  html += '</h2>';

  // Subtitle
  html += '<p style="text-align:center;color:' + subtitleColor + ';font-family:\'Roboto Condensed\',sans-serif;font-size:16px;margin-bottom:30px;" class="animate-on-scroll">';
  html += '217 Main Street &bull; Nashua, NH &bull; All Shows Free Entry';
  html += '</p>';

  // Calendar grid
  html += '<div class="cal-grid ' + theme + ' animate-on-scroll">';

  // Day-of-week headers
  for (var h = 0; h < CALENDAR_DAY_HEADERS.length; h++) {
    html += '<div class="cal-day-header">' + CALENDAR_DAY_HEADERS[h] + '</div>';
  }

  // Empty cells before the 1st
  for (var e = 0; e < firstDow; e++) {
    html += '<div class="cal-cell-empty"></div>';
  }

  // Day cells
  for (var d = 1; d <= daysInMonth; d++) {
    var dateKey = calDateKey(year, month, d);
    var cellDow = new Date(year, month, d).getDay();

    // All events come from Mike's dashboard via the SaaS - no hardcoded
    // recurring fallbacks (see header comment).
    var dayEvents = (eventsData[dateKey] || []).slice();

    var hasEvent = dayEvents.length > 0;
    var past = isDayPast(d);
    var isToday = isDayToday(d);

    // Build class list
    var cellClasses = 'cal-cell';
    if (hasEvent) cellClasses += ' has-event';
    if (past) cellClasses += ' cal-past';
    if (isToday) cellClasses += ' cal-today';

    // Inline opacity for past days (cal-past has no CSS rule yet)
    var cellStyle = past ? ' style="opacity:0.5"' : '';

    html += '<div class="' + cellClasses + '"' + cellStyle + '>';
    html += '<div class="cal-cell-num">' + d + '</div>';

    // Render events for this day. Both label and time MUST be escaped - 
    // they originate in Mike's dashboard and are user-controlled.
    for (var ev = 0; ev < dayEvents.length; ev++) {
      var event = dayEvents[ev];
      html += '<div class="cal-event-tag">' + calEsc(calEventLabel(event)) + '</div>';
      if (event.time) {
        html += '<div class="cal-event-time">' + calEsc(event.time) + '</div>';
      }
    }

    // Per-cell Book CTAs removed (2026-05-14). The permanent Book-a-Band
    // CTA elsewhere on the page replaces them so the calendar reads as a
    // pure programming display, not a sales surface on every day.

    html += '</div>';
  }

  // Empty cells after the last day to fill out the final week
  var totalCells = firstDow + daysInMonth;
  var trailing = totalCells % 7;
  if (trailing > 0) {
    for (var t = 0; t < 7 - trailing; t++) {
      html += '<div class="cal-cell-empty"></div>';
    }
  }

  html += '</div>'; // .cal-grid
  html += '</div>'; // .container
  html += '</section>';

  return html;
}

/**
 * Compute a year/month pair from a base date + month offset.
 */
function calGetMonthYear(baseYear, baseMonth, monthOffset) {
  var m = baseMonth + monthOffset;
  var y = baseYear;
  while (m > 11) { m -= 12; y++; }
  while (m < 0) { m += 12; y--; }
  return { month: m, year: y };
}

/**
 * Main entry point. Renders dynamic calendars into #dynamic-calendars
 * with prev/next navigation to browse months.
 */
function initDynamicCalendar() {
  var container = document.getElementById('dynamic-calendars');
  if (!container) return;

  var eventsData = window.SPOT_EVENTS;
  if (!eventsData || typeof eventsData !== 'object') {
    eventsData = {};
  }

  var now = new Date();
  var baseYear = now.getFullYear();
  var baseMonth = now.getMonth();
  // If we're in the last few days of the month, the dwindling tail of the
  // current month doesn't add value - push the default view forward by one
  // month so visitors see the upcoming month + the one after that.
  var offset = now.getDate() > 27 ? 1 : 0;

  function render() {
    var m1 = calGetMonthYear(baseYear, baseMonth, offset);
    var m2 = calGetMonthYear(baseYear, baseMonth, offset + 1);

    var html = '';
    html += calBuildMonth(m1.year, m1.month, 'cal-dark', eventsData);
    html += calBuildMonth(m2.year, m2.month, 'cal-light', eventsData);

    // Month navigation bar
    html += '<div class="cal-nav">';
    if (offset > 0) {
      html += '<button id="cal-nav-prev" class="cal-nav-btn">';
      html += '<span class="cal-nav-arrow">&#8249;</span> Previous Months';
      html += '</button>';
    }
    html += '<button id="cal-nav-next" class="cal-nav-btn">';
    html += 'Next Months <span class="cal-nav-arrow">&#8250;</span>';
    html += '</button>';
    html += '</div>';

    container.innerHTML = html;

    // Wire up navigation
    var prevBtn = document.getElementById('cal-nav-prev');
    var nextBtn = document.getElementById('cal-nav-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        if (offset > 0) {
          offset--;
          render();
          var firstSection = container.querySelector('section');
          if (firstSection) firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        offset++;
        render();
        var firstSection = container.querySelector('section');
        if (firstSection) firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    // Update hero month buttons
    var btnContainer = document.getElementById('calendar-month-btns');
    if (btnContainer) {
      var name1 = CALENDAR_MONTH_NAMES[m1.month] + ' ' + m1.year;
      var name2 = CALENDAR_MONTH_NAMES[m2.month] + ' ' + m2.year;
      var id1 = CALENDAR_MONTH_NAMES[m1.month].toLowerCase() + '-events';
      var id2 = CALENDAR_MONTH_NAMES[m2.month].toLowerCase() + '-events';
      btnContainer.innerHTML =
        '<a href="#' + id1 + '" class="btn btn-teal" style="font-size:14px;padding:10px 24px;">' + name1 + '</a> ' +
        '<a href="#' + id2 + '" class="btn btn-teal" style="font-size:14px;padding:10px 24px;background:transparent;border:1.5px solid var(--silver-primary);color:var(--silver-primary);">' + name2 + '</a>';
    }

    // Re-observe scroll animations for dynamically inserted content
    if (typeof IntersectionObserver !== 'undefined') {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      var animatedEls = container.querySelectorAll('.animate-on-scroll');
      for (var i = 0; i < animatedEls.length; i++) {
        observer.observe(animatedEls[i]);
      }
    }
  }

  render();
}
