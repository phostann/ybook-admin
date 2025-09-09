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

// Additional component-specific types
export interface LabelFormData {
  name: string
}

export interface LabelDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  label?: LabelResponse | null
  mode?: 'create' | 'edit'
  onSuccess?: () => void
}

export interface LabelActionsProps {
  label: LabelResponse
  onEdit?: (label: LabelResponse) => void
  onDelete?: (id: number) => void
}