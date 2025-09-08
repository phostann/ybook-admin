import type { ApiResult } from '@/lib/api-types'
import { apiClient } from '@/lib/axios'

// Auth 相关的请求和响应类型
export interface LoginRequest {
  username: string
  password: string
}

export interface UserCreateRequest {
  username: string
  email: string
  password: string
  avatar?: string
  gender?: string
  phone?: string
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

export interface LoginResponse {
  token: string
}

export interface UserResponse {
  id: number
  username: string
  email: string
  avatar?: string
  gender?: string
  phone?: string
  status: string
  createTime: string
  updateTime: string
}

// Auth API 服务
export const authApi = {
  /**
   * 用户登录
   */
  login: async (data: LoginRequest): Promise<ApiResult<LoginResponse>> => {
    const response = await apiClient.post<ApiResult<LoginResponse>>(
      '/api/auth/login',
      data
    )
    return response.data
  },

  /**
   * 用户注册
   */
  register: async (
    data: UserCreateRequest
  ): Promise<ApiResult<UserResponse>> => {
    const response = await apiClient.post<ApiResult<UserResponse>>(
      '/api/auth/register',
      data
    )
    return response.data
  },

  /**
   * 修改密码（需要认证）
   */
  changePassword: async (
    data: ChangePasswordRequest
  ): Promise<ApiResult<void>> => {
    const response = await apiClient.post<ApiResult<void>>(
      '/api/auth/change-password',
      data
    )
    return response.data
  },

  /**
   * 获取当前用户信息（需要认证）
   */
  profile: async (): Promise<ApiResult<UserResponse>> => {
    const response =
      await apiClient.get<ApiResult<UserResponse>>('/api/auth/profile')
    return response.data
  },
}
