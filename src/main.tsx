import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RootApp from './RootApp';
import './styles.css';

// The service worker is registered early in index.html (it injects COOP/COEP
// headers for the WASM engine and provides offline caching), so we don't
// register it again here.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>
);
