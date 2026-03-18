import { useState, useEffect } from 'react'
import { getRegions, compareRegions } from '../../api'

export default function RegionCompare() {
  const [regions, setRegions] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getRegions().then(res => setRegions(res.data.data || []))
  }, [])

  function toggleRegion(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(0, 4)
    )
  }

  function handleCompare() {
    if (selectedIds.length < 2) return
    setLoading(true)
    compareRegions(selectedIds.join(','))
      .then(res => setData(res.data.data))
      .finally(() => setLoading(false))
  }

  return (
    <div>
      <h3 style={{ fontSize: '.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '.5rem' }}>
        Compare Regions
      </h3>
      <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
        {regions.filter(r => ['city', 'area', 'custom_area'].includes(r.type)).map(r => (
          <button
            key={r.id}
            className={`tile-btn ${selectedIds.includes(r.id) ? 'active' : ''}`}
            onClick={() => toggleRegion(r.id)}
          >
            {r.name}
          </button>
        ))}
      </div>
      <button className="btn-primary" onClick={handleCompare} disabled={selectedIds.length < 2 || loading}>
        {loading ? 'Comparing...' : 'Compare'}
      </button>

      {data && (
        <table className="admin-table" style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Region</th><th>Total</th><th>Manual</th><th>OSM</th><th>Roads</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.region.id}>
                <td>{d.region.name}</td>
                <td>{d.total_places}</td>
                <td>{d.manual}</td>
                <td>{d.osm}</td>
                <td>{d.total_roads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
