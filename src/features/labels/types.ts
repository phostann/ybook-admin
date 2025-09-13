// Labels 相关的请求和响应类型
export interface LabelCreateRequest {
  name: string
}

export interface LabelUpdateRequest {
  name?: string
}

export interface LabelResponse {
  id: number
  name: string
  useCount: number
  createTime: string
  updateTime: string
}