# 장기 · Janggi (한국 장기 웹앱)

AI와 대전하는 한국 장기(Korean Chess) 웹앱입니다. **서버가 전혀 필요 없고**, 모든
게임 로직과 AI가 브라우저 안에서 실행됩니다. 안드로이드 크롬 / 아이폰 사파리에서
바로 열 수 있고, 홈 화면에 추가하면 앱처럼 쓸 수 있습니다 (PWA).

- React + Vite + TypeScript (빌드 결과는 순수 정적 파일)
- 장기 규칙 엔진 직접 구현 (행마, 장군/외통, 빅장 판정)
- AI: 미니맥스 + 알파베타 가지치기 (쉬움 / 보통 / 어려움)
- 모바일 터치 UI, 오프라인 지원(Service Worker)

## 로컬에서 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173/myapp/)
npm run build    # 정적 파일 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## GitHub Pages 배포

이 저장소는 `main`에 push하면 GitHub Actions가 **자동으로 빌드 + 배포**합니다.

### 최초 1회 설정
1. GitHub 저장소 → **Settings → Pages** 로 이동
2. **Source** 를 **"GitHub Actions"** 로 설정 후 저장

### 배포 흐름
1. 코드를 `main` 브랜치에 push
2. `.github/workflows/deploy.yml` 워크플로가 실행되어 빌드 후 Pages에 배포
3. 배포 완료 후 아래 주소로 접속

```
https://uqdaddy.github.io/myapp/
```

> 다른 저장소 이름으로 배포하려면 `vite.config.ts` 의 `base` 값을
> `/저장소이름/` 로 바꿔주세요.

## 모바일에서 앱처럼 쓰기
- **아이폰(사파리)**: 공유 버튼 → "홈 화면에 추가"
- **안드로이드(크롬)**: 메뉴(⋮) → "홈 화면에 추가" / "앱 설치"

## 조작법
- 내 기물을 탭하면 이동 가능한 위치가 표시됩니다. 목표 지점을 탭하면 이동합니다.
- 상단에서 진영(초/한)과 난이도를 바꾸면 새 게임이 시작됩니다.
- **무르기** 버튼으로 직전 수를 되돌릴 수 있습니다.

## 프로젝트 구조
```
src/
  engine/       # 장기 규칙 엔진 (서버 불필요, 순수 TS)
    types.ts    # 타입, 좌표, 궁성 판정
    board.ts    # 초기 배치, 보드 유틸
    moves.ts    # 행마 생성, 장군/빅장 판정, 합법수
    game.ts     # 승패/장군 상태 판정
    ai.ts       # 미니맥스 + 알파베타 AI
  Board.tsx     # SVG 장기판 렌더링 + 터치
  App.tsx       # 게임 상태 관리 UI
public/         # PWA manifest, service worker, 아이콘
.github/workflows/deploy.yml   # GitHub Pages 자동 배포
```
