import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Agent from './pages/Agent'
import NotFound from './pages/NotFound'

// 페이지를 추가할 때: ① pages/에 파일 만들기 ② NAV_ITEMS 에 한 줄 추가 ③ routes 에 한 줄 추가
export const NAV_ITEMS = [
  { to: '/', label: '홈', icon: 'house' },
  { to: '/agent', label: 'AI 도우미', icon: 'robot' },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'agent', element: <Agent /> },
    ],
  },
])
