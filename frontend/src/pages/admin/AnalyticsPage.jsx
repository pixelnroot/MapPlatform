import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Admin/AdminLayout'
import CategoryBarChart from '../../components/Analytics/CategoryBarChart'
import RegionCompare from '../../components/Analytics/RegionCompare'
import ScoreCard from '../../components/Analytics/ScoreCard'
import ReportButton from '../../components/Analytics/ReportButton'
import { getRegions, getRegionAnalytics, getRegionScore } from '../../api'

export default function AnalyticsPage() {
  const [regions, setRegions] = useState([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [score, setScore] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getRegions().then(res => {
      const data = res.data.data || []
      setRegions(data)
      const cities = data.filter(r => ['city', 'area', 'custom_area'].includes(r.type))
      if (cities.length > 0) setSelectedRegion(cities[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedRegion) return
    setLoading(true)
    Promise.all([
      getRegionAnalytics(selectedRegion),
      getRegionScore(selectedRegion),
    ])
      .then(([analyticsRes, scoreRes]) => {
        setAnalytics(analyticsRes.data.data)
        setScore(scoreRes.data.data)
      })
      .finally(() => setLoading(false))
  }, [selectedRegion])

  const regionName = regions.find(r => r.id === selectedRegion)?.name || ''

  return (
    <AdminLayout>
      <h1>Analytics</h1>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
          style={{ padding: '.5rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '2px' }}>
          {regions.filter(r => ['city', 'area', 'custom_area'].includes(r.type)).map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <ReportButton regionName={regionName} analytics={analytics} score={score} />
      </div>

      {loading && <div className="loading">Loading...</div>}

      {analytics && (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-value">{analytics.total_places}</div>
              <div className="stat-label">Total Places</div>
            </div>
            {analytics.density?.area_sq_km && (
              <div className="stat-card">
                <div className="stat-value">{analytics.density.area_sq_km}</div>
                <div className="stat-label">Area (sq km)</div>
              </div>
            )}
            {analytics.density?.places_per_sq_km && (
              <div className="stat-card">
                <div className="stat-value">{analytics.density.places_per_sq_km}</div>
                <div className="stat-label">Places/sq km</div>
              </div>
            )}
          </div>

          <h2>Category Breakdown</h2>
          <CategoryBarChart data={analytics.category_breakdown} />

          <h2>Source Breakdown</h2>
          <div style={{ display: 'flex', gap: '1rem', margin: '.5rem 0 1rem' }}>
            {analytics.source_breakdown.map(s => (
              <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                <span className={`source-badge ${s.source}`}>{s.source}</span>
                <span style={{ fontWeight: 600 }}>{s.count}</span>
              </div>
            ))}
          </div>

          {score && (
            <>
              <h2>Coverage Score</h2>
              <ScoreCard score={score.overall_score} breakdown={score.breakdown} />
            </>
          )}

          {analytics.road_stats?.length > 0 && (
            <>
              <h2>Road Statistics</h2>
              <table className="admin-table">
                <thead><tr><th>Type</th><th>Count</th><th>Length (m)</th></tr></thead>
                <tbody>
                  {analytics.road_stats.map(r => (
                    <tr key={r.type}><td>{r.type}</td><td>{r.count}</td><td>{r.total_length_m}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      <h2 style={{ marginTop: '2rem' }}>Region Comparison</h2>
      <RegionCompare />
    </AdminLayout>
  )
}
