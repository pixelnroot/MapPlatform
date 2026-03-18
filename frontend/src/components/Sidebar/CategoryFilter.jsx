import { useState, useEffect } from 'react'
import { getCategories } from '../../api'

export default function CategoryFilter({ onFilterChange }) {
  const [categories, setCategories] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getCategories()
      .then(res => setCategories(res.data.data || []))
      .catch(() => {})
  }, [])

  function handleClick(categoryId) {
    const newVal = selected === categoryId ? null : categoryId
    setSelected(newVal)
    onFilterChange({ categoryId: newVal })
  }

  return (
    <div className="category-filter">
      <button
        className={`cat-btn ${selected === null ? 'active' : ''}`}
        style={{ '--cat-color': '#3b82f6' }}
        onClick={() => handleClick(null)}
      >
        <span>🗺️</span>
        <span>All</span>
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          className={`cat-btn ${selected === cat.id ? 'active' : ''}`}
          style={{ '--cat-color': cat.color }}
          onClick={() => handleClick(cat.id)}
        >
          <span>{cat.icon}</span>
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  )
}
