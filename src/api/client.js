// 서버/외부 API를 부르는 함수는 모두 이 폴더(api)에 모읍니다.
// 화면(pages)에서 fetch 를 직접 쓰지 말고, 여기에 함수를 만들어 가져다 쓰세요.

// 응답을 JSON으로 읽고, 실패하면 에러를 던집니다
async function readJson(r) {
  let data
  try { data = await r.json() }
  catch { throw new Error(`서버 응답이 JSON이 아님 (${r.status})`) }
  if (!r.ok) throw new Error(data.error || r.statusText)
  return data
}

export async function get(path) {
  return readJson(await fetch(path))
}

export async function post(path, body) {
  return readJson(await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

// TODO: 날씨 조회 등 실제 API 함수는 여기에 추가
// 예) export const fetchWeather = (place = '제주시') => get(`/api/weather?place=${encodeURIComponent(place)}`)

// 동작 확인용
export const ping = () => get('/api/hello')

// Claude 에게 질문 (서버 함수 /api/agent 를 거칩니다)
export const askAgent = (message, history) => post('/api/agent', { message, history })
