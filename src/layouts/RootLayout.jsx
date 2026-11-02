import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Container, Nav, Navbar, Toast, ToastContainer } from 'react-bootstrap'
import { NAV_ITEMS } from '../router'
import { useAppStore } from '../store/useAppStore'

// 화면 아래에 보여주는 데이터 출처: 어떤 API 를 어디에 썼는지
const DATA_SOURCES = [
  { name: '기상청_단기예보 조회서비스', use: '오늘·내일 날씨 예보(시간별 기온·하늘·강수·바람), 이번주 3일 후까지의 날씨 예보, 옷차림 추천' },
  { name: '기상청_중기예보 조회서비스', use: '이번주·다음주 4~10일 후 날씨 예보' },
  { name: '기상청_지상(종관, ASOS) 시간자료 조회서비스', use: '지난 날짜에 올리는 옷 사진의 그날 날씨 기록' },
]

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const signOut = useAppStore((s) => s.signOut)
  const initAuth = useAppStore((s) => s.initAuth)

  useEffect(() => { initAuth() }, [initAuth])   // 앱을 열 때 로그인 상태 이어받기

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar expand="md" bg="primary" data-bs-theme="dark" collapseOnSelect sticky="top">
        <Container>
          <Navbar.Brand as={NavLink} to="/">
            <i className="bi bi-cloud-sun me-2" />제주 옷차림 비서
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              {NAV_ITEMS.map((item) => (
                <Nav.Link key={item.to} as={NavLink} to={item.to} end={item.to === '/'} eventKey={item.to}>
                  <i className={`bi bi-${item.icon} me-1`} />{item.label}
                </Nav.Link>
              ))}
            </Nav>
            {/* 오른쪽: 로그인 버튼 / 로그인한 사용자와 로그아웃 */}
            {authReady && (user ? (
              <Nav className="align-items-md-center">
                <Nav.Link as={NavLink} to="/mypage" eventKey="/mypage"><i className="bi bi-person-circle me-1" />마이페이지</Nav.Link>
                <Nav.Link as="button" onClick={signOut}><i className="bi bi-box-arrow-right me-1" />로그아웃</Nav.Link>
              </Nav>
            ) : (
              <Nav>
                <Nav.Link as={NavLink} to="/login" eventKey="/login"><i className="bi bi-box-arrow-in-right me-1" />로그인</Nav.Link>
              </Nav>
            ))}
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="flex-grow-1 py-4">
        <Container>
          <Outlet />
        </Container>
      </main>

      <footer className="py-3 border-top bg-light">
        <Container className="small text-muted">
          {/* 사용한 데이터 출처 — API 를 더 쓰게 되면 DATA_SOURCES 에 한 줄 추가 */}
          <div className="fw-bold mb-1">* 데이터 출처 안내</div>
          <div className="mb-1">사용한 데이터: 공공데이터포털 오픈 API</div>
          <ol className="mb-0 ps-4">
            {DATA_SOURCES.map((d) => (
              <li key={d.name} className="mb-1">
                <div>{d.name} 오픈 API:</div>
                <div>{d.use}</div>
              </li>
            ))}
          </ol>
        </Container>
      </footer>

      {/* store 의 toast() 로 띄운 알림 */}
      <ToastContainer position="bottom-end" className="p-3 position-fixed">
        {toasts.map((t) => (
          <Toast key={t.id} bg={t.variant}>
            <Toast.Body className="text-white">{t.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </div>
  )
}
