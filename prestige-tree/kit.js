/* ===== Kit extras: live open/closed status from Google hours, today's row highlight. =====
   SITE.periods = Places API regularOpeningHours.periods (day 0 = Sunday). */
(() => {
  'use strict';
  const S = window.SITE || {};
  const periods = S.periods || [];
  if (!periods.length) return;

  // Current time in New York, independent of the visitor's timezone
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
    .formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const now = day * 1440 + (+parts.hour % 24) * 60 + +parts.minute;
  const fmt = m => { const h = Math.floor(m / 60) % 24, mm = m % 60; return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`; };

  let open = false, label = 'Closed now';
  if (periods.length === 1 && !periods[0].close) { open = true; label = 'Open 24 hours'; }
  else {
    for (const p of periods) {
      if (!p.open || !p.close) continue;
      let a = p.open.day * 1440 + p.open.hour * 60 + (p.open.minute || 0);
      let b = p.close.day * 1440 + p.close.hour * 60 + (p.close.minute || 0);
      if (b <= a) b += 7 * 1440;
      for (const n of [now, now + 7 * 1440]) if (n >= a && n < b) { open = true; label = `Open now · until ${fmt(b % 1440)}`; }
    }
    if (!open) {
      // next opening time
      const starts = periods.filter(p => p.open).map(p => p.open.day * 1440 + p.open.hour * 60 + (p.open.minute || 0)).map(s => s <= now ? s + 7 * 1440 : s).sort((x, y) => x - y);
      if (starts.length) {
        const s = starts[0], sameDay = Math.floor(s / 1440) % 7 === day && s < now + 1440;
        label = `Closed · opens ${sameDay ? '' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Math.floor(s / 1440) % 7] + ' '}${fmt(s % 1440)}`;
      }
    }
  }
  document.querySelectorAll('[data-open-status]').forEach(el => {
    el.hidden = false;
    el.classList.toggle('open', open);
    el.querySelector('.label').textContent = label;
  });
  document.querySelectorAll('.hours tr[data-day]').forEach(tr => tr.classList.toggle('today', +tr.dataset.day === day));
})();
