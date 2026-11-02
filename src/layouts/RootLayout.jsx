import { NavLink, Outlet } from 'react-router-dom'
import { Container, Nav, Navbar, Toast, ToastContainer } from 'react-bootstrap'
import { NAV_ITEMS } from '../router'
import { useAppStore } from '../store/useAppStore'

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar expand="md" bg="primary" data-bs-theme="dark" collapseOnSelect sticky="top">
        <Container>
          <Navbar.Brand as={NavLink} to="/">
            <i className="bi bi-cloud-sun me-2" />제주 옷차림 알리미
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
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="flex-grow-1 py-4">
        <Container>
          <Outlet />
        </Container>
      </main>

      <footer className="py-3 border-top bg-light">
        <Container className="small text-muted">제주 날씨에 맞는 옷차림을 알려드려요</Container>
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
