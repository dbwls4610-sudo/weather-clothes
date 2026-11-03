import { Card } from 'react-bootstrap'
import ClothesCards from './ClothesCards'
import TempBadge from './TempBadge'

// "쌀쌀한 날씨예요. 자켓이나 가디건처럼 걸칠 겉옷을 챙기세요." → ["쌀쌀한 날씨예요. ", "자켓이나 가디건처럼 걸칠 겉옷을 챙기세요."]
// 문장 단위로 나눠 둬요. 웹에서는 이어서 한 줄, 폰에서는 문장마다 한 줄씩 (theme.css 의 .outfit-sentence)
const sentencesOf = (text) => text.match(/[^.!?]+[.!?]*\s*/g) ?? [text]

// "쌀쌀한 날씨예요. 자켓이나 가디건처럼 걸칠 겉옷을 챙기세요." → "자켓이나 가디건처럼 걸칠 겉옷을 챙기세요."
// 첫 문장(날씨 설명)을 빼고 옷 추천 문장만 남겨요. 문장이 하나뿐이면 그대로 둡니다.
const withoutFirstSentence = (text) => {
  const rest = text.replace(/^[^.!?]*[.!?]\s*/, '')
  return rest || text
}

// 안내 문장 "비 소식(70%) — 우산을 챙기세요."를 "이유 — 할 일" 두 토막으로 나눠 둬요.
// 웹에서는 한 줄로 이어 보이고, 폰(좁은 칸)에서는 " — " 자리에서 줄이 바뀌어 각 토막이 한 줄에 들어옵니다 (theme.css 의 .tip-b)
// 다만 짧은 "비 소식(70%) — 우산을 챙기세요."는 폰에서도 한 줄로 이어 둬요 (tip-inline)
function Tip({ text }) {
  const [reason, action] = text.split(' — ')
  if (!action) return text
  return (
    <span className={reason.startsWith('비 소식') ? 'tip-inline' : undefined}>
      <span className="tip-a">{reason}</span>
      <span className="tip-dash"> — </span>
      <span className="tip-b">{action}</span>
    </span>
  )
}

// 추천 옷차림 카드: 설명 글 + 옷 그림 카드 + 팁 (오늘·내일 카드는 기본 제목 "추천 옷차림", 다른 곳에서는 title 로 바꿔 씁니다)
//  · showText=false: "쌀쌀한 날씨예요…" 같은 설명 글을 뺌
//  · tipsFirst: 제목 아래에 팁(우산·바람·일교차 문장) → 추천 문장(첫 문장 뺀 옷 추천 문장) → 옷 그림 순으로 쌓음.
//    (옷 그림 카드는 문장 바로 아래에 이어지고, 높이를 고정하지 않아요)
export default function OutfitCard({ outfit, title = '추천 옷차림', className = 'mb-4', showLabel = true, showText = true, tipsFirst = false }) {
  const tips = outfit.tips.length > 0 && (
    <ul className={`small text-muted ps-3 ${tipsFirst ? 'mb-1' : 'mt-3 mb-0'}`}>
      {outfit.tips.map((t) => <li key={t}><Tip text={t} /></li>)}
    </ul>
  )
  return (
    <Card className={`h-100 border-primary ${className}`}>
      <Card.Body>
        <Card.Title className="fw-bold">
          <i className="bi bi-handbag me-2 text-primary" />{title} {showLabel && <TempBadge label={outfit.label} />}        </Card.Title>
        {tipsFirst ? (
          <div className="mb-2">
            {tips}
            {showText && <p className="mb-0">{withoutFirstSentence(outfit.text)}</p>}
          </div>
        ) : (showText && (
          <p className="mb-3">{sentencesOf(outfit.text).map((s, i) => <span key={i} className="outfit-sentence">{s}</span>)}</p>
        ))}
        <ClothesCards items={outfit.items} />
        {!tipsFirst && tips}
      </Card.Body>
    </Card>
  )
}
