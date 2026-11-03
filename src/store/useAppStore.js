import { create } from 'zustand'
import { askAgent, fetchWeather } from '../api/client'
import { placeById, placeLabel } from '../lib/places'
import { supabase } from '../lib/supabase'

// 마지막으로 본 지역을 브라우저에 기억해 두었다가 다음에 열 때 자동으로 불러옵니다
const PLACE_KEY = 'lastPlace'
function readLastPlace() {
  try {
    const saved = localStorage.getItem(PLACE_KEY)
    return saved === 'mine' || placeById(saved) ? saved : null
  } catch { return null }   // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)에서는 그냥 기억하지 않음
}
function saveLastPlace(place) {
  try { localStorage.setItem(PLACE_KEY, place) } catch { /* 저장 못 해도 앱은 그대로 */ }
}
const lastPlace = readLastPlace()

// AI 도우미에게 "지금 앱에서 보고 있는 지역"을 알려줍니다 (날씨를 불러온 뒤에만 있음)
function agentContext(state) {
  if (!state.weather) return undefined
  const spot = placeById(state.weatherPlace) ?? (state.weatherPlace === 'mine' ? state.myCoords : null)
  if (!spot) return undefined
  const lat = spot.lat, lon = spot.lon
  return { label: state.weatherPlace === 'mine' ? '내 위치' : placeLabel(state.weatherPlace), lat, lon }
}

let authStarted = false  // StrictMode 에서 두 번 불려도 한 번만 시작

// Supabase 로그인 오류를 알아보기 쉬운 한국어로
function authMessage(error) {
  const m = error.message ?? ''
  if (m.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 맞지 않아요'
  if (m.includes('Email not confirmed')) return '이메일 확인이 아직이에요. 받은 메일의 확인 링크를 눌러 주세요'
  if (m.includes('already registered')) return '이미 가입된 이메일이에요. 로그인해 주세요'
  if (m.includes('at least')) return '비밀번호는 6자 이상이어야 해요'
  if (m.includes('rate limit')) return '요청이 너무 많아요. 잠시 뒤에 다시 시도해 주세요'
  return m || '로그인 중 문제가 생겼어요'
}

// 앱 전체가 함께 쓰는 상태(store). 여러 페이지에서 같이 쓰는 데이터만 여기에 둡니다.
// (한 페이지에서만 쓰면 useState)
// 사용법:  const toast = useAppStore((s) => s.toast)
export const useAppStore = create((set, get) => ({
  // 알림(토스트) — 어느 페이지에서든 toast('메시지')
  toasts: [],
  toast: (message, variant = 'success') => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, message, variant }] })
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2500)
  },

  // 로그인 (Supabase Auth) — 앱을 열 때 initAuth() 를 한 번 불러 로그인 상태를 이어받습니다
  user: null,
  authReady: false,
  initAuth: () => {
    if (authStarted) return
    authStarted = true
    if (!supabase) return set({ authReady: true })
    supabase.auth.getSession().then(({ data }) => set({ user: data.session?.user ?? null, authReady: true }))
    supabase.auth.onAuthStateChange((_event, session) => {
      // 로그아웃하면 AI 도우미 대화도 비워서, 다음 사람 화면에 남지 않게 함
      set(session ? { user: session.user } : { user: null, messages: [], agentLeft: null })
    })
  },
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(authMessage(error))
  },
  // 이메일 확인이 켜져 있으면 바로 로그인되지 않으므로, 로그인됐는지 true/false 로 알려줍니다
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(authMessage(error))
    return Boolean(data.session)
  },
  signOut: async () => { await supabase?.auth.signOut() },

  // 내 위치 날씨 — 페이지를 옮겨도 다시 불러오지 않도록 store 에 둡니다
  weather: null,         // { nx, ny, hours: [...] }
  weatherLoading: false,
  weatherError: '',
  place: lastPlace ?? 'mine',   // 'mine'(내 위치) 또는 지역 id — 마지막으로 본 지역을 이어받음
  hasLastPlace: lastPlace !== null,   // 전에 본 지역이 있으면 홈을 열 때 날씨를 자동으로 불러옴
  myCoords: null,        // 마지막으로 확인한 내 위치 { lat, lon } — AI 도우미에게 "지금 보는 지역"을 알려줄 때 씀
  weatherPlace: 'mine',  // 지금 화면에 보이는 날씨의 지역 (고르기만 한 지역과 구분)
  selectPlace: (place) => set({ place }),   // 지역을 고르기만 함 — 날씨는 loadWeather 를 눌러야 불러옴
  loadWeather: async () => {
    if (get().weatherLoading) return   // 이미 불러오는 중이면 또 부르지 않음
    const place = get().place
    saveLastPlace(place)
    set({ weatherLoading: true, weatherError: '' })

    // 제주 지역을 골랐으면 위치 확인 없이 그 지역의 좌표로 불러옵니다
    const spot = placeById(place)
    if (spot) {
      try {
        set({ weather: await fetchWeather(spot.lat, spot.lon), weatherPlace: place })
      } catch (e) {
        set({ weatherError: e.message })
      } finally {
        set({ weatherLoading: false })
      }
      return
    }

    if (!navigator.geolocation) return set({ weatherLoading: false, weatherError: '이 브라우저는 위치 정보를 지원하지 않아요' })
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          set({ myCoords: { lat: coords.latitude, lon: coords.longitude } })
          set({ weather: await fetchWeather(coords.latitude, coords.longitude), weatherPlace: 'mine' })
        } catch (e) {
          set({ weatherError: e.message })
        } finally {
          set({ weatherLoading: false })
        }
      },
      (err) => set({
        weatherLoading: false,
        weatherError: err.code === 1 ? '위치 권한이 거부됐어요. 브라우저 주소창에서 위치 권한을 허용해 주세요' : '위치를 가져오지 못했어요',
      }),
      { timeout: 10000 },
    )
  },

  // Claude 대화 (로그인한 사람만, 하루 10번) — 페이지를 옮겨도 대화가 남도록 store 에 둡니다
  messages: [],          // { role: 'user' | 'assistant', text }
  chatLoading: false,
  agentLeft: null,       // 오늘 남은 질문 횟수 (모르면 null)
  loadAgentLeft: async () => {
    if (!supabase || !get().user) return
    const { data } = await supabase.rpc('agent_quota_left')
    if (typeof data === 'number') set({ agentLeft: data })
  },
  sendMessage: async (text) => {
    const history = get().messages.map((m) => ({ role: m.role, content: m.text }))  // Claude 형식
    set({ messages: [...get().messages, { role: 'user', text }], chatLoading: true })
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('AI 도우미는 로그인한 뒤에 이용할 수 있어요')
      const { answer, remaining, toolsUsed, pastOutfits } = await askAgent(text, history, agentContext(get()), token)
      set({ messages: [...get().messages, { role: 'assistant', text: answer, tools: toolsUsed ?? [], past: pastOutfits ?? [] }], agentLeft: remaining ?? get().agentLeft })
    } catch (e) {
      get().toast(e.message, 'danger')
      get().loadAgentLeft()   // 한도 초과 등으로 실패했을 수 있으니 남은 횟수를 다시 확인
    } finally {
      set({ chatLoading: false })
    }
  },

  // TODO: 날씨, 옷차림 추천 결과, Supabase 데이터(즐겨찾기 등) 공유 상태는 여기에 추가
}))
