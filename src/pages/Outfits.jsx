import { useState } from 'react'
import { Col, Form, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import OutfitCard from '../components/OutfitCard'
import { TIERS, labelColor, recommendDay } from '../lib/outfit'

// 기온 구간별 옷차림 카드를 위(더움)에서 아래(추움)로 이어서 보여주는 페이지
// 옷 목록·설명 글은 src/lib/outfit.js 의 BY_TEMP 에서 바꿉니다.

// 구간의 기온 범위 글자 ("28℃ 이상", "23℃ ~ 27℃", "4℃ 이하")
function rangeText(i) {
  const upper = i === 0 ? null : TIERS[i - 1].min - 1
  if (i === 0) return `${TIERS[0].min}℃ 이상`
  return TIERS[i].min === -Infinity ? `${upper}℃ 이하` : `${TIERS[i].min}℃ ~ ${upper}℃`
}

// 각 구간을 대표하는 기온 (맨 위/맨 아래 구간은 끝에서 조금 안쪽) — 추천 계산에 씀
function sampleTemp(i) {
  if (i === 0) return TIERS[0].min + 2
  const upper = TIERS[i - 1].min - 1
  return TIERS[i].min === -Infinity ? upper - 3 : Math.round((TIERS[i].min + upper) / 2)
}

export default function Outfits() {
  const [rain, setRain] = useState(false)
  const [wind, setWind] = useState(false)
  const [gap, setGap] = useState(false)

  // 왼쪽 세로선: 구간 색을 위에서 아래로 이어 붙인 그라데이션
  const lineColors = TIERS.map((t) => labelColor(t.label).bg).join(', ')

  return (
    <>
      <PageHeader icon="grid" title="날씨별 옷차림" subtitle="기온에 따라 어떤 옷차림을 추천하는지 한눈에 볼 수 있어요. 아래로 내려갈수록 추워져요." />

      <div className="mb-4 d-flex flex-wrap align-items-center gap-4">
        <span className="text-muted small">날씨 조건 더해 보기</span>
        <Form.Check type="switch" id="sw-rain" label="비 오는 날" checked={rain} onChange={(e) => setRain(e.target.checked)} />
        <Form.Check type="switch" id="sw-wind" label="바람 센 날" checked={wind} onChange={(e) => setWind(e.target.checked)} />
        <Form.Check type="switch" id="sw-gap" label="일교차 큰 날" checked={gap} onChange={(e) => setGap(e.target.checked)} />
      </div>

      <Row>
        <Col lg={9} xl={8}>
          <div className="tier-list">
            <div className="tier-line" style={{ background: `linear-gradient(to bottom, ${lineColors})` }} />
            {TIERS.map((t, i) => {
              const temp = sampleTemp(i)
              const outfit = recommendDay({
                min: temp - (gap ? 5 : 2), max: temp + (gap ? 5 : 2),
                pop: rain ? 80 : 10, wind: wind ? 10 : 3, rain: rain ? '비' : '없음',
              })
              return (
                <div key={t.label} className="tier-item">
                  <span className="tier-dot" style={{ background: labelColor(t.label).bg }} />
                  <OutfitCard outfit={outfit} title={rangeText(i)} className="mb-0" />
                </div>
              )
            })}
          </div>
        </Col>
      </Row>
    </>
  )
}
