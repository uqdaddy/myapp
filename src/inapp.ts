// Detecting in-app browsers (KakaoTalk etc.) and trying to escape to a real
// browser. In-app webviews typically block SharedArrayBuffer, so the WASM
// engine can't run there — we must get the user into Safari/Chrome.

export type Platform = 'android' | 'ios' | 'other';

export function platform(): Platform {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'other';
}

// True for KakaoTalk / Facebook / Instagram / Line / Naver / Daum / generic
// Android WebView in-app browsers.
export function isInAppBrowser(): boolean {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /KAKAOTALK|FBAN|FBAV|FB_IAB|Instagram|Line\/|NAVER\(inapp|DaumApps|; wv\)/i.test(ua);
}

export function isKakaoInApp(): boolean {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /KAKAOTALK/i.test(ua);
}

// Attempt to leave the in-app browser for the device's real browser.
// Returns true if an escape was attempted (Android only; iOS has no reliable
// programmatic escape, so it returns false and the UI shows guidance).
export function tryEscapeInApp(): boolean {
  if (typeof window === 'undefined') return false;
  const url = window.location.href;
  const p = platform();

  if (isKakaoInApp() && p === 'android') {
    // KakaoTalk-specific scheme: open the URL in the external default browser.
    window.location.href =
      'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
    return true;
  }

  if (p === 'android') {
    // Generic Android: use an intent URL to open Chrome with the current page.
    const noScheme = url.replace(/^https?:\/\//, '');
    window.location.href =
      'intent://' +
      noScheme +
      '#Intent;scheme=https;package=com.android.chrome;end';
    return true;
  }

  // iOS in-app webviews cannot be escaped programmatically.
  return false;
}
