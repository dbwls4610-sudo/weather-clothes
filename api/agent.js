import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { runAgent } from '../server/agent.js'

// 비밀 키는 서버(api/)에서만 사용합니다. 브라우저 코드(src/)에는 넣지 마세요.
// 사용할 Claude 모델: 환경변수 ANTHROPIC_MODEL 로 고릅니다 (별명 haiku / sonnet / opus, 또는 모델 ID 전체). 없으면 haiku.
//  · haiku  — 가장 빠르고 저렴 (기본값, 날씨 조회 + 옷차림 안내에 충분)
//  · sonnet — 더 똑똑하고 자연스럽지만 비용이 더 듦
//  · opus   — 가장 강력하지만 가장 비쌈
const MODEL_ALIASES = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5' }
const pickModel = () => {
  const v = (process.env.ANTHROPIC_MODEL ?? '').trim()
  return MODEL_ALIASES[v.toLowerCase()] ?? (v || MODEL_ALIASES.haiku)
}
const MAX_QUESTION = 500       // 질문 한 번의 최대 글자 수
let anthropic
const getAnthropic = () => (anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

// POST /api/agent  { message, history, context? }   헤더: Authorization: Bearer <로그인 토큰>
//  · 로그인한 사용자만 쓸 수 있고, 하루 정해진 횟수까지 (횟수와 한도는 Supabase 의 use_agent_quota 함수가 셉니다. 지금은 20번)
//  · Claude 는 날씨 도구(get_weather)를 불러서 실제 예보를 확인하고 답합니다 (server/agent.js)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  // 1) 로그인 확인: 브라우저가 보낸 토큰이 진짜인지 Supabase 에 물어봅니다
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'AI 도우미는 로그인한 뒤에 이용할 수 있어요' })
  const url = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) return res.status(500).json({ error: '서버에 Supabase 설정이 없어요' })

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },   // 이후 DB 호출도 이 사용자 권한으로 실행
  })
  const { data: auth, error: authError } = await supabase.auth.getUser(token)
  if (authError || !auth?.user) return res.status(401).json({ error: '로그인이 만료됐어요. 다시 로그인해 주세요' })

  // 2) 질문 확인 (횟수를 쓰기 전에 걸러냅니다)
  const { message, history = [], context } = req.body ?? {}
  if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: '질문을 입력해 주세요' })
  if (message.length > MAX_QUESTION) return res.status(400).json({ error: `질문은 ${MAX_QUESTION}자 이내로 써 주세요` })

  // 3) 하루 횟수 확인 + 1번 사용
  const { data: quota, error: quotaError } = await supabase.rpc('use_agent_quota')
  if (quotaError) {
    const missing = /use_agent_quota/.test(quotaError.message)
    return res.status(500).json({ error: missing ? '질문 횟수를 세는 기능이 아직 준비되지 않았어요 (supabase/schema.sql 을 실행해 주세요)' : quotaError.message })
  }
  const q = Array.isArray(quota) ? quota[0] : quota
  if (!q?.ok) return res.status(429).json({ error: `오늘 질문 ${q?.used_count ?? ''}번을 모두 사용했어요. 내일 다시 이용해 주세요.`, remaining: 0 })

  // 4) 대화 기록 정리: 글만 남기고 최근 10개만 (비용 절약, 이상한 값 차단)
  const past = (Array.isArray(history) ? history : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
    .slice(-10)
  const messages = [...past, { role: 'user', content: message.trim() }]

  // 사용자가 앱에서 보고 있는 지역 (숫자 좌표가 맞을 때만 사용)
  const place = context && Number.isFinite(context.lat) && Number.isFinite(context.lon) && typeof context.label === 'string'
    ? { label: context.label.slice(0, 40), lat: context.lat, lon: context.lon }
    : undefined

  try {
    const model = pickModel()
    const { answer, toolsUsed, pastOutfits } = await runAgent({ client: getAnthropic(), model, messages, ctx: { place, db: supabase } })   // db: 이 사용자의 로그인 권한으로 만든 연결 → 내 기록만 읽을 수 있어요
    console.log(`[agent] model=${model} tools=${toolsUsed.join(',') || '없음'} place=${place?.label ?? '없음'}`)   // 문제가 생기면 Vercel Logs 에서 확인
    res.status(200).json({ answer, remaining: q.left_count, toolsUsed, pastOutfits })   // pastOutfits: 카드로 보여줄 기록(사진 없음)
  } catch (e) {
    // 429 = Claude 호출 한도 초과, 401 = 키 오류
    res.status(e.status ?? 500).json({ error: e.status === 429 ? '사용량이 많아요. 1분 뒤 다시 시도하세요.' : e.message, remaining: q.left_count })
  }
}
