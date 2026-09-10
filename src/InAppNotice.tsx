import { useEffect, useState } from 'react';
import { platform, tryEscapeInApp } from './inapp';

// Shown when the app is opened inside an in-app browser (e.g. KakaoTalk), where
// the WASM engine can't run. On Android we try to jump to the real browser
// automatically; on iOS we guide the user to do it manually.
export function InAppNotice() {
  const [copied, setCopied] = useState(false);
  const p = platform();
  const url = typeof window !== 'undefined' ? window.location.href : '';

  // Try to auto-escape once on mount (Android only).
  useEffect(() => {
    tryEscapeInApp();
  }, []);

  const copyUrl = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Fallback for browsers without clipboard API: select the URL text so the
      // user can copy it manually.
      const el = document.getElementById('inapp-url-text');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="inapp">
      <div className="inapp-card">
        <h1 className="inapp-title">장기</h1>
        <p className="inapp-msg">
          카카오톡 안에서는 AI 엔진이 동작하지 않아요.
          <br />
          <b>사파리나 크롬에서 열어야</b> 합니다.
        </p>

        {p === 'android' ? (
          <>
            <button className="btn primary inapp-btn" onClick={() => tryEscapeInApp()}>
              외부 브라우저로 열기
            </button>
            <p className="inapp-hint">
              버튼을 눌러도 안 열리면, 오른쪽 위 <b>⋮</b> → <b>“다른 브라우저로 열기”</b>
            </p>
          </>
        ) : (
          <>
            {/* Primary path on iOS Kakao in-app browser: bottom share -> Safari.
                This opens THIS page directly in Safari; no copy/paste needed. */}
            <div className="inapp-primary">
              <div className="inapp-primary-title">사파리로 여는 방법</div>
              <ol className="inapp-steps">
                <li>
                  이 화면 <b>오른쪽 아래의 공유 아이콘</b>
                  <span className="inapp-icon">⬆️</span>을 누르세요
                </li>
                <li>
                  메뉴에서 <b>“Safari로 열기”</b>를 선택하면 이 페이지가 바로 열립니다
                </li>
              </ol>
            </div>

            {/* Fallback: copy the URL and paste into Safari manually. */}
            <p className="inapp-hint">위 방법이 안 되면 주소를 복사해 사파리에 붙여넣으세요.</p>
            <button className="btn inapp-btn" onClick={copyUrl}>
              {copied ? '✓ 주소가 복사됐어요' : '주소 복사하기'}
            </button>
          </>
        )}

        <div className="inapp-url" id="inapp-url-text">
          {url}
        </div>
      </div>
    </div>
  );
}
