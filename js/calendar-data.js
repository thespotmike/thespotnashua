/**
 * The Spot - Calendar Event Data (LIVE, Google Calendar)
 * ================================
 *
 * As of 2026-08-10, events are managed directly in Google Calendar (Mike's
 * old SaaS dashboard is fully retired - booking and contact forms are now
 * embedded Tally forms, and newsletter signup was already suspended in
 * js/main.js).
 *
 * Mike creates/edits events on the calendar identified by
 * window.SPOT_GCAL.calendarId, and tags each event's *type* (Open Mic, DJ,
 * Trivia, ...) by setting the event's color in Google Calendar. See
 * GCAL_COLOR_TYPE below for the color -> type legend.
 *
 * This file:
 *   1. Sets `window.SPOT_EVENTS = {}` synchronously so calendar.js doesn't
 *      crash on first render.
 *   2. Fetches events from the Google Calendar API, maps each event's
 *      colorId to an internal type key, groups by date, and populates
 *      `window.SPOT_EVENTS` (same shape calendar.js has always expected:
 *      { 'YYYY-MM-DD': [{ name, type, time }] }).
 *   3. Dispatches `spot-events-loaded` and re-renders via
 *      initDynamicCalendar() (calendar.js is unchanged).
 *   4. Injects Event/MusicEvent JSON-LD into <head> for upcoming events.
 */

(function () {
  window.SPOT_EVENTS = window.SPOT_EVENTS || {};

  if (!window.SPOT_GCAL || !window.SPOT_GCAL.calendarId || !window.SPOT_GCAL.apiKey) {
    console.warn('[spot-events] window.SPOT_GCAL not set; cannot fetch live events');
    return;
  }

  /**
   * Google Calendar event colorId -> our internal event type key.
   * Mike sets an event's color (Calendar's color picker) to tag its type:
   *   1  Lavender  -> sound-bath
   *   2  Sage      -> acoustic
   *   3  Grape     -> live-band
   *   4  Flamingo  -> comedy
   *   5  Banana    -> trivia
   *   6  Tangerine -> karaoke
   *   7  Peacock   -> dj
   *   8  Graphite  -> (spare, unmapped)
   *   9  Blueberry -> poetry
   *   10 Basil     -> open-mic
   *   11 Tomato    -> special
   * An event left on the calendar's default color has no type key; it
   * still renders (title only, no type tag) and falls back to a plain
   * schema.org Event for JSON-LD.
   */
  var GCAL_COLOR_TYPE = {
    '1': 'sound-bath',
    '2': 'acoustic',
    '3': 'live-band',
    '4': 'comedy',
    '5': 'trivia',
    '6': 'karaoke',
    '7': 'dj',
    '9': 'poetry',
    '10': 'open-mic',
    '11': 'special'
  };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // Map our internal event types to schema.org class names.
  // Music-leaning programming gets MusicEvent; everything else falls back to Event.
  function ldEventType(type) {
    var music = ['open-mic', 'dj', 'acoustic', 'live-band', 'karaoke', 'poetry'];
    return music.indexOf(type) !== -1 ? 'MusicEvent' : 'Event';
  }

  // Format 24h "HH:MM" into a friendly 12h display string, e.g. "7:00 PM".
  function fmtTime12(hhmm) {
    var parts = hhmm.split(':');
    var h = parseInt(parts[0], 10);
    var min = parts[1];
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ':' + min + ' ' + ampm;
  }

  // The Spot is in America/New_York. DST in 2026: Mar 8 to Nov 1. Only used
  // as a fallback for all-day events (no dateTime, so no offset to read).
  function nyTzOffset(dateStr) {
    var parts = dateStr.split('-');
    var mo = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (mo > 3 && mo < 11) return '-04:00';           // Apr-Oct
    if (mo === 3 && d >= 8) return '-04:00';           // Mar 8+
    return '-05:00';
  }

  // Pull { date: 'YYYY-MM-DD', time: 'HH:MM'|null } out of a Calendar API
  // event's start object.
  function startParts(ev) {
    if (ev.start && ev.start.dateTime) {
      // dateTime carries its own UTC offset, e.g. "2026-08-14T19:00:00-04:00" -
      // the date/time before the offset IS local Nashua time already, no
      // timezone math needed.
      var dt = ev.start.dateTime;
      return { date: dt.slice(0, 10), time: dt.slice(11, 16) };
    }
    if (ev.start && ev.start.date) {
      return { date: ev.start.date, time: null };
    }
    return null;
  }

  // Build a single JSON-LD event object from a Calendar API event.
  function buildEventLd(e, type) {
    var startDate, endDate;
    if (e.start.dateTime && e.end && e.end.dateTime) {
      startDate = e.start.dateTime;
      endDate = e.end.dateTime;
    } else {
      var d = e.start.date || (e.end && e.end.date);
      var tz = nyTzOffset(d);
      startDate = d + 'T19:00:00' + tz;
      endDate = d + 'T22:00:00' + tz;
    }

    var title = e.summary || 'Event';

    return {
      '@context': 'https://schema.org',
      '@type': ldEventType(type),
      'name': title + ' at The Spot',
      'description': e.description ||
        (title + ' at The Spot Kava Bar & Music in downtown Nashua, NH. Free entry.'),
      'startDate': startDate,
      'endDate': endDate,
      'eventStatus': 'https://schema.org/EventScheduled',
      'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
      'isAccessibleForFree': true,
      'location': {
        '@type': 'BarOrPub',
        'name': 'The Spot Kava Bar & Music',
        'url': 'https://thespotnashua.com',
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': '217 Main Street',
          'addressLocality': 'Nashua',
          'addressRegion': 'NH',
          'postalCode': '03060',
          'addressCountry': 'US'
        }
      },
      'organizer': {
        '@type': 'Organization',
        'name': 'The Spot Kava Bar & Music',
        'url': 'https://thespotnashua.com'
      },
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD',
        'availability': 'https://schema.org/InStock',
        'validFrom': startDate,
        'url': 'https://thespotnashua.com/pages/live-music.html'
      }
    };
  }

  // Build a YYYY-MM-DD string for "today" so we can filter out past events
  // before emitting them as schema. Past-dated Event JSON-LD is a Google
  // policy violation.
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // Inject Event JSON-LD for upcoming events into <head>. Idempotent: removes
  // any prior injection before adding the new one.
  function injectEventsJsonLd(ldEvents) {
    if (!ldEvents || !ldEvents.length) return;

    var existing = document.getElementById('spot-events-jsonld');
    if (existing) existing.parentNode.removeChild(existing);

    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'spot-events-jsonld';
    s.textContent = JSON.stringify(ldEvents);
    document.head.appendChild(s);
  }

  var today = new Date();
  var timeMin = new Date(today.getTime() - 30 * 86400000).toISOString();
  var timeMax = new Date(today.getTime() + 365 * 86400000).toISOString();

  var url = 'https://www.googleapis.com/calendar/v3/calendars/' +
    encodeURIComponent(window.SPOT_GCAL.calendarId) + '/events' +
    '?key=' + encodeURIComponent(window.SPOT_GCAL.apiKey) +
    '&timeMin=' + encodeURIComponent(timeMin) +
    '&timeMax=' + encodeURIComponent(timeMax) +
    '&singleEvents=true&orderBy=startTime&maxResults=250';

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('events fetch failed: ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var items = data.items || [];
      var cutoff = todayStr();
      var byDate = {};
      var ldEvents = [];

      for (var i = 0; i < items.length; i++) {
        var ev = items[i];
        if (ev.status === 'cancelled') continue;

        var parts = startParts(ev);
        if (!parts) continue;

        var type = ev.colorId ? GCAL_COLOR_TYPE[ev.colorId] : null;

        if (!byDate[parts.date]) byDate[parts.date] = [];
        byDate[parts.date].push({
          name: ev.summary || 'Event',
          type: type,
          time: parts.time ? fmtTime12(parts.time) : null
        });

        if (parts.date >= cutoff && ldEvents.length < 50) {
          ldEvents.push(buildEventLd(ev, type));
        }
      }

      window.SPOT_EVENTS = byDate;

      try { injectEventsJsonLd(ldEvents); } catch (e) { console.warn('[spot-events] ld inject failed', e); }

      try {
        window.dispatchEvent(new CustomEvent('spot-events-loaded', { detail: byDate }));
        if (typeof initDynamicCalendar === 'function') {
          initDynamicCalendar();
        }
      } catch (err) {
        console.warn('[spot-events] re-render failed', err);
      }
    })
    .catch(function (err) {
      console.warn('[spot-events]', err);
    });
})();
