import {
  type ChangeEventHandler,
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { debounce } from '@/lib/utils'
import { labelsApi } from '@/features/labels/api'
import { type LabelResponse } from '@/features/labels/types'

// HTML内容安全清理函数
const sanitizeHTML = (html: string): string => {
  // TODO: 当前实现有问题，后续纠正
  return html
  // // 允许的标签和属性 - 只允许编辑器需要的基本标签
  // const allowedTags = ['a', 'span', 'div', 'br', 'p']
  // const allowedAttributes = ['data-topic', 'data-label-id', 'contenteditable', 'class']

  // // 创建一个临时DOM来解析HTML
  // const tempDiv = document.createElement('div')
  // tempDiv.innerHTML = html

  // // 递归清理节点
  // const cleanNode = (node: Element): void => {
  //   // 移除不允许的属性
  //   const attrs = Array.from(node.attributes)
  //   attrs.forEach(attr => {
  //     if (!allowedAttributes.includes(attr.name.toLowerCase())) {
  //       node.removeAttribute(attr.name)
  //     }
  //   })

  //   // 递归处理子节点
  //   Array.from(node.children).forEach(child => {
  //     if (!allowedTags.includes(child.tagName.toLowerCase())) {
  //       // 不允许的标签，保留文本内容但移除标签
  //       const textContent = child.textContent || ''
  //       const textNode = document.createTextNode(textContent)
  //       child.parentNode?.replaceChild(textNode, child)
  //     } else {
  //       cleanNode(child as Element)
  //     }
  //   })
  // }

  // // 清理所有子元素
  // Array.from(tempDiv.children).forEach(child => {
  //   if (!allowedTags.includes(child.tagName.toLowerCase())) {
  //     const textContent = child.textContent || ''
  //     const textNode = document.createTextNode(textContent)
  //     child.parentNode?.replaceChild(textNode, child)
  //   } else {
  //     cleanNode(child as Element)
  //   }
  // })

  // return tempDiv.innerHTML
}

// 配置常量
const EDITOR_CONFIG = {
  DEBOUNCE_DELAY: 100,
  CURSOR_CHECK_DELAY: 10,
  POPUP_OFFSET: 5,
  LABEL_STYLES: {
    padding: '2px 4px',
    borderRadius: '3px',
  },
  DISABLED_FORMAT_KEYS: ['b', 'i', 'u', 'k'] as const,
} as const

// 类型守卫函数
const isTextNode = (node: Node | null): node is Text => {
  return node != null && node.nodeType === Node.TEXT_NODE
}

const isValidSelection = (
  selection: Selection | null
): selection is Selection => {
  return selection != null && selection.rangeCount > 0 && selection.isCollapsed
}

const isLabelElement = (element: Element): boolean => {
  return (
    element.tagName === 'A' &&
    element.hasAttribute('data-topic') &&
    element.getAttribute('contenteditable') === 'false'
  )
}

// 获取光标前一个兄弟节点（用于 Backspace 删除）
const getPreviousSiblingAtCaret = (
  container: Node,
  offset: number
): Node | null => {
  if (isTextNode(container)) {
    // 文本节点开头，前一个兄弟
    if (offset === 0) return container.previousSibling
    return null
  }
  // 元素节点，取 offset - 1 位置的子节点
  const el = container as Element
  if (offset > 0 && el.childNodes.length >= offset) {
    return el.childNodes[offset - 1] || null
  }
  return null
}

// 获取光标后一个兄弟节点（用于 Delete 删除）
const getNextSiblingAtCaret = (
  container: Node,
  offset: number
): Node | null => {
  if (isTextNode(container)) {
    const text = container as Text
    // 文本节点末尾，后一个兄弟
    if (offset === text.length) return container.nextSibling
    return null
  }
  const el = container as Element
  return el.childNodes[offset] || null
}

// 将光标安全地放置到某个文本节点位置
const placeCaret = (node: Node | null, offset: number) => {
  if (!node) return
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.setStart(node, Math.max(0, offset))
  range.setEnd(node, Math.max(0, offset))
  selection.removeAllRanges()
  selection.addRange(range)
}

interface EditorProps {
  content?: string
  onChange?: (value: string) => void
  readonly?: boolean
  style?: CSSProperties
  className?: string
  showLabelSelector?: boolean
}

interface CursorPosition {
  left: number
  top: number
}

export function Editor(props: EditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  // 解构 props 以避免 ESLint 警告
  const { onChange, showLabelSelector, readonly, content, style, className } =
    props

  const [tagKeyword, setTagKeyword] = useState<string>()
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(
    null
  )
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showLabelsList, setShowLabelsList] = useState(false)

  // 获取光标位置的函数
  const getCursorPosition = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount || !ref.current) return null

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = ref.current.getBoundingClientRect()

    return {
      left: rect.left - containerRect.left,
      top: rect.bottom - containerRect.top + EDITOR_CONFIG.POPUP_OFFSET,
    }
  }, [])

  // 通用的文本节点查找函数
  const findTextNodeAtCursor = useCallback(
    (range: Range): { textNode: Node | null; offset: number } => {
      const startContainer = range.startContainer
      const startOffset = range.startOffset

      if (isTextNode(startContainer)) {
        return { textNode: startContainer, offset: startOffset }
      }

      // 如果不是文本节点，尝试找到相邻的文本节点
      const childNodes = Array.from(startContainer.childNodes)
      if (startOffset > 0 && isTextNode(childNodes[startOffset - 1])) {
        const textNode = childNodes[startOffset - 1]
        return { textNode, offset: textNode.textContent?.length || 0 }
      } else if (isTextNode(childNodes[startOffset])) {
        return { textNode: childNodes[startOffset], offset: 0 }
      }

      return { textNode: null, offset: 0 }
    },
    []
  )

  // 稳定的检查关键词函数
  const checkKeyWord = useCallback(() => {
    // 若未开启标签检测，直接返回
    if (showLabelSelector !== true) {
      setShowLabelsList(false)
      return
    }

    const selection = window.getSelection()
    if (!isValidSelection(selection)) {
      setShowLabelsList(false)
      return
    }

    const range = selection.getRangeAt(0)
    const { textNode, offset } = findTextNodeAtCursor(range)

    if (!isTextNode(textNode)) {
      setShowLabelsList(false)
      return
    }

    // 获取光标前面的文本内容
    const beforeCursor = textNode.textContent?.slice(0, offset) || ''

    // 检查是否包含 # 并且从 # 之后没有空格
    if (beforeCursor.includes('#')) {
      const match = beforeCursor.match(/#(\S*)$/)
      if (match) {
        const tag = match[1]
        setTagKeyword(tag)

        // 获取光标位置并显示列表
        const position = getCursorPosition()
        if (position) {
          setCursorPosition(position)
          setShowLabelsList(true)
          setSelectedIndex(0)
        }
      } else {
        setTagKeyword(undefined)
        setShowLabelsList(false)
      }
    } else {
      // 如果没有 # 标签，隐藏列表
      setShowLabelsList(false)
    }
  }, [showLabelSelector, getCursorPosition, findTextNodeAtCursor])

  // 使用 useRef 保持防抖函数的稳定引用
  const debouncedCheckKeyWordRef = useRef<
    ReturnType<typeof debounce> | undefined
  >(undefined)

  if (!debouncedCheckKeyWordRef.current && checkKeyWord) {
    debouncedCheckKeyWordRef.current = debounce(
      checkKeyWord,
      EDITOR_CONFIG.DEBOUNCE_DELAY
    )
  }

  // 当依赖变化时，更新防抖函数的内部函数
  useEffect(() => {
    if (debouncedCheckKeyWordRef.current) {
      debouncedCheckKeyWordRef.current.cancel()
      debouncedCheckKeyWordRef.current = debounce(
        checkKeyWord,
        EDITOR_CONFIG.DEBOUNCE_DELAY
      )
    }
  }, [checkKeyWord])

  const labelsResponse = useQuery({
    queryKey: ['labels', tagKeyword],
    queryFn: () => labelsApi.list(tagKeyword),
  })

  // 获取可用的标签列表
  const labels = labelsResponse.data?.data || []
  const shouldShowLabels = showLabelsList && labels.length > 0

  // 创建标签元素的辅助函数
  const createLabelElement = useCallback((labelData: LabelResponse) => {
    const labelLink = document.createElement('a')

    try {
      labelLink.setAttribute('data-topic', JSON.stringify(labelData))
      labelLink.setAttribute('data-label-id', labelData.id.toString())
    } catch (error) {
      console.error('Failed to set data-topic attribute:', error)
    }

    labelLink.setAttribute('contentEditable', 'false')

    // 创建标签内容：标签名称 + <span>话题#</span>
    const topicSpan = document.createElement('span')
    topicSpan.textContent = '[话题]#'
    topicSpan.className = 'hidden'

    const labelText = document.createTextNode(`#${labelData.name}`)

    labelLink.appendChild(labelText)
    labelLink.appendChild(topicSpan)

    // 使用 CSS 类名而不是硬编码颜色，支持暗色模式
    labelLink.className =
      'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 no-underline cursor-pointer'
    labelLink.style.textDecoration = 'none'
    labelLink.style.padding = EDITOR_CONFIG.LABEL_STYLES.padding
    labelLink.style.borderRadius = EDITOR_CONFIG.LABEL_STYLES.borderRadius
    labelLink.style.cursor = 'pointer'

    return labelLink
  }, [])

  // 选择标签的函数（简化版本）
  const selectLabel = useCallback(
    (labelData: LabelResponse) => {
      const selection = window.getSelection()
      if (!isValidSelection(selection) || !ref.current) return

      try {
        const range = selection.getRangeAt(0)
        const { textNode, offset } = findTextNodeAtCursor(range)

        if (!isTextNode(textNode)) return

        const beforeCursor = textNode.textContent?.slice(0, offset) || ''

        // 找到 # 的位置
        const hashIndex = beforeCursor.lastIndexOf('#')
        if (hashIndex === -1) return

        // 分割文本节点
        const beforeHash = textNode.textContent?.slice(0, hashIndex) || ''
        const afterCursor = textNode.textContent?.slice(offset) || ''

        // 检查是否需要在前面添加空格
        const needSpaceBefore =
          hashIndex > 0 && /\S/.test(beforeHash.charAt(beforeHash.length - 1))

        // 创建标签链接元素
        const labelLink = createLabelElement(labelData)

        // 创建新的文本节点
        const beforeNode = document.createTextNode(
          beforeHash + (needSpaceBefore ? '\u00A0' : '')
        )
        // 确保标签后总是有空格，特别是在文本末尾时
        // 使用非断行空格 (\u00A0) 确保在末尾时空格可见
        const afterText =
          afterCursor.length > 0 ? '\u00A0' + afterCursor : '\u00A0' // 非断行空格，确保在末尾可见
        const afterNode = document.createTextNode(afterText)

        // 替换原文本节点
        const parentNode = textNode.parentNode
        if (parentNode) {
          parentNode.insertBefore(beforeNode, textNode)
          parentNode.insertBefore(labelLink, textNode)
          parentNode.insertBefore(afterNode, textNode)
          parentNode.removeChild(textNode)

          // 设置光标到标签后的空格之后
          const newRange = document.createRange()
          const cursorOffset = afterCursor.length > 0 ? 1 : 1 // 总是在第一个空格后
          newRange.setStart(afterNode, cursorOffset)
          newRange.setEnd(afterNode, cursorOffset)
          selection.removeAllRanges()
          selection.addRange(newRange)
        }

        // 隐藏标签列表
        setShowLabelsList(false)
        setTagKeyword(undefined)

        // 触发 onChange - 使用安全清理后的内容
        onChange?.(sanitizeHTML(ref.current.innerHTML))
      } catch (error) {
        console.error('Error inserting label:', error)
        // 简单的错误恢复：隐藏列表
        setShowLabelsList(false)
        setTagKeyword(undefined)
      }
    },
    [onChange, findTextNodeAtCursor, createLabelElement]
  )

  const _onChange: ChangeEventHandler<HTMLDivElement> = (e) => {
    debouncedCheckKeyWordRef.current?.()

    // 使用安全清理后的内容
    onChange?.(sanitizeHTML(e.currentTarget.innerHTML))
  }

  // 安全的定时器管理 - 只管理组件内的定时器
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set())

  const safeSetTimeout = useCallback((fn: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer)
      fn()
    }, delay)
    timersRef.current.add(timer)
    return timer
  }, [])

  // 处理编辑器点击事件
  const handleClick = useCallback((event: React.MouseEvent) => {
    // 处理标签链接点击
    const target = event.target as HTMLElement
    if (target instanceof Element && isLabelElement(target)) {
      event.preventDefault()
      // 这里可以添加标签点击的自定义逻辑
      // const topicData = target.getAttribute('data-topic')
      // console.log('Label clicked:', topicData)
      // 可以触发导航到标签页面、显示相关内容等
      return
    }

    // 普通点击处理
    debouncedCheckKeyWordRef.current?.()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 如果标签列表显示，处理键盘导航
    if (shouldShowLabels) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % labels.length)
          return
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + labels.length) % labels.length)
          return
        case 'Enter':
        case 'Tab': {
          e.preventDefault()
          const selectedLabel = labels[selectedIndex]
          if (selectedLabel) {
            selectLabel(selectedLabel)
          }
          return
        }
        case 'Escape':
          e.preventDefault()
          setShowLabelsList(false)
          return
      }
    }

    // 处理删除标签的逻辑（contenteditable=false 的标签需要手动处理）
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection()
      if (isValidSelection(selection)) {
        const range = selection.getRangeAt(0)
        const container = range.startContainer
        const offset = range.startOffset

        if (e.key === 'Backspace') {
          const prev = getPreviousSiblingAtCaret(container, offset)
          if (prev instanceof Element && isLabelElement(prev)) {
            e.preventDefault()
            const parent = prev.parentNode as (Node & ParentNode) | null
            // 先移除标签
            parent?.removeChild(prev)
            // 放置光标
            if (isTextNode(container)) {
              // 常见场景：在标签后的文本节点开头
              placeCaret(container, 0)
            } else if (parent) {
              // caret 在元素节点上，尝试放在移除的标签后面的节点开头
              const el = container as Element
              const nextAfterRemoved = el.childNodes[offset] || null
              if (isTextNode(nextAfterRemoved)) {
                placeCaret(nextAfterRemoved, 0)
              } else {
                // 插入一个空文本节点用于安放光标
                const placeholder = document.createTextNode('')
                if (nextAfterRemoved) {
                  el.insertBefore(placeholder, nextAfterRemoved)
                } else {
                  el.appendChild(placeholder)
                }
                placeCaret(placeholder, 0)
              }
            }
            // 触发变更
            if (ref.current) onChange?.(sanitizeHTML(ref.current.innerHTML))
            return
          }
        } else if (e.key === 'Delete') {
          const next = getNextSiblingAtCaret(container, offset)
          if (next instanceof Element && isLabelElement(next)) {
            e.preventDefault()
            const parent = next.parentNode
            // 移除标签
            parent?.removeChild(next)
            // 删除保持原光标位置
            if (ref.current) onChange?.(sanitizeHTML(ref.current.innerHTML))
            return
          }
        }
      }
    }

    // 对于方向键，延迟检查关键词（因为光标位置会改变）
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      safeSetTimeout(() => {
        debouncedCheckKeyWordRef.current?.()
      }, EDITOR_CONFIG.CURSOR_CHECK_DELAY)
    }

    // 禁用常见的格式化快捷键
    const formatKeys = EDITOR_CONFIG.DISABLED_FORMAT_KEYS

    if (
      e.ctrlKey &&
      formatKeys.includes(e.key.toLowerCase() as (typeof formatKeys)[number])
    ) {
      e.preventDefault()
      return false
    }

    // Mac 系统使用 Cmd 键
    if (
      e.metaKey &&
      formatKeys.includes(e.key.toLowerCase() as (typeof formatKeys)[number])
    ) {
      e.preventDefault()
      return false
    }
  }

  useEffect(() => {
    if (
      ref.current &&
      content !== undefined &&
      ref.current.innerHTML !== content
    ) {
      // 设置内容时也进行安全清理
      ref.current.innerHTML = sanitizeHTML(content)
    }
  }, [content])

  // 点击外部隐藏标签列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowLabelsList(false)
      }
    }

    if (showLabelsList) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLabelsList])

  // 组件卸载时清理所有定时器
  useEffect(() => {
    const currentTimersRef = timersRef
    return () => {
      // 清理组件内的所有定时器
      const timers = currentTimersRef.current
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()

      // 取消防抖函数
      if (debouncedCheckKeyWordRef.current) {
        debouncedCheckKeyWordRef.current.cancel()
      }
    }
  }, [])

  return (
    <div className='relative'>
      <div
        ref={ref}
        contentEditable={!readonly}
        style={style}
        onInput={_onChange}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`${className ?? ''}`}
        suppressContentEditableWarning={true}
      ></div>

      {/* Labels 列表 */}
      {shouldShowLabels && cursorPosition && (
        <div
          className='absolute z-50 max-h-48 min-w-32 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800'
          style={{
            left: cursorPosition.left,
            top: cursorPosition.top,
          }}
        >
          {labels.map((label, index) => (
            <div
              key={label.id}
              className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                index === selectedIndex
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
              onClick={() => selectLabel(label)}
            >
              <span className='text-gray-500 dark:text-gray-400'>#</span>
              {label.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
