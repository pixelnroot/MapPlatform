const cacheStore = new Map()

module.exports = function cache(ttlSeconds) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next()

    const key = req.originalUrl
    const cached = cacheStore.get(key)
    if (cached && Date.now() - cached.time < ttlSeconds * 1000) {
      return res.json(cached.data)
    }

    const originalJson = res.json.bind(res)
    res.json = (data) => {
      cacheStore.set(key, { data, time: Date.now() })
      // Evict old entries if cache grows too large
      if (cacheStore.size > 1000) {
        const oldest = cacheStore.keys().next().value
        cacheStore.delete(oldest)
      }
      return originalJson(data)
    }
    next()
  }
}
