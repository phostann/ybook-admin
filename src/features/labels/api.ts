import type { ApiResult, PageResult } from '@/lib/api-types'
import { apiClient } from '@/lib/axios'
import type {
  LabelCreateRequest,
  LabelUpdateRequest,
  LabelResponse,
} from './types'

// Labels API 服务
export const labelsApi = {
  /**
   * 获取标签列表
   */
  list: async (name?: string): Promise<ApiResult<LabelResponse[]>> => {
    const response = await apiClient.get<ApiResult<LabelResponse[]>>(
      '/api/labels',
      { params: name ? { name } : undefined }
    )
    return response.data
  },

  /**
   * 分页获取标签列表
   */
  page: async (params: {
    current?: number
    size?: number
  }): Promise<ApiResult<PageResult<LabelResponse>>> => {
    const response = await apiClient.get<ApiResult<PageResult<LabelResponse>>>(
      '/api/labels/page',
      { params }
    )
    return response.data
  },

  /**
   * 获取标签详情
   */
  getById: async (id: number): Promise<ApiResult<LabelResponse>> => {
    const response = await apiClient.get<ApiResult<LabelResponse>>(
      `/api/labels/${id}`
    )
    return response.data
  },

  /**
   * 创建标签
   */
  create: async (
    data: LabelCreateRequest
  ): Promise<ApiResult<LabelResponse>> => {
    const response = await apiClient.post<ApiResult<LabelResponse>>(
      '/api/labels',
      data
    )
    return response.data
  },

  /**
   * 更新标签
   */
  update: async (
    id: number,
    data: LabelUpdateRequest
  ): Promise<ApiResult<LabelResponse>> => {
    const response = await apiClient.patch<ApiResult<LabelResponse>>(
      `/api/labels/${id}`,
      data
    )
    return response.data
  },

  /**
   * 删除标签
   */
  delete: async (id: number): Promise<ApiResult<boolean>> => {
    const response = await apiClient.delete<ApiResult<boolean>>(
      `/api/labels/${id}`
    )
    return response.data
  },
}