// AI 도우미 에이전트 루프: Claude 에게 질문 → (도구를 부르겠다고 하면) 도구 실행 → 결과를 돌려주고 다시 질문 → 최종 답
import { TOOLS, runTool } from './agentTools.js'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

// ctx.place: 사용자가 앱에서 보고 있는 지역 { label, lat, lon } (없을 수 있음)
export function buildSystem(ctx = {}) {
  const k = new Date(Date.now() + 9 * 3600e3)
  const today = `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일 ${DOW[k.getUTCDay()]}요일`
  return `너는 "제주 옷차림 비서" 앱의 AI 도우미다. 제주 날씨에 맞는 옷차림을 알려준다.
- 오늘은 ${today}이다 (한국 시간).
- ${ctx.place ? `사용자가 앱에서 지금 보고 있는 지역은 "${ctx.place.label}"이다. 질문에 지역이 없으면 이 지역 기준으로 답한다.` : '사용자가 보고 있는 지역 정보가 없다. 질문에 지역이 없으면 제주시 기준으로 답하고, 그 사실을 한 마디 알려준다.'}
- 날씨, 기온, 비, 바람, 옷차림에 대한 질문에는 추측하지 말고 반드시 get_weather 도구로 확인한 뒤 답한다. "내일"은 day=tomorrow, "이번주·다음주·주말"은 day=week, 지금·오늘은 day=today.
- 도구 결과의 "옷차림추천"(기온 구간, 추천 옷, 팁)을 바탕으로 답하고, 구체적인 기온 숫자와 이유(비·바람·일교차 등)를 한 문장 곁들인다.
- 제주시·서귀포시 밖의 지역이나 날씨·옷차림과 상관없는 질문은 정중히 이 앱의 범위가 아니라고 안내한다.
- 도구가 오류를 돌려주면 지어내지 말고, 확인하지 못했다고 솔직히 말한다.
- 답은 한국어로, 5문장 이내로 짧고 친근하게.`
}

// messages: [{ role: 'user' | 'assistant', content: '글' }] — 마지막이 지금 질문
// client 는 Anthropic SDK 인스턴스 (테스트할 때는 같은 모양의 가짜를 넣을 수 있어요)
export async function runAgent({ client, model, messages, ctx = {}, maxSteps = 5 }) {
  const msgs = [...messages]
  const system = buildSystem(ctx)
  const toolsUsed = []

  for (let step = 0; step <= maxSteps; step++) {
    // 마지막 차례에는 도구를 못 쓰게 해서 반드시 글로 마무리하게 합니다 (도구 호출이 끝없이 이어지는 것을 막음)
    const lastTurn = step === maxSteps
    const r = await client.messages.create({
      model, max_tokens: 1024, system, tools: TOOLS, messages: msgs,
      ...(lastTurn ? { tool_choice: { type: 'none' } } : {}),
    })

    const calls = r.content.filter((b) => b.type === 'tool_use')
    if (r.stop_reason !== 'tool_use' || !calls.length) {
      const answer = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
      return { answer: answer || '답변을 만들지 못했어요. 다시 질문해 주세요.', toolsUsed }
    }

    // Claude 가 부르겠다고 한 도구들을 실행하고 결과를 돌려줌
    msgs.push({ role: 'assistant', content: r.content })
    const results = []
    for (const call of calls) {
      toolsUsed.push(call.name)
      const { ok, result } = await runTool(call.name, call.input, ctx)
      results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(result), ...(ok ? {} : { is_error: true }) })
    }
    msgs.push({ role: 'user', content: results })
  }
  return { answer: '답변을 만들지 못했어요. 다시 질문해 주세요.', toolsUsed }
}
