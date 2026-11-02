import { create } from 'zustand'
import { askAgent } from '../api/client'

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

  // Claude 대화 — 페이지를 옮겨도 대화가 남도록 store 에 둡니다
  messages: [],          // { role: 'user' | 'assistant', text }
  chatLoading: false,
  sendMessage: async (text) => {
    const history = get().messages.map((m) => ({ role: m.role, content: m.text }))  // Claude 형식
    set({ messages: [...get().messages, { role: 'user', text }], chatLoading: true })
    try {
      const { answer } = await askAgent(text, history)
      set({ messages: [...get().messages, { role: 'assistant', text: answer }] })
    } catch (e) {
      get().toast(e.message, 'danger')
    } finally {
      set({ chatLoading: false })
    }
  },

  // TODO: 날씨, 옷차림 추천 결과, Supabase 데이터(즐겨찾기 등) 공유 상태는 여기에 추가
}))
