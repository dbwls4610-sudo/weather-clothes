import { Form } from 'react-bootstrap'
import { JEJU_CITIES, placeById, placesOfCity } from '../lib/places'

// 지역 고르기: 1단계 (내 위치) / 시 → 2단계 동·읍·면. value 는 지역 id ('mine' 포함), 바꾸면 onChange(id)
// includeMine 이 false 면 "내 위치" 항목 없이 제주시·서귀포시만 고를 수 있어요 (value 도 지역 id 여야 함)
export default function PlaceSelect({ value, onChange, includeMine = false, disabled }) {
  const cityId = placeById(value)?.city ?? 'mine'
  const areas = cityId === 'mine' ? [] : placesOfCity(cityId)   // 맨 앞은 "시 전체", 나머지는 가나다순

  return (
    <>
      <Form.Select aria-label="시 선택" style={{ width: 'auto' }} value={cityId} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {includeMine && <option value="mine">내 위치</option>}
        {JEJU_CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Form.Select>
      {cityId !== 'mine' && (
        <Form.Select aria-label="동·읍·면 선택" style={{ width: 'auto' }} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          {areas.slice(0, 1).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <optgroup label="동 지역">
            {areas.filter((p) => p.kind === '동').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
          <optgroup label="읍·면 지역">
            {areas.filter((p) => p.kind === '읍면').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
        </Form.Select>
      )}
    </>
  )
}
