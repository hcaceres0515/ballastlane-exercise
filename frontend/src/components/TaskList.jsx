const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }

export default function TaskList({ tasks, users, onEdit, onDelete, onComplete }) {
  const userName = (id) => users.find((u) => u.id === id)?.username ?? '—'

  if (!tasks.length) return <p className="empty">No tasks found.</p>

  return (
    <ul className="task-list">
      {tasks.map((t) => (
        <li key={t.id} className={`task-card status-${t.status}`}>
          <div className="task-main">
            <strong>{t.title}</strong>
            {t.description && <p>{t.description}</p>}
            <div className="task-meta">
              <span className="badge">{STATUS_LABELS[t.status] ?? t.status}</span>
              <span>Due: {t.due_date ?? '—'}</span>
              <span>Assignee: {userName(t.assignee)}</span>
            </div>
          </div>
          <div className="task-actions">
            {t.status !== 'done' && (
              <button onClick={() => onComplete(t)}>Complete</button>
            )}
            <button onClick={() => onEdit(t)}>Edit</button>
            <button className="danger" onClick={() => onDelete(t)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
