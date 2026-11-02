import { useState } from 'react'
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap'
import { Navigate, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

// 로그인 / 회원가입 (이메일 + 비밀번호). 위쪽 탭으로 두 화면을 오갑니다.
export default function Login() {
  const user = useAppStore((s) => s.user)
  const signIn = useAppStore((s) => s.signIn)
  const signUp = useAppStore((s) => s.signUp)
  const toast = useAppStore((s) => s.toast)
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')   // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'login') {
        await signIn(email, password)
        toast('로그인했어요')
        navigate('/')
      } else {
        const loggedIn = await signUp(email, password)
        if (loggedIn) { toast('가입하고 로그인했어요'); navigate('/') }
        else setNotice('가입 확인 메일을 보냈어요. 메일의 확인 링크를 누른 뒤 로그인해 주세요.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader icon="person-circle" title={mode === 'login' ? '로그인' : '회원가입'} subtitle="로그인하면 오늘 입은 옷 사진을 기록할 수 있어요." />

      {!isSupabaseReady && (
        <Alert variant="warning">Supabase 설정(.env.local 의 VITE_SUPABASE_URL / ANON_KEY)이 없어서 로그인할 수 없어요.</Alert>
      )}

      <Row>
        <Col md={8} lg={6} xl={5}>
          <Card>
            <Card.Body>
              <Form onSubmit={submit}>
                <Form.Group className="mb-3" controlId="login-email">
                  <Form.Label>이메일</Form.Label>
                  <Form.Control type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="login-password">
                  <Form.Label>비밀번호</Form.Label>
                  <Form.Control
                    type="password" required minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  {mode === 'signup' && <Form.Text muted>6자 이상</Form.Text>}
                </Form.Group>

                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
                {notice && <Alert variant="success" className="py-2 small">{notice}</Alert>}

                <Button type="submit" className="w-100" disabled={busy || !isSupabaseReady}>
                  {busy ? <Spinner size="sm" /> : mode === 'login' ? '로그인' : '가입하기'}
                </Button>
              </Form>

              <div className="text-center small mt-3">
                {mode === 'login' ? (
                  <>계정이 없나요? <Button variant="link" size="sm" className="p-0 align-baseline" onClick={() => { setMode('signup'); setError(''); setNotice('') }}>회원가입</Button></>
                ) : (
                  <>이미 계정이 있나요? <Button variant="link" size="sm" className="p-0 align-baseline" onClick={() => { setMode('login'); setError(''); setNotice('') }}>로그인</Button></>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}
