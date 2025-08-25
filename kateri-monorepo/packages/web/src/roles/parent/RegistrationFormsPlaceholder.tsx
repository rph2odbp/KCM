import { Link, useParams } from 'react-router-dom'

export default function RegistrationFormsPlaceholder() {
  const { year, gender, sessionId, regId } = useParams()
  return (
    <section style={{ maxWidth: 720 }}>
      <h3>Registration Forms</h3>
      <p>
        Forms are coming soon. You reached this page for registration <code>{regId}</code> in
        session <code>{sessionId}</code> ({gender}) for {year}.
      </p>
      <ul>
        <li>Parent information</li>
        <li>Camper information</li>
        <li>Health and consents</li>
        <li>Payment</li>
      </ul>
      <div style={{ marginTop: 12 }}>
        <Link to="/parent">← Back to Parent Portal</Link>
      </div>
    </section>
  )
}
