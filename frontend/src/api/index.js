import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Add JWT token or admin key to admin requests
// Key is NEVER baked into the frontend build — always read from localStorage at runtime
adminApi.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else {
    const storedKey = localStorage.getItem('adminKey')
    if (storedKey) config.headers['x-admin-key'] = storedKey
  }
  return config
})

// Public endpoints
export const getPlaces = (bbox, params) =>
  api.get('/api/places', { params: { bbox, ...params } })

export const getPlace = (id) =>
  api.get(`/api/places/${id}`)

export const getRoads = (bbox) =>
  api.get('/api/roads', { params: { bbox } })

export const getRegions = () =>
  api.get('/api/regions')

export const getCategories = () =>
  api.get('/api/categories')

export const searchPlaces = (q, region_id) =>
  api.get('/api/search', { params: { q, region_id } })

// Auth endpoints
export const loginUser = (email, password) =>
  api.post('/api/auth/login', { email, password })

export const verifyAdminKey = (key) =>
  api.post('/api/auth/verify-key', { key })

export const getMe = () =>
  adminApi.get('/api/auth/me')

// Admin endpoints
export const createPlace = (data) =>
  adminApi.post('/api/places', data)

export const updatePlace = (id, data) =>
  adminApi.put(`/api/places/${id}`, data)

export const deletePlace = (id) =>
  adminApi.delete(`/api/places/${id}`)

export const uploadPhoto = (placeId, formData) =>
  adminApi.post(`/api/places/${placeId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

export const getStats = () =>
  adminApi.get('/api/admin/stats')

export const getAdminPlaces = (params) =>
  adminApi.get('/api/places', { params })

export const createCategory = (data) =>
  adminApi.post('/api/categories', data)

export const updateCategory = (id, data) =>
  adminApi.put(`/api/categories/${id}`, data)

export const deleteCategory = (id) =>
  adminApi.delete(`/api/categories/${id}`)

// User management
export const getUsers = () =>
  adminApi.get('/api/users')

export const createUser = (data) =>
  adminApi.post('/api/users', data)

export const updateUser = (id, data) =>
  adminApi.put(`/api/users/${id}`, data)

export const deleteUser = (id) =>
  adminApi.delete(`/api/users/${id}`)

// Activity log
export const getActivity = (limit) =>
  adminApi.get('/api/admin/activity', { params: { limit } })

// Analytics
export const getRegionAnalytics = (id) =>
  adminApi.get(`/api/analytics/region/${id}`)

export const compareRegions = (regionIds) =>
  adminApi.get('/api/analytics/compare', { params: { region_ids: regionIds } })

export const getNearestPlaces = (lat, lng, params) =>
  adminApi.get('/api/analytics/nearest', { params: { lat, lng, ...params } })

export const getCatchment = (lat, lng, radius) =>
  adminApi.get('/api/analytics/catchment', { params: { lat, lng, radius } })

export const getRegionScore = (regionId) =>
  adminApi.get(`/api/analytics/score/${regionId}`)

// Export
export const exportPlaces = (format, params) =>
  adminApi.get('/api/export/places', { params: { format, ...params }, responseType: format === 'csv' ? 'blob' : 'json' })

// Import
export const importPlaces = (formData) =>
  adminApi.post('/api/import/places', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

// Terrain
export const getElevation = (lat, lng) =>
  api.get('/api/terrain/elevation', { params: { lat, lng } })

export const getElevationProfile = (points) =>
  api.post('/api/terrain/profile', { points })

// Land use
export const getLandUse = (bbox, type) =>
  api.get('/api/landuse', { params: { bbox, type } })

// Tasks
export const getTasks = (params) =>
  adminApi.get('/api/tasks', { params })

export const createTask = (data) =>
  adminApi.post('/api/tasks', data)

export const updateTask = (id, data) =>
  adminApi.put(`/api/tasks/${id}`, data)

export const deleteTask = (id) =>
  adminApi.delete(`/api/tasks/${id}`)

// Flags
export const getFlags = (params) =>
  adminApi.get('/api/flags', { params })

export const createFlag = (data) =>
  api.post('/api/flags', data)

export const updateFlag = (id, data) =>
  adminApi.put(`/api/flags/${id}`, data)

export const autoFlag = () =>
  adminApi.post('/api/flags/auto')

// API Keys
export const getApiKeys = () =>
  adminApi.get('/api/api-keys')

export const createApiKey = (data) =>
  adminApi.post('/api/api-keys', data)

export const updateApiKey = (id, data) =>
  adminApi.put(`/api/api-keys/${id}`, data)

export const deleteApiKey = (id) =>
  adminApi.delete(`/api/api-keys/${id}`)

// Regions (custom areas)
export const createRegion = (data) =>
  adminApi.post('/api/regions', data)

export const deleteRegion = (id) =>
  adminApi.delete(`/api/regions/${id}`)

// Clusters
export const getClusters = (bbox, zoom, params) =>
  api.get('/api/places', { params: { bbox, cluster: 'true', zoom, ...params } })
