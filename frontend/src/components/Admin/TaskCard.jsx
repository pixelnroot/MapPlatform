const priorityColors = {
  low: 'var(--text-secondary)',
  medium: 'var(--accent)',
  high: '#F97316',
  urgent: 'var(--neon-pink)',
}

export default function TaskCard({ task, onStatusChange }) {
  const nextStatus = {
    pending: 'in_progress',
    in_progress: 'completed',
    completed: 'pending',
  }

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '4px',
      padding: '1rem',
      borderLeft: `3px solid ${priorityColors[task.priority] || 'var(--accent)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
        <strong style={{ fontSize: '.85rem' }}>{task.title}</strong>
        <span style={{
          fontSize: '.65rem',
          textTransform: 'uppercase',
          padding: '.15rem .4rem',
          borderRadius: '2px',
          background: task.status === 'completed' ? 'rgba(0,255,157,.1)' :
                      task.status === 'in_progress' ? 'rgba(0,240,255,.1)' : 'rgba(255,255,255,.05)',
          color: task.status === 'completed' ? 'var(--neon-green)' :
                 task.status === 'in_progress' ? 'var(--accent)' : 'var(--text-secondary)',
        }}>
          {task.status}
        </span>
      </div>
      {task.description && (
        <p style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: '.5rem' }}>{task.description}</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.7rem', color: 'var(--text-secondary)' }}>
        <span>
          {task.assigned_to_name && `Assigned: ${task.assigned_to_name}`}
          {task.due_date && ` | Due: ${new Date(task.due_date).toLocaleDateString()}`}
        </span>
        {onStatusChange && task.status !== 'cancelled' && (
          <button
            className="btn-primary"
            style={{ padding: '.2rem .5rem', fontSize: '.65rem' }}
            onClick={() => onStatusChange(task.id, nextStatus[task.status])}
          >
            {task.status === 'pending' ? 'Start' : task.status === 'in_progress' ? 'Complete' : 'Reopen'}
          </button>
        )}
      </div>
    </div>
  )
}
