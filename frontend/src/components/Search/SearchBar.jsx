import { useState, useRef, useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { searchPlaces } from '../../api'

export default function SearchBar() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const map = useMap()
  const timer = useRef(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const res = await searchPlaces(query)
        setResults(res.data.data || [])
        setOpen(true)
      } catch (e) {
        console.error('Search failed', e)
      }
    }, 400)
    return () => clearTimeout(timer.current)
  }, [query])

  function selectResult(place) {
    map.flyTo([place.lat, place.lng], 17, { duration: 1.2 })
    setQuery(place.name)
    setOpen(false)
  }

  return (
    <div className="search-bar-wrapper">
      <input
        type="text"
        className="search-input"
        placeholder="Search places..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && results.length > 0 && (
        <ul className="search-dropdown">
          {results.map(place => (
            <li key={place.id} onClick={() => selectResult(place)}>
              <span className="search-result-icon">
                {place.category_icon}
              </span>
              <span className="search-result-name">{place.name}</span>
              <span className="search-result-region">
                {place.region_name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
