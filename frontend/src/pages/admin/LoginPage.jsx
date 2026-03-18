import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../../api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [legacyKey, setLegacyKey] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState('jwt') // 'jwt' or 'legacy'
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'legacy') {
      if (legacyKey === import.meta.env.VITE_ADMIN_KEY) {
        localStorage.setItem('adminKey', legacyKey)
        navigate('/admin')
      } else {
        setError('Invalid admin key')
      }
      return
    }

    try {
      const res = await loginUser(email, password)
      const { token, user } = res.data.data
      localStorage.setItem('token', token)
      localStorage.setItem('adminKey', 'jwt')
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Map Admin</h1>
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
          <button
            className={`tile-btn ${mode === 'jwt' ? 'active' : ''}`}
            onClick={() => setMode('jwt')}
            type="button"
          >Email</button>
          <button
            className={`tile-btn ${mode === 'legacy' ? 'active' : ''}`}
            onClick={() => setMode('legacy')}
            type="button"
          >Admin Key</button>
        </div>
        <form onSubmit={handleSubmit}>
          {mode === 'jwt' ? (
            <>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </>
          ) : (
            <input
              type="password"
              placeholder="Enter admin key"
              value={legacyKey}
              onChange={e => setLegacyKey(e.target.value)}
              autoFocus
            />
          )}
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn-primary">Login</button>
        </form>
      </div>
    </div>
  )
}
