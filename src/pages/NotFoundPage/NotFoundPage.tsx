import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="not-found page-width">
      <p className="not-found__code" aria-hidden="true">404</p>
      <p className="eyebrow">This scene is missing</p>
      <h1>We couldn't find that page.</h1>
      <p>The link may be out of date, but there are plenty of stories still waiting to be found.</p>
      <Link className="button button--accent" to="/">Return home</Link>
    </div>
  )
}
