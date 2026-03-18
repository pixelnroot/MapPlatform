export default function CategoryBarChart({ data }) {
  if (!data || !data.length) return <p style={{ color: 'var(--text-secondary)', fontSize: '.8rem' }}>No data</p>

  const maxCount = Math.max(...data.map(d => parseInt(d.count)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
      {data.map(d => {
        const pct = maxCount > 0 ? (parseInt(d.count) / maxCount) * 100 : 0
        return (
          <div key={d.name || 'none'} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span style={{ width: '20px', textAlign: 'center' }}>{d.icon}</span>
            <span style={{ width: '100px', fontSize: '.75rem', color: 'var(--text-primary)' }}>
              {d.name || 'N/A'}
            </span>
            <div style={{ flex: 1, background: 'var(--bg-primary)', borderRadius: '2px', height: '18px', overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: d.color || 'var(--accent)',
                borderRadius: '2px',
                transition: 'width .3s ease',
                minWidth: pct > 0 ? '2px' : 0,
              }} />
            </div>
            <span style={{ width: '40px', textAlign: 'right', fontSize: '.75rem', color: 'var(--accent)' }}>
              {d.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
