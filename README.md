# 제주 옷차림 알리미

제주 날씨에 맞는 옷차림을 알려주는 웹앱 (Vite + React + Router + Zustand + Supabase + Claude). 현재는 뼈대만 있습니다.

## 실행
```bash
npm install
cp .env.example .env.local     # 값 채우기 (Windows: copy .env.example .env.local)
npm run dev                    # 화면만 (http://localhost:5173)
vercel dev                     # 화면 + /api 서버 함수 (Claude 사용 시 이걸로)
```

## 구조
```
api/        Vercel 서버 함수 (/api/파일이름) — 비밀 키(ANTHROPIC_API_KEY)는 여기서만
src/
  main.jsx          디자인 테마 선택 + 라우터 시작
  router.jsx        메뉴(NAV_ITEMS) + 주소별 페이지
  layouts/          공통 틀 (메뉴·푸터·알림)
  store/            Zustand 전역 상태 (알림·Claude 대화)
  lib/supabase.js   Supabase 연결 (.env.local 없으면 null)
  api/client.js     화면 → /api 호출 함수
  components/       재사용 컴포넌트
  pages/            페이지 (Home, Agent)
```
