/**
 * Tiptap 编辑器相关工具函数
 */

/**
 * 从 HTML 内容中提取标签 ID
 * @param htmlContent - Tiptap 编辑器输出的 HTML 内容
 * @returns 标签 ID 数组
 */
export function extractLabelIdsFromHTML(htmlContent: string): number[] {
  const labelIds: number[] = []
  
  // 使用正则表达式匹配 mention 标签
  const mentionRegex = /<span[^>]*data-type="mention"[^>]*data-id="([^"]*)"[^>]*>/g
  let match
  
  while ((match = mentionRegex.exec(htmlContent)) !== null) {
    const labelId = parseInt(match[1], 10)
    if (!isNaN(labelId) && !labelIds.includes(labelId)) {
      labelIds.push(labelId)
    }
  }
  
  return labelIds
}

/**
 * 从 HTML 内容中提取纯文本（移除 HTML 标签和 mention 标记）
 * @param htmlContent - Tiptap 编辑器输出的 HTML 内容
 * @returns 纯文本内容
 */
export function extractPlainTextFromHTML(htmlContent: string): string {
  // 创建一个临时 DOM 元素来解析 HTML
  if (typeof window === 'undefined') {
    // 服务端环境的简单处理
    return htmlContent.replace(/<[^>]*>/g, '')
  }
  
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  
  // 将 mention 元素替换为 #标签名 格式
  const mentions = tempDiv.querySelectorAll('[data-type="mention"]')
  mentions.forEach((mention) => {
    const labelName = mention.getAttribute('data-label') || mention.textContent || ''
    mention.replaceWith(`#${labelName}`)
  })
  
  return tempDiv.textContent || tempDiv.innerText || ''
}

/**
 * 将带有标签的纯文本转换为 HTML（用于编辑时回填）
 * @param plainText - 包含 #标签 格式的纯文本
 * @param labelMap - 标签名到 ID 的映射
 * @returns HTML 内容
 */
export function convertPlainTextToHTML(plainText: string, labelMap: Record<string, number>): string {
  let html = plainText
  
  // 匹配 #标签名 格式
  const hashtagRegex = /#([^\s#]+)/g
  html = html.replace(hashtagRegex, (match, labelName) => {
    const labelId = labelMap[labelName]
    if (labelId) {
      return `<span data-type="mention" data-id="${labelId}" data-label="${labelName}" class="mention hashtag">${labelName}</span>`
    }
    return match
  })
  
  return `<p>${html}</p>`
}