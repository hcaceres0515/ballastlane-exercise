import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import Filters from '../components/Filters'
import LoginForm from '../components/LoginForm'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import UserForm from '../components/UserForm'

const EMPTY_FILTERS = { status: '', due_after: '', due_before: '' }

export default function Home() {
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem('access_token')
  )

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsLoggedIn(false)
    setTasks([])
    setUsers([])
  }

  const fetchUsers = useCallback(async () => {
    const { data } = await api.get('/users/')
    setUsers(data.results ?? data)
  }, [])

  const fetchTasks = useCallback(async () => {
    const params = {
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      page,
    }
    const { data } = await api.get('/tasks/', { params })
    setTasks(data.results ?? data)
    setTotalPages(Math.max(1, Math.ceil((data.count ?? 0) / 2)))
  }, [filters, page])

  const handleLogin = useCallback(() => {
    setIsLoggedIn(true)
    fetchUsers().catch(() => setError('Could not load users.'))
    fetchTasks().catch(() => setError('Could not load tasks.'))
  }, [fetchUsers, fetchTasks])

  useEffect(() => {
    if (isLoggedIn) fetchUsers().catch(() => setError('Could not load users.'))
  }, [fetchUsers, isLoggedIn])

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    if (isLoggedIn) fetchTasks().catch(() => setError('Could not load tasks.'))
  }, [fetchTasks, isLoggedIn])

  const submitTask = async (payload) => {
    try {
      setError('')
      if (editing) {
        await api.patch(`/tasks/${editing.id}/`, payload)
        setEditing(null)
      } else {
        await api.post('/tasks/', payload)
      }
      fetchTasks()
    } catch {
      setError('Could not save task.')
    }
  }

  const completeTask = async (task) => {
    try {
      await api.post(`/tasks/${task.id}/complete/`)
      fetchTasks()
    } catch {
      setError('Could not complete task.')
    }
  }

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    try {
      await api.delete(`/tasks/${task.id}/`)
      if (editing?.id === task.id) setEditing(null)
      fetchTasks()
    } catch {
      setError('Could not delete task.')
    }
  }

  const createUser = async (payload) => {
    await api.post('/users/register/', payload)
    if (isLoggedIn) fetchUsers()
  }

  return (
    <main className="container">
      <h1>Task Manager</h1>

      <section>
        <LoginForm
          isLoggedIn={isLoggedIn}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      </section>

      {error && <p className="error">{error}</p>}

      <section>
        <h2>{editing ? `Edit: ${editing.title}` : 'New task'}</h2>
        <TaskForm
          users={users}
          initial={editing}
          onSubmit={submitTask}
          onCancel={() => setEditing(null)}
        />
      </section>

      <section>
        <Filters
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />
        <TaskList
          tasks={tasks}
          users={users}
          onEdit={setEditing}
          onDelete={deleteTask}
          onComplete={completeTask}
        />
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </section>

      <section>
        <UserForm onCreated={createUser} />
      </section>
    </main>
  )
}
