export const isBrowserTestMode = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('__test') === '1';

export function exposeBrowserTestApi(api) {
  if (!isBrowserTestMode || typeof window === 'undefined') return;
  Object.assign(window, api);
}

export function removeBrowserTestApi(keys) {
  if (!isBrowserTestMode || typeof window === 'undefined') return;
  keys.forEach((key) => {
    try {
      delete window[key];
    } catch {}
  });
}
