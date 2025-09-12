import { AxiosError } from 'axios'
import { toast } from 'sonner'

export function handleServerError(error: unknown) {
  // 在开发环境下记录错误信息用于调试
  if (import.meta.env.DEV) {
    console.log(error)
  }

  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'Content not found.'
  }

  if (error instanceof AxiosError) {
    errMsg = error.response?.data.title
  }

  toast.error(errMsg)
}
