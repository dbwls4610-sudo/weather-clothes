import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'

// 라우터의 errorElement — 없는 주소(404)와 화면을 그리다 난 오류를 구분해서 보여줍니다
export default function NotFound() {
  const error = useRouteError()
  const is404 = !error || (isRouteErrorResponse(error) && error.status === 404)

  if (is404) {
    return (
      <div className="text-center py-5">
        <div className="display-1 text-primary">404</div>
        <p className="lead">없는 페이지예요.</p>
        <Link to="/" className="btn btn-primary"><i className="bi bi-house me-1" />홈으로</Link>
      </div>
    )
  }

  return (
    <div className="text-center py-5">
      <div className="display-1 text-danger"><i className="bi bi-exclamation-triangle" /></div>
      <p className="lead">화면을 그리다 문제가 생겼어요.</p>
      <pre className="small text-start d-inline-block text-danger">{String(error?.message ?? error)}</pre>
      <div><Link to="/" className="btn btn-primary"><i className="bi bi-house me-1" />홈으로</Link></div>
    </div>
  )
}
