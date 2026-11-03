// 페이지 맨 위 제목 줄. aside 를 주면 제목과 같은 줄의 오른쪽 끝에 보여줘요 (예: 마이페이지의 이메일)
export default function PageHeader({ icon, title, subtitle, aside }) {
  const heading = <h2 className="fw-bold">{icon && <i className={`bi bi-${icon} me-2 text-primary`} />}{title}</h2>
  return (
    <header className="mb-4">
      {aside ? (
        <div className="d-flex flex-wrap align-items-baseline justify-content-between column-gap-3">
          {heading}
          <span className="text-muted small text-break ms-auto">{aside}</span>
        </div>
      ) : heading}
      {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
    </header>
  )
}
