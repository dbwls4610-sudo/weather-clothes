import { useState } from 'react'
import { Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { useAppStore } from '../store/useAppStore'

export default function Agent() {
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.chatLoading)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const [input, setInput] = useState('')

  function onSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input)
    setInput('')
  }

  return (
    <>
      <PageHeader icon="robot" title="AI 도우미" subtitle="Claude 에게 제주 옷차림을 물어보세요" />
      <Card className="chat-box mb-3">
        <Card.Body>
          {messages.length === 0 && <div className="text-muted">예) 내일 제주 바람 많이 분다는데 뭐 입고 갈까?</div>}
          {messages.map((m, i) => <div key={i} className={`msg ${m.role}`}>{m.text}</div>)}
          {loading && <div className="small text-muted"><Spinner size="sm" className="me-2" />답변 만드는 중...</div>}
        </Card.Body>
      </Card>
      <Form onSubmit={onSubmit}>
        <InputGroup>
          <Form.Control value={input} onChange={(e) => setInput(e.target.value)} placeholder="질문을 입력하세요" />
          <Button type="submit" disabled={loading}><i className="bi bi-send" /></Button>
        </InputGroup>
      </Form>
    </>
  )
}
