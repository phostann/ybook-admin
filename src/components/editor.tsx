import {
  type ChangeEventHandler,
  useEffect,
  useRef,
  type CSSProperties,
  useCallback,
  useState,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { debounce } from '@/lib/utils'
import { labelsApi } from '@/features/labels/api'
import { type LabelResponse } from '@/features/labels/types'

// 配置常量
const EDITOR_CONFIG = {
  DEBOUNCE_DELAY: 100,
  CURSOR_CHECK_DELAY: 10,
  POPUP_OFFSET: 5,
  LABEL_STYLES: {
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    padding: '2px 4px',
    borderRadius: '3px',
  },
  DISABLED_FORMAT_KEYS: ['b', 'i', 'u', 'k'] as const,
} as const

// 类型守卫函数
const isTextNode = (node: Node | null): node is Text => {
  return node !== null && node.nodeType === Node.TEXT_NODE
}

const isValidSelection = (
  selection: Selection | null
): selection is Selection => {
  return selection !== null && selection.rangeCount > 0 && selection.isCollapsed
}

const isLabelElement = (element: Element): boolean => {
  return element.tagName === 'A' && element.hasAttribute('data-topic')
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
    labelLink.setAttribute('data-topic', JSON.stringify(labelData))
    labelLink.setAttribute('contentEditable', 'false')

    // 创建标签内容：标签名称 + <span>话题#</span>
    const topicSpan = document.createElement('span')
    topicSpan.textContent = '话题#'
    topicSpan.style.display = 'none'

    const labelText = document.createTextNode(labelData.name)

    labelLink.appendChild(labelText)
    labelLink.appendChild(topicSpan)

    labelLink.style.color = EDITOR_CONFIG.LABEL_STYLES.color
    labelLink.style.textDecoration = 'none'
    labelLink.style.backgroundColor = EDITOR_CONFIG.LABEL_STYLES.backgroundColor
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
        const afterText = afterCursor.length > 0 
          ? ' ' + afterCursor 
          : '\u00A0'  // 非断行空格，确保在末尾可见
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
          const cursorOffset = afterCursor.length > 0 ? 1 : 1  // 总是在第一个空格后
          newRange.setStart(afterNode, cursorOffset)
          newRange.setEnd(afterNode, cursorOffset)
          selection.removeAllRanges()
          selection.addRange(newRange)
        }

        // 隐藏标签列表
        setShowLabelsList(false)
        setTagKeyword(undefined)

        // 触发 onChange
        onChange?.(ref.current.innerHTML)
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

    onChange?.(e.currentTarget.innerHTML)
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
      ref.current.innerHTML = content
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
          className='absolute z-50 max-h-48 min-w-32 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg'
          style={{
            left: cursorPosition.left,
            top: cursorPosition.top,
          }}
        >
          {labels.map((label, index) => (
            <div
              key={label.id}
              className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-blue-100 text-blue-700' : ''
              }`}
              onClick={() => selectLabel(label)}
            >
              <span className='text-gray-500'>#</span>
              {label.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
