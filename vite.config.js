import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 로컬 개발용: npm run dev 만으로 /api/*.js 서버 함수도 함께 실행합니다. (vercel dev 불필요)
// 배포(Vercel)에서는 이 플러그인이 쓰이지 않고 Vercel 이 api/ 폴더를 서버 함수로 실행합니다.
function apiDev() {
  return {
    name: 'api-dev',
    configureServer(server) {
      // .env.local 의 값(DATA_GO_KR_KEY 등)을 서버 함수가 process.env 로 읽을 수 있게 합니다
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''))

      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()
        const url = new URL(req.url, 'http://localhost')
        const name = url.pathname.slice('/api/'.length)
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(data))
        }
        if (!/^[\w-]+$/.test(name)) return res.status(404).json({ error: 'Not found' })

        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          req.query = Object.fromEntries(url.searchParams)
          if (req.method === 'POST') {
            let raw = ''
            for await (const chunk of req) raw += chunk
            req.body = raw ? JSON.parse(raw) : {}
          }
          await mod.default(req, res)
        } catch (e) {
          if (!res.writableEnded) res.status(e.code === 'ERR_LOAD_URL' ? 404 : 500).json({ error: e.message })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDev()],
})
