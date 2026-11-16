import { useEffect, useState } from 'react'

const EMPTY = { title: '', description: '', status: 'todo', due_date: '', assignee: '' }

export default function TaskForm({ users, initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    setForm(initial ? { ...EMPTY, ...initial, assignee: initial.assignee ?? '', due_date: initial.due_date ?? '' } : EMPTY)
  }, [initial])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      due_date: form.due_date || null,
      assignee: form.assignee || null,
    }
    onSubmit(payload)
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        name="title"
        placeholder="Title"
        value={form.title}
        onChange={handleChange}
        required
      />
      <textarea
        name="description"
        placeholder="Description"
        value={form.description}
        onChange={handleChange}
      />
      <select name="status" value={form.status} onChange={handleChange}>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
      <input
        type="date"
        name="due_date"
        value={form.due_date}
        onChange={handleChange}
      />
      <select name="assignee" value={form.assignee} onChange={handleChange}>
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.username}
          </option>
        ))}
      </select>
      <div className="form-actions">
        <button type="submit">{initial ? 'Update' : 'Create'} Task</button>
        {initial && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
