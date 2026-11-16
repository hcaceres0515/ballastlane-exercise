import { useState } from 'react'

const EMPTY = { username: '', email: '', password: '' }

export default function UserForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await onCreated(form)
      setForm(EMPTY)
    } catch {
      setError('Could not create user (username may be taken).')
    }
  }

  return (
    <form className="user-form" onSubmit={handleSubmit}>
      <h3>New user</h3>
      <input
        name="username"
        placeholder="Username"
        value={form.username}
        onChange={handleChange}
        required
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
      />
      <input
        name="password"
        type="password"
        placeholder="Password (min 8)"
        value={form.password}
        onChange={handleChange}
        required
        minLength={8}
      />
      <button type="submit">Create user</button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
