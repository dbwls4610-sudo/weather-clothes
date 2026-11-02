import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'

export const NOTE_MAX = 200
const PLACEHOLDER = '예) 안에 반팔이 아니라 긴팔을 입었으면 딱 좋았을 듯'

// 한 줄 후기 (안 써도 돼요). 사진을 올리기 전에 쓸 때 — 값은 부모가 들고 있다가 사진과 함께 저장
export default function NoteField({ value, onChange, disabled }) {
  return (
    <Form.Group controlId="outfit-note">
      <Form.Label className="small text-muted mb-1">한 줄 후기 (안 써도 돼요)</Form.Label>
      <Form.Control
        as="textarea" rows={2} maxLength={NOTE_MAX} placeholder={PLACEHOLDER}
        value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      />
      <div className="small text-muted text-end">{value.length}/{NOTE_MAX}</div>
    </Form.Group>
  )
}

// 이미 올린 기록의 후기를 쓰거나 고칠 때 — 바꾼 뒤 "후기 저장"을 눌러야 저장돼요
// value 가 바뀌어도 칸이 새로 시작되도록, 부모에서 key={기록 날짜} 를 붙여 주세요
export function NoteEditor({ value, onSave, disabled }) {
  const [draft, setDraft] = useState(value ?? '')
  const changed = draft.trim() !== (value ?? '')

  return (
    <div>
      <NoteField value={draft} onChange={setDraft} disabled={disabled} />
      {changed && (
        <Button size="sm" className="mt-1" onClick={() => onSave(draft.trim() || null)} disabled={disabled}>
          <i className="bi bi-check2 me-1" />후기 저장
        </Button>
      )}
    </div>
  )
}
