import {
  type ChangeEventHandler,
  useEffect,
  useRef,
  type CSSProperties,
} from 'react'

interface EditorProps {
  content?: string
  onChange?: (value: string) => void
  readonly?: boolean
  style?: CSSProperties
  className?: string
}

export function Editor(props: EditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  const _onChange: ChangeEventHandler<HTMLDivElement> = (e) => {
    checkKeyWord()

    props.onChange?.(e.currentTarget.innerHTML)
  }

  const onClick = () => {
    checkKeyWord()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 禁用常见的格式化快捷键
    const formatKeys = ['b', 'i', 'u', 'k'] // k 是链接

    if (e.ctrlKey && formatKeys.includes(e.key.toLowerCase())) {
      e.preventDefault()
      return false
    }

    // Mac 系统使用 Cmd 键
    if (e.metaKey && formatKeys.includes(e.key.toLowerCase())) {
      e.preventDefault()
      return false
    }
  }

  const checkKeyWord = () => {
    // 获取选择对象
    const selection = window.getSelection()
    if (!selection) return

    // 如果有选中文本，不处理标签检测
    if (!selection.isCollapsed) {
      return
    }

    // 获取光标位置
    const range = selection.getRangeAt(0)
    const cursorPosition = range.startOffset

    // 获取光标前面的内容
    const beforeCursor = ref.current?.innerText.slice(0, cursorPosition)
    console.log('beforeCursor', beforeCursor)

    // 如果光标之前的内容包含 # 并且从 # 之后没有空格，则打印从 # 到光标位置的内容
    if (beforeCursor?.includes('#')) {
      const match = beforeCursor?.match(/#(\S*)$/)
      if (match) {
        const tag = match[1]
        console.log('tag', tag)
      }
    }
  }

  useEffect(() => {
    if (
      ref.current &&
      props.content !== undefined &&
      ref.current.innerHTML !== props.content
    ) {
      ref.current.innerHTML = props.content
    }
  }, [props.content])

  return (
    <div
      ref={ref}
      contentEditable={!props.readonly}
      style={props.style}
      onInput={_onChange}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`${props.className ?? ''}`}
      suppressContentEditableWarning={true}
    ></div>
  )
}
