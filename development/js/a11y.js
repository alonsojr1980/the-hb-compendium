/* a11y.js — live-region announcements and modal focus trapping. */

export function announce(msg) {
  const live = document.getElementById('live');
  if (live) live.textContent = msg;
}

/** Keep Tab focus cycling inside `container` while the modal is open. */
export function trapFocus(container, e) {
  if (!container || container.hidden || e.key !== 'Tab') return;
  const focusables = [...container.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])')];
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
