// 이모지에 없는 옷을 직접 그린 그림(SVG). type 으로 옷 종류를 고릅니다.
// 새로 추가하려면: ① 아래 ICONS 에 그림 추가 ② src/lib/outfit.js 의 ICON_TYPE 에 옷 이름 연결

// 긴팔 옷의 기본 실루엣 (몸통 + 소매)
const SHAPE = 'M23 10 L9 18 L4 42 L14 44 L17 29 L17 54 L47 54 L47 29 L50 44 L60 42 L55 18 L41 10 C39 14 36 16 32 16 C28 16 25 14 23 10 Z'
const NECK = 'M23 10 C25 14 28 16 32 16 C36 16 39 14 41 10'
// 밑단·소맷단 (골지)
const RIBS = 'M17 49 H47 V54 H17 Z M4 42 L14 44 L13 49 L3.2 47 Z M60 42 L50 44 L51 49 L60.8 47 Z'

const ICONS = {
  // 니트(스웨터): 코 짜임(V 무늬)이 보이는 질감
  sweater: (
    <g stroke="#b9602f" strokeWidth="2" strokeLinejoin="round">
      <defs>
        {/* 작은 크기에서도 보이도록 큼직하고 진하게 */}
        <pattern id="knit-stitch" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0.5 1 L3.5 6 L6.5 1" fill="none" stroke="#9c4519" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </pattern>
      </defs>
      <path fill="#f2a065" d={SHAPE} />
      <path fill="url(#knit-stitch)" stroke="none" d={SHAPE} />
      <path fill="#e07f3f" d={RIBS} />
      <path fill="none" d={NECK} />
    </g>
  ),
  // 두꺼운 니트: 아이보리, 굵은 꽈배기 짜임 + 높게 말린 목(터틀넥)
  thickknit: (
    <g stroke="#a58b66" strokeWidth="2" strokeLinejoin="round">
      <defs>
        <pattern id="cable-knit" width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M2.2 0 Q4.6 2.2 2.2 4.5 T2.2 9 M6.8 0 Q4.4 2.2 6.8 4.5 T6.8 9" fill="none" stroke="#b79f78" strokeWidth="1.6" strokeLinecap="round" />
        </pattern>
      </defs>
      <path fill="#f1e6d2" d={SHAPE} />
      <path fill="url(#cable-knit)" stroke="none" d={SHAPE} />
      <path fill="#d9c7a6" d={RIBS} />
      <path fill="#e6d8bd" d="M23 9 C26 5.5 38 5.5 41 9 L40 15.5 C37 18 27 18 24 15.5 Z" />
      <path fill="none" strokeWidth="1.4" d="M25 10.5 C28 12.5 36 12.5 39 10.5" />
    </g>
  ),
  // 블라우스(린넨): 아이보리, 짧은 소매 + 작은 옷깃 + 단추
  blouse: (
    <g stroke="#a8996b" strokeWidth="2" strokeLinejoin="round">
      <path fill="#f3ead2" d="M24 11 L11 17 L5 31 L15 34 L18 26 L18 54 L46 54 L46 26 L49 34 L59 31 L53 17 L40 11 L32 20 Z" />
      <path fill="#fffaf0" d="M24 11 L32 20 L27 22 L21 13 Z M40 11 L32 20 L37 22 L43 13 Z" />
      <path fill="none" strokeWidth="1.6" d="M32 20 V54" />
      <g fill="#a8996b" stroke="none">
        <circle cx="34.5" cy="29" r="1.4" /><circle cx="34.5" cy="37" r="1.4" /><circle cx="34.5" cy="45" r="1.4" />
      </g>
    </g>
  ),
  // 가디건: 연두색, 브이넥 + 앞이 열리는 단추 줄
  cardigan: (
    <g stroke="#4f7f56" strokeWidth="2" strokeLinejoin="round">
      <path fill="#a9cfa8" d="M23 10 L9 18 L4 42 L14 44 L17 29 L17 54 L47 54 L47 29 L50 44 L60 42 L55 18 L41 10 L32 26 Z" />
      <path fill="#86b487" d="M17 49 H47 V54 H17 Z M4 42 L14 44 L13 49 L3.2 47 Z M60 42 L50 44 L51 49 L60.8 47 Z" />
      <path fill="none" strokeWidth="3" strokeLinecap="round" d="M23 10 L32 26 L41 10" />
      <path fill="none" strokeWidth="1.8" d="M32 26 V54" />
      <g fill="#f5efe0" strokeWidth="1.4">
        <circle cx="35" cy="33" r="1.8" /><circle cx="35" cy="40" r="1.8" /><circle cx="35" cy="47" r="1.8" />
      </g>
    </g>
  ),
  // 긴팔 티: 단순한 긴팔, 골지 없음
  longsleeve: (
    <g stroke="#4a7aa8" strokeWidth="2" strokeLinejoin="round">
      <path fill="#9cc3e6" d={SHAPE} />
      <path fill="none" d={NECK} />
      <path fill="none" strokeWidth="1.5" d="M17 29 L14 44 M47 29 L50 44" />
    </g>
  ),
  // 맨투맨: 회색, 두꺼운 목둘레와 골지 + 가슴 줄
  sweatshirt: (
    <g stroke="#6b7280" strokeWidth="2" strokeLinejoin="round">
      <path fill="#c9ced6" d={SHAPE} />
      <path fill="#9aa1ad" d={RIBS} />
      <path fill="#9aa1ad" d="M23 10 C25 15 28 17 32 17 C36 17 39 15 41 10 L38 9 C36 12 34 13 32 13 C30 13 28 12 26 9 Z" />
      <path fill="none" strokeWidth="1.5" d="M22 30 H42" />
    </g>
  ),
  // 히트텍: 흰색 긴팔 내의
  heattech: (
    <g stroke="#9aa1ad" strokeWidth="2" strokeLinejoin="round">
      <path fill="#fafafa" d={SHAPE} />
      <path fill="none" d={NECK} />
      <path fill="none" strokeWidth="1.5" d="M17 29 L14 44 M47 29 L50 44" />
    </g>
  ),
  // 야상: 올리브색, 모자(후드) + 지퍼 + 주머니
  parka: (
    <g stroke="#55612e" strokeWidth="2" strokeLinejoin="round">
      <path fill="#8a9a5b" d="M22 13 L8 21 L4 46 L15 48 L17 32 L17 57 L47 57 L47 32 L49 48 L60 46 L56 21 L42 13 Z" />
      <path fill="#a3b074" d="M21 14 C21 4 43 4 43 14 C43 20 38 23 32 23 C26 23 21 20 21 14 Z" />
      <path fill="none" d="M32 23 V57" />
      <path fill="#7a8a4d" d="M20 42 H30 V50 H20 Z M34 42 H44 V50 H34 Z" />
    </g>
  ),
  // 바람막이: 회색, 후드 + 앞 지퍼 + 후드 끈 + 비스듬한 옆 주머니 + 골지 소맷단·밑단
  windbreaker: (
    <g stroke="#4b5563" strokeWidth="2" strokeLinejoin="round">
      <path fill="#a4abb5" d="M22 13 L9 19 L4 50 L14 52 L17 30 L17 55 L47 55 L47 30 L50 52 L60 50 L55 19 L42 13 Z" />
      {/* 밑단·소맷단 */}
      <path fill="#7b828d" d="M17 51 H47 V55 H17 Z M4.5 46.5 L13.6 48.4 L14 52 L4 50 Z M59.5 46.5 L50.4 48.4 L50 52 L60 50 Z" />
      {/* 후드와 얼굴 둘레 */}
      <path fill="#bcc2cb" d="M21 14 C21 3 43 3 43 14 C43 20 38 23 32 23 C26 23 21 20 21 14 Z" />
      <path fill="#6b7280" strokeWidth="1.6" d="M26 13 C26 8 38 8 38 13 C38 17 35 20 32 20 C29 20 26 17 26 13 Z" />
      {/* 앞 지퍼 + 후드 끈 */}
      <path fill="none" strokeWidth="1.8" d="M32 20 V55" />
      <path fill="none" strokeWidth="1.4" strokeLinecap="round" d="M28.5 21 L27.5 29 M35.5 21 L36.5 29" />
      {/* 옆 주머니 */}
      <path fill="none" strokeWidth="1.6" strokeLinecap="round" d="M21 40 L24 49 M43 40 L40 49" />
    </g>
  ),
  // 가죽 자켓(레이서): 검정, 밴드 칼라 + 비스듬한 지퍼 + 소매 흰 줄 + 골지 밑단·소맷단
  leather: (
    <g stroke="#0e0e10" strokeWidth="2" strokeLinejoin="round">
      <path fill="#2b2b30" d="M23 10 L9 18 L4 52 L14 54 L17 30 L17 55 L47 55 L47 30 L50 54 L60 52 L55 18 L41 10 C38 12 35 13 32 13 C29 13 26 12 23 10 Z" />
      {/* 밑단·소맷단 */}
      <path fill="#46464d" d="M17 50 H47 V55 H17 Z M4.4 47.5 L13.7 49.5 L14 54 L4 52 Z M59.6 47.5 L50.3 49.5 L50 54 L60 52 Z" />
      {/* 소매의 흰 줄 */}
      <path fill="none" stroke="#f2f2f5" strokeWidth="2" d="M6.4 35 H16.3 M5.9 39 H15.9 M57.6 35 H47.7 M58.1 39 H48.1" />
      {/* 밴드 칼라 + 단추 */}
      <path fill="#46464d" d="M24 9.5 C28 8 36 8 40 9.5 L39 14.5 C36 16.5 28 16.5 25 14.5 Z" />
      <circle cx="37" cy="12.6" r="1.1" fill="#d0d0d6" stroke="none" />
      {/* 비스듬한 앞 지퍼 */}
      <path fill="none" stroke="#6a6a72" strokeWidth="1.6" d="M27 15.5 L36 50" />
      <path fill="none" stroke="#d0d0d6" strokeWidth="1.8" strokeDasharray="1.6 1.6" d="M29.5 16 L39 50" />
      {/* 가슴 주머니 지퍼 */}
      <path fill="none" stroke="#d0d0d6" strokeWidth="1.6" d="M37 28 H44" />
    </g>
  ),
  // 패딩: 남색, 높은 목 + 가로 누빔 줄
  puffer: (
    <g stroke="#223a63" strokeWidth="2" strokeLinejoin="round">
      <path fill="#4a6fa8" d="M23 11 L9 19 L4 52 L14 54 L17 30 L17 56 L47 56 L47 30 L50 54 L60 52 L55 19 L41 11 Z" />
      <path fill="#3b5a8f" d="M23 7 H41 V15 H23 Z" />
      <path fill="none" stroke="#9db8e0" strokeWidth="1.8" strokeLinecap="round" d="M17 26 H47 M17 36 H47 M17 46 H47 M8 33 H16.5 M6 41 H15.6 M4.8 49 H14.7 M56 33 H47.5 M58 41 H48.4 M59.2 49 H49.3" />
      <path fill="none" d="M32 15 V56" />
    </g>
  ),
}

export default function GarmentIcon({ type, size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={type}>
      {ICONS[type]}
    </svg>
  )
}
