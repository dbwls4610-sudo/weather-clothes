import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

// 디자인: Bootstrap 5 + Bootswatch 테마. 'minty' 한 단어만 바꾸면 전체 분위기가 바뀝니다.
import 'bootswatch/dist/minty/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './styles/theme.css'

import { router } from './router'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
