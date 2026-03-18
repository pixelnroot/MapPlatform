export default function ScoreCard({ score, breakdown }) {
  if (!score && score !== 0) return null

  const circleSize = 120
  const strokeWidth = 8
  const radius = (circleSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <svg width={circleSize} height={circleSize} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={circleSize / 2} cy={circleSize / 2} r={radius}
            fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
          <circle cx={circleSize / 2} cy={circleSize / 2} r={radius}
            fill="none" stroke="var(--accent)" strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s ease' }} />
        </svg>
        <div style={{
          position: 'relative', marginTop: -circleSize / 2 - 12,
          fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)',
          textShadow: '0 0 10px rgba(0,240,255,.4)'
        }}>
          {score}
        </div>
        <div style={{ marginTop: circleSize / 2 - 20, fontSize: '.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Coverage Score
        </div>
      </div>

      {breakdown && (
        <div style={{ flex: 1, minWidth: '200px' }}>
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key} style={{ marginBottom: '.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', marginBottom: '.2rem' }}>
                <span style={{ color: 'var(--text-primary)' }}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span style={{ color: 'var(--accent)' }}>{val.score}/100</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${val.score}%`, height: '100%',
                  background: val.score >= 70 ? 'var(--neon-green)' :
                              val.score >= 40 ? 'var(--accent)' : 'var(--neon-pink)',
                  borderRadius: '3px', transition: 'width .3s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
