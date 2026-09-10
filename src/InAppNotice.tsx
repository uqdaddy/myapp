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
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="inapp">
      <div className="inapp-card">
        <h1 className="inapp-title">장기</h1>
        <p className="inapp-msg">
          지금은 <b>카카오톡 앱 안의 브라우저</b>로 열려 있어요. 여기서는 AI 엔진이
          동작하지 않습니다. <b>사파리나 크롬</b>에서 열어주세요.
        </p>

        {p === 'android' ? (
          <>
            <button className="btn primary inapp-btn" onClick={() => tryEscapeInApp()}>
              외부 브라우저로 열기
            </button>
            <p className="inapp-hint">
              자동으로 안 열리면, 오른쪽 위 <b>⋮</b> 메뉴 → <b>“다른 브라우저로 열기”</b>를
              선택하세요.
            </p>
          </>
        ) : (
          <>
            <p className="inapp-hint">
              오른쪽 아래(또는 위)의 <b>공유/메뉴 아이콘</b>을 누른 뒤{' '}
              <b>“Safari로 열기”</b>를 선택하세요.
            </p>
            <button className="btn inapp-btn" onClick={copyUrl}>
              {copied ? '주소가 복사됐어요' : '주소 복사하기'}
            </button>
            <p className="inapp-hint">주소를 복사해 Safari 주소창에 붙여넣어도 됩니다.</p>
          </>
        )}

        <div className="inapp-url">{url}</div>
      </div>
    </div>
  );
}
