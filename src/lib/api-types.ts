// 通用 API 响应类型
export interface ApiResult<T = unknown> {
  code: number
  message: string
  data: T
  timestamp: number
}

// 分页结果类型
export interface PageResult<T> {
  current: number
  size: number
  total: number
  pages: number
  records: T[]
}

// 通用 API 错误类型
export interface ApiError {
  code: number
  message: string
  timestamp: number
}
