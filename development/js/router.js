/* router.js — hash routing: #/ , #/category/:id , #/item/:id */

export function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [kind, value] = hash.split('/');
  return { kind: kind || 'home', value: value || '' };
}

export function navigate(hash) {
  if (location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
}

export function onRoute(handler) {
  window.addEventListener('hashchange', () => handler(parseRoute()));
}
