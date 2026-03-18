import { useState, useEffect, useCallback } from 'react'
import { loginUser, getMe } from '../api'

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then(res => setUser(res.data.data))
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('adminKey')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await loginUser(email, password)
    const { token, user: userData } = res.data.data
    localStorage.setItem('token', token)
    localStorage.setItem('adminKey', 'jwt') // backward compat flag
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('adminKey')
    setUser(null)
  }, [])

  return { user, loading, login, logout }
}
