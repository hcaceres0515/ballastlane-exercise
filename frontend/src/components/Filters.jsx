export default function Filters({ filters, onChange, onClear }) {
  const handle = (e) => {
    const { name, value } = e.target
    onChange({ ...filters, [name]: value })
  }

  return (
    <div className="filters">
      <select name="status" value={filters.status} onChange={handle}>
        <option value="">All statuses</option>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
      <label>
        Due after
        <input
          type="date"
          name="due_after"
          value={filters.due_after}
          onChange={handle}
        />
      </label>
      <label>
        Due before
        <input
          type="date"
          name="due_before"
          value={filters.due_before}
          onChange={handle}
        />
      </label>
      <button type="button" onClick={onClear}>
        Clear
      </button>
    </div>
  )
}
