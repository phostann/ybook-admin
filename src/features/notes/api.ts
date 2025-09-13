import type { ApiResult, PageResult } from '@/lib/api-types'
import { apiClient } from '@/lib/axios'
import type { LabelResponse } from '@/features/labels/types'

// 笔记类型枚举
export enum NoteType {
  IMAGE_TEXT = '1', // 图文
  VIDEO = '2', // 视频
}

// 图片信息类型，匹配API文档中的ImageInfo
export interface ImageInfo {
  url: string
  width: number
  height: number
}

// 笔记相关的请求和响应类型
export interface NoteCreateRequest {
  title: string
  content: string
  images?: ImageInfo[] // 图片信息数组，包含URL和尺寸
  video?: string
  type: NoteType
  labelIds?: number[] // 可选的标签ID数组
  ipLocation?: string // 可选的IP地址位置
}

export interface NoteUpdateRequest {
  title?: string
  content?: string
  images?: ImageInfo[] // 图片信息数组，包含URL和尺寸
  video?: string
  type?: NoteType
}

export interface NoteResponse {
  id: number
  uid: number
  title: string
  content: string
  images?: ImageInfo[] // 图片信息数组，包含URL和尺寸
  video?: string
  viewCount: number
  likeCount: number
  commentCount: number
  collectCount: number
  isTop: string // '0'-否，'1'-是
  type: NoteType
  ipLocation?: string
  labels: LabelResponse[]
  createTime: string
  updateTime: string
}

// 笔记 API 服务
export const notesApi = {
  /**
   * 获取笔记列表
   */
  list: async (): Promise<ApiResult<NoteResponse[]>> => {
    const response = await apiClient.get<ApiResult<NoteResponse[]>>(
      '/api/notes'
    )
    return response.data
  },

  /**
   * 分页获取笔记列表
   */
  page: async (params: {
    current?: number
    size?: number
  }): Promise<ApiResult<PageResult<NoteResponse>>> => {
    const response = await apiClient.get<ApiResult<PageResult<NoteResponse>>>(
      '/api/notes/page',
      { params }
    )
    return response.data
  },

  /**
   * 获取笔记详情
   */
  getById: async (id: number): Promise<ApiResult<NoteResponse>> => {
    const response = await apiClient.get<ApiResult<NoteResponse>>(
      `/api/notes/${id}`
    )
    return response.data
  },

  /**
   * 创建笔记
   */
  create: async (
    data: NoteCreateRequest
  ): Promise<ApiResult<NoteResponse>> => {
    const response = await apiClient.post<ApiResult<NoteResponse>>(
      '/api/notes',
      data
    )
    return response.data
  },

  /**
   * 更新笔记
   */
  update: async (
    id: number,
    data: NoteUpdateRequest
  ): Promise<ApiResult<NoteResponse>> => {
    const response = await apiClient.patch<ApiResult<NoteResponse>>(
      `/api/notes/${id}`,
      data
    )
    return response.data
  },

  /**
   * 删除笔记
   */
  delete: async (id: number): Promise<ApiResult<boolean>> => {
    const response = await apiClient.delete<ApiResult<boolean>>(
      `/api/notes/${id}`
    )
    return response.data
  },

  /**
   * 切换笔记置顶状态
   */
  togglePin: async (id: number): Promise<ApiResult<NoteResponse>> => {
    const response = await apiClient.post<ApiResult<NoteResponse>>(
      `/api/notes/${id}/toggle-pin`
    )
    return response.data
  },

  /**
   * 搜索笔记
   */
  search: async (params: {
    keyword: string
    current?: number
    size?: number
  }): Promise<ApiResult<PageResult<NoteResponse>>> => {
    const response = await apiClient.get<ApiResult<PageResult<NoteResponse>>>(
      '/api/notes/search',
      { params }
    )
    return response.data
  },

  /**
   * 根据标签获取笔记
   */
  getByLabel: async (labelId: number): Promise<ApiResult<NoteResponse[]>> => {
    const response = await apiClient.get<ApiResult<NoteResponse[]>>(
      `/api/notes/by-label/${labelId}`
    )
    return response.data
  },

  /**
   * 分页根据标签获取笔记
   */
  pageByLabel: async (
    labelId: number,
    params: {
      current?: number
      size?: number
    }
  ): Promise<ApiResult<PageResult<NoteResponse>>> => {
    const response = await apiClient.get<ApiResult<PageResult<NoteResponse>>>(
      `/api/notes/by-label/${labelId}/page`,
      { params }
    )
    return response.data
  },
}

// 文件上传 API 服务
export const uploadApi = {
  /**
   * 上传文件
   */
  upload: async (file: File): Promise<ApiResult<FileUploadResponse>> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<ApiResult<FileUploadResponse>>(
      '/api/files/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  /**
   * 批量上传文件
   */
  uploadMultiple: async (files: File[]): Promise<FileUploadResponse[]> => {
    const uploadPromises = files.map(file => uploadApi.upload(file))
    const results = await Promise.all(uploadPromises)
    return results.map(result => result.data)
  },
}