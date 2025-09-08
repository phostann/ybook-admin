import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const ACCESS_TOKEN = 'ybook_access_token'
const USER_INFO = 'ybook_user_info'

interface AuthUser {
  id: number
  username: string
  email: string
  avatar?: string
  gender?: string
  phone?: string
  status: string
  createTime?: string
  updateTime?: string
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
    isAuthenticated: () => boolean
    loadFromStorage: () => void
  }
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const cookieToken = getCookie(ACCESS_TOKEN)
  const cookieUser = getCookie(USER_INFO)

  const initToken = cookieToken ? JSON.parse(cookieToken) : ''
  const initUser = cookieUser ? JSON.parse(cookieUser) : null

  return {
    auth: {
      user: initUser,
      setUser: (user) =>
        set((state) => {
          if (user) {
            setCookie(USER_INFO, JSON.stringify(user))
          } else {
            removeCookie(USER_INFO)
          }
          return { ...state, auth: { ...state.auth, user } }
        }),
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN, JSON.stringify(accessToken))
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          removeCookie(USER_INFO)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
      isAuthenticated: () => {
        const { user, accessToken } = get().auth
        return !!(user && accessToken)
      },
      loadFromStorage: () => {
        const token = getCookie(ACCESS_TOKEN)
        const user = getCookie(USER_INFO)

        set((state) => ({
          ...state,
          auth: {
            ...state.auth,
            accessToken: token ? JSON.parse(token) : '',
            user: user ? JSON.parse(user) : null,
          },
        }))
      },
    },
  }
})
