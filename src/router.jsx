import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Agent from './pages/Agent'
import Outfits from './pages/Outfits'
import Login from './pages/Login'
import MyPage from './pages/MyPage'
import Similar from './pages/Similar'
import NotFound from './pages/NotFound'

// 페이지를 추가할 때: ① pages/에 파일 만들기 ② NAV_ITEMS 에 한 줄 추가 ③ routes 에 한 줄 추가
export const NAV_ITEMS = [
  { to: '/', label: '홈', icon: 'house' },
  { to: '/agent', label: 'AI 도우미', icon: 'robot' },
  { to: '/outfits', label: '날씨별 옷차림', icon: 'grid' },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'agent', element: <Agent /> },
      { path: 'outfits', element: <Outfits /> },
      { path: 'mypage', element: <MyPage /> },   // 로그인하면 오른쪽 위에 연결이 생김
      { path: 'similar', element: <Similar /> },   // 홈 카드의 "더보기"로 들어옴
      { path: 'login', element: <Login /> },   // 메뉴에는 오른쪽 위 로그인 버튼으로 연결
    ],
  },
])
