import { useState } from 'react'
import api from '../api'

export default function LoginForm({ onLogin, onLogout, isLoggedIn }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  if (isLoggedIn) {
    return (
      <div className="login-bar">
        <span>Logged in</span>
        <button type="button" onClick={onLogout}>
          Log out
        </button>
      </div>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/token/', form)
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      onLogin()
    } catch {
      setError('Invalid credentials.')
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h3>Log in</h3>
      <input
        name="username"
        placeholder="Username"
        value={form.username}
        onChange={handleChange}
        required
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
        required
      />
      <button type="submit">Log in</button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
