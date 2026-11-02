import { emojiOf, iconTypeOf } from '../lib/outfit'
import GarmentIcon from './GarmentIcon'

// 추천 옷을 "그림 + 이름" 작은 카드로 보여줍니다
export default function ClothesCards({ items }) {
  return (
    <div className="d-flex flex-wrap gap-2">
      {items.map((item) => {
        const type = iconTypeOf(item)
        return (
          <div key={item} className="clothes-card">
            <div className="clothes-emoji">{type ? <GarmentIcon type={type} /> : emojiOf(item)}</div>
            <div className="small">{item}</div>
          </div>
        )
      })}
    </div>
  )
}
