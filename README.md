# 장기 (한국 장기 웹앱)

AI와 대전하는 한국 장기(Korean Chess) 웹앱입니다. **서버가 전혀 필요 없고**, 모든
게임 로직과 AI가 브라우저 안에서 실행됩니다. 안드로이드 크롬 / 아이폰 사파리에서
바로 열 수 있고, 홈 화면에 추가하면 앱처럼 쓸 수 있습니다 (PWA).

- React + Vite + TypeScript (빌드 결과는 순수 정적 파일)
- 장기 규칙 검증은 자체 구현 (행마, 장군/외통, 빅장 판정)
- AI는 **Fairy-Stockfish (WebAssembly)** 를 UCI로 구동. 로드 실패 시
  자체 미니맥스 AI로 자동 폴백
- 모바일 터치 UI, 오프라인 지원(Service Worker)

## 아키텍처: 규칙 검증과 AI 분리

- **규칙/합법수 판정**: `src/engine/`의 자체 코드(`moves.ts`, `game.ts` 등)가
  담당합니다. 엔진이 낸 수도 우리 합법수 목록으로 검증한 뒤에만 둡니다.
- **수 선택(AI)**: Fairy-Stockfish WASM 엔진(`fairyEngine.ts`). 우리 보드를
  Janggi FEN으로 변환(`fen.ts`)해 넘기고, 엔진의 bestmove를 우리 좌표로
  역변환합니다.
- 엔진이 로드되지 않는 환경에서는 기존 자체 AI(`ai.ts`)가 그대로 동작합니다.

## SharedArrayBuffer / COOP·COEP

Fairy-Stockfish WASM은 멀티스레드로 동작하며 `SharedArrayBuffer`가 필요합니다.
이는 다음 HTTP 헤더가 있어야 활성화됩니다.

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

GitHub Pages는 커스텀 헤더를 설정할 수 없으므로, **서비스 워커(`public/sw.js`)가
응답에 이 헤더를 삽입**해 브라우저를 cross-origin-isolated 상태로 만듭니다.
(첫 로드 시 한 번 자동 새로고침될 수 있습니다.) 로컬 dev/preview 서버는
`vite.config.ts`에서 헤더를 직접 보냅니다.

만약 이 방식이 특정 브라우저에서 동작하지 않으면 엔진 로드가 실패하고 자체 AI로
폴백하므로 게임은 항상 정상 동작합니다.

## 로컬에서 실행

```bash
npm install
npm run dev      # WASM 복사(predev) 후 dev 서버 (COOP/COEP 헤더 포함)
npm run build    # WASM 복사(prebuild) 후 정적 빌드 → dist/
npm run preview  # 빌드 결과 미리보기 (COOP/COEP 헤더 포함)
```

엔진 WASM 아티팩트(`public/engine/`)는 `scripts/copy-wasm.mjs`가
`node_modules`에서 복사하며 커밋되지 않습니다.

## 배포 (Cloudflare Pages)

배포는 **Cloudflare Pages**를 사용합니다. `_headers`로 진짜 COOP/COEP
헤더를 보낼 수 있어 사파리 등에서 엔진(SharedArrayBuffer)이 안정적으로 동작합니다.
(GitHub Pages는 헤더를 못 넣어 사용하지 않습니다.)

**Cloudflare Pages 설정**
1. Cloudflare Pages에서 이 GitHub 저장소를 연결 (퍼블릭·프라이빗 모두 가능)
2. **Build command**: `npm run build:cf`
3. **Build output directory**: `dist`
4. `main`에 push → 자동 빌드·배포 → `https://<프로젝트>.pages.dev` 접속

> `npm run build:cf`는 base를 `/`(루트)로 빌드합니다. GitHub Pages처럼 하위
> 경로에 올릴 때만 `APP_BASE=/저장소이름/`로 빌드하세요.

`public/_headers`가 COOP/COEP 헤더를 지정하므로, Cloudflare에서는 서비스
워커의 헤더 삽입 없이도 cross-origin isolation이 적용됩니다.

## 모바일에서 앱처럼 쓰기
- **아이폰(사파리)**: 공유 → "홈 화면에 추가"
- **안드로이드(크롬)**: 메뉴(⋮) → "홈 화면에 추가" / "앱 설치"

## 프로젝트 구조
```
src/
  engine/
    types.ts, board.ts, moves.ts, game.ts   # 장기 규칙 검증 (자체)
    fen.ts          # 보드 <-> Janggi FEN / UCI 변환
    fairyEngine.ts  # Fairy-Stockfish WASM UCI 어댑터
    notation.ts, score.ts   # 기보 표기 / 점수 계산
  Board.tsx, SetupScreen.tsx, CapturedTray.tsx, GameRecord.tsx  # UI
  InAppNotice.tsx, inapp.ts # 인앱 브라우저 감지/안내
  App.tsx           # 게임 상태/흐름
public/
  _headers          # Cloudflare COOP/COEP 헤더
  sw.js             # COOP/COEP 헤더 삽입(폴백) + 오프라인 캐시
  engine/           # (생성물) Fairy-Stockfish WASM
scripts/copy-wasm.mjs             # WASM 아티팩트 복사
scripts/gen-icons.mjs             # 앱 아이콘 생성
```

## 라이선스

이 프로젝트는 **GPL-3.0-or-later** 라이선스입니다 (`LICENSE` 참고).

사용하는 엔진/규칙 라이브러리가 GPL-3.0이기 때문에, 이를 결합한 앱 전체가
GPL-3.0로 배포됩니다.

- [Fairy-Stockfish](https://github.com/fairy-stockfish/Fairy-Stockfish) 및
  `fairy-stockfish-nnue.wasm` — GPL-3.0
- 강한 NNUE 신경망(`janggi-*.nnue`)은 이 저장소에 재배포하지 않습니다. 필요 시
  Fairy-Stockfish NNUE 배포처에서 받아 사용할 수 있습니다.
- `public/sw.js`의 COOP/COEP 헤더 삽입 로직은
  [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) (MIT)를
  참고했습니다.

연동 방식은 [Brighthan99/korean-chess-stockfish](https://github.com/Brighthan99/korean-chess-stockfish)
프로젝트의 접근을 참고했습니다. (내용은 라이선스 준수를 위해 재구성)
