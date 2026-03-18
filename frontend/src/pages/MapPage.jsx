import { useState } from 'react'
import MapView from '../components/Map/MapView'
import CategoryFilter from '../components/Sidebar/CategoryFilter'
import { useLanguage } from '../hooks/useLanguage'

export default function MapPage() {
  const [filters, setFilters] = useState({})
  const [tileLayer, setTileLayer] = useState('osm')
  const [mapMode, setMapMode] = useState('normal') // normal, heatmap, elevation, landuse, compare
  const { lang, switchLang, t } = useLanguage()

  return (
    <div className="map-page">
      <div className="map-topbar">
        <div className="map-logo">{t('app_name')}</div>
        <div className="map-controls">
          <button
            className={`tile-btn ${tileLayer === 'osm' ? 'active' : ''}`}
            onClick={() => setTileLayer('osm')}
          >{t('map')}</button>
          <button
            className={`tile-btn ${tileLayer === 'satellite' ? 'active' : ''}`}
            onClick={() => setTileLayer('satellite')}
          >{t('satellite')}</button>

          <span style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

          <button
            className={`tile-btn ${mapMode === 'heatmap' ? 'active' : ''}`}
            onClick={() => setMapMode(mapMode === 'heatmap' ? 'normal' : 'heatmap')}
          >{t('heatmap')}</button>
          <button
            className={`tile-btn ${mapMode === 'elevation' ? 'active' : ''}`}
            onClick={() => setMapMode(mapMode === 'elevation' ? 'normal' : 'elevation')}
          >{t('elevation')}</button>
          <button
            className={`tile-btn ${mapMode === 'landuse' ? 'active' : ''}`}
            onClick={() => setMapMode(mapMode === 'landuse' ? 'normal' : 'landuse')}
          >{t('land_use')}</button>
          <button
            className={`tile-btn ${mapMode === 'compare' ? 'active' : ''}`}
            onClick={() => setMapMode(mapMode === 'compare' ? 'normal' : 'compare')}
          >{t('compare')}</button>

          <span style={{ width: '1px', height: '20px', background: 'var(--border)' }} />

          <button className="tile-btn" onClick={() => switchLang(lang === 'en' ? 'bn' : 'en')}>
            {lang === 'en' ? 'BN' : 'EN'}
          </button>

          <a href="/admin" className="admin-link">{t('admin')}</a>
        </div>
      </div>

      <div className="map-body">
        <div className="map-sidebar">
          <CategoryFilter onFilterChange={setFilters} />
        </div>

        <MapView
          filters={filters}
          tileLayer={tileLayer}
          mapMode={mapMode}
          onModeClose={() => setMapMode('normal')}
        />
      </div>
    </div>
  )
}
