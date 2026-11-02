import { Card } from 'react-bootstrap'
import ClothesCards from './ClothesCards'
import TempBadge from './TempBadge'

// 추천 옷차림 카드: 설명 글 + 옷 그림 카드 + 팁 (오늘·내일 카드는 기본 제목 "추천 옷차림", 다른 곳에서는 title 로 바꿔 씁니다)
export default function OutfitCard({ outfit, title = '추천 옷차림', className = 'mb-4', showLabel = true }) {
  return (
    <Card className={`h-100 border-primary ${className}`}>
      <Card.Body>
        <Card.Title className="fw-bold">
          <i className="bi bi-handbag me-2 text-primary" />{title} {showLabel && <TempBadge label={outfit.label} />}        </Card.Title>
        <p className="mb-3">{outfit.text}</p>
        <ClothesCards items={outfit.items} />
        {outfit.tips.length > 0 && (
          <ul className="small text-muted mt-3 mb-0 ps-3">
            {outfit.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        )}
      </Card.Body>
    </Card>
  )
}
