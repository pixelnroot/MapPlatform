export const MAP_CONFIG = {
  defaultCenter: [23.7749, 90.3994],
  defaultZoom: 13,
  minZoom: 5,
  maxZoom: 19,
}

export const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
}

export const MIN_ZOOM_FOR_PLACES = 12
