import Anthropic from '@anthropic-ai/sdk'

// 비밀 키는 서버(api/)에서만 사용합니다. 브라우저 코드(src/)에는 넣지 마세요.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-5-5'

const SYSTEM = `너는 제주 날씨에 맞는 옷차림을 알려주는 도우미다.
- 답은 한국어로, 5문장 이내로 짧게.`

// TODO: 날씨 조회 같은 도구(tools)와 에이전트 루프는 기능을 만들 때 추가
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const { message, history = [] } = req.body ?? {}
  const messages = [...history.slice(-10), { role: 'user', content: message }] // 최근 10개만 보내 비용 절약

  try {
    const r = await client.messages.create({ model: MODEL, max_tokens: 1024, system: SYSTEM, messages })
    const answer = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
    res.status(200).json({ answer })
  } catch (e) {
    // 429 = 호출 한도 초과, 401 = 키 오류
    res.status(e.status ?? 500).json({ error: e.status === 429 ? '사용량이 많아요. 1분 뒤 다시 시도하세요.' : e.message })
  }
}
