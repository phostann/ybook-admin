import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/features/auth/api'

interface AuthInitializerProps {
  children: ReactNode
}

/**
 * 认证初始化组件
 * 在应用启动时检查和初始化用户认证状态
 */
export function AuthInitializer({ children }: AuthInitializerProps) {
  useEffect(() => {
    const initializeAuth = async () => {
      // 应用启动时加载存储的认证信息
      const { auth } = useAuthStore.getState()
      auth.loadFromStorage()

      // 获取最新的状态
      const { accessToken, user } = useAuthStore.getState().auth
      
      // 如果有 token 但没有用户信息，获取用户信息
      if (accessToken && !user) {
        try {
          const response = await authApi.profile()
          if (response.code === 0) {
            auth.setUser(response.data)
          } else {
            console.error('获取用户信息失败:', response.message)
            if (response.code === 40100) {
              auth.reset()
            }
          }
        } catch (error) {
          console.error('初始化用户信息失败:', error)
        }
      }
    }

    initializeAuth()
  }, []) // 空依赖数组，只在组件挂载时执行一次

  return <>{children}</>
}
