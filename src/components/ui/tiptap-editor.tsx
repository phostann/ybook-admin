import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'
import { labelsApi } from '@/features/labels/api'
import type { LabelResponse } from '@/features/labels/types'

interface TiptapEditorProps {
  content?: string
  onChange?: (content: string) => void
  onUpdate?: (editor: Editor) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TiptapEditor({
  content = '',
  onChange,
  onUpdate,
  placeholder = 'Write something...',
  className,
  disabled = false,
}: TiptapEditorProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention hashtag text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-medium',
        },
        renderLabel({ node }) {
          return `#${node.attrs.label}`
        },
        suggestion: {
          char: '#',
          allowedPrefixes: [' ', '\n'],
          items: async ({ query }) => {
            console.log('Mention triggered with query:', query)
            
            if (!query || query.length < 1) {
              return []
            }

            try {
              console.log('Searching labels with query:', query)
              const response = await labelsApi.list(query)
              console.log('API response:', response)
              
              if (response.code === 0 && response.data) {
                const items = response.data.map((label: LabelResponse) => ({
                  id: label.id.toString(),
                  label: label.name,
                }))
                console.log('Mapped items:', items)
                return items
              }
              return []
            } catch (error) {
              console.error('Failed to fetch labels:', error)
              return []
            }
          },

          render: () => {
            let component: any
            let popup: any

            return {
              onStart: (props: any) => {
                console.log('Mention popup starting with props:', props)
                component = new MentionList({
                  items: props.items,
                  command: (attrs: any) => {
                    console.log('Command called with attrs:', attrs)
                    // 确保在正确的上下文中执行命令
                    try {
                      props.command(attrs)
                    } catch (error) {
                      console.error('Command execution error:', error)
                    }
                  }
                })
                
                if (!document.body.contains(component.element)) {
                  document.body.appendChild(component.element)
                }

                const rect = props.clientRect()
                if (rect) {
                  component.element.style.position = 'fixed'
                  component.element.style.left = `${rect.left}px`
                  component.element.style.top = `${rect.bottom + 5}px`
                  component.element.style.zIndex = '9999'
                  component.element.style.display = 'block'
                  component.element.style.pointerEvents = 'auto'
                  console.log('Positioning dropdown at:', { left: rect.left, top: rect.bottom + 5 })
                }
              },

              onUpdate: (props: any) => {
                if (component) {
                  // 更新命令函数以保持最新的 props
                  component.command = (attrs: any) => {
                    console.log('Updated command called with attrs:', attrs)
                    try {
                      props.command(attrs)
                    } catch (error) {
                      console.error('Updated command execution error:', error)
                    }
                  }
                  component.update(props)
                }
                
                const rect = props.clientRect()
                if (rect && component?.element) {
                  component.element.style.left = `${rect.left}px`
                  component.element.style.top = `${rect.bottom + 5}px`
                }
              },

              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  return true
                }
                return component?.onKeyDown(props)
              },

              onExit: () => {
                console.log('Mention popup exiting')
                if (component?.element && document.body.contains(component.element)) {
                  document.body.removeChild(component.element)
                }
                component = null
              },
            }
          },
        },
      }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
      onUpdate?.(editor)
    },
  })

  // Update content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [editor, disabled])

  if (!isClient || !editor) {
    return (
      <div
        className={cn(
          'min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <div className="text-muted-foreground">{placeholder}</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-h-[100px] w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <EditorContent
        editor={editor}
        className="prose max-w-none p-3 focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:focus:outline-none"
      />
      <style jsx>{`
        .ProseMirror {
          outline: none !important;
        }
        .ProseMirror:focus {
          outline: none !important;
        }
        .mention.hashtag {
          color: rgb(37, 99, 235);
          background-color: rgb(239, 246, 255);
          padding: 2px 4px;
          border-radius: 4px;
          font-weight: 500;
          text-decoration: none;
        }
      `}</style>
    </div>
  )
}

class MentionList {
  items: any[] = []
  selectedIndex = 0
  element: HTMLDivElement
  command: any

  constructor({ items, command }: { items: any[], command: any }) {
    console.log('MentionList constructor - items:', items, 'command:', command)
    this.items = items
    this.command = command
    this.element = document.createElement('div')
    this.element.className = 'bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-48 overflow-auto min-w-[200px]'
    this.element.style.position = 'fixed'
    this.element.style.zIndex = '9999'
    this.element.style.pointerEvents = 'auto'
    this.update({ items })
  }

  update({ items }: { items: any[] }) {
    this.items = items
    this.selectedIndex = 0
    this.render()
  }

  render() {
    console.log('Rendering MentionList with items:', this.items)
    if (this.items.length === 0) {
      this.element.innerHTML = '<div class="px-3 py-2 text-sm text-gray-500">No labels found</div>'
      return
    }

    this.element.innerHTML = this.items
      .map((item, index) => {
        const isSelected = index === this.selectedIndex
        return `
          <div 
            class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
              isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
            }" 
            data-index="${index}"
            style="pointer-events: auto; user-select: none;"
          >
            #${item.label}
          </div>
        `
      })
      .join('')

    // 简化事件处理
    const items = this.element.querySelectorAll('[data-index]')
    items.forEach((item, idx) => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('Mousedown on item:', idx, this.items[idx])
        this.selectItem(idx)
      })
    })
  }

  onKeyDown({ event }: { event: KeyboardEvent }) {
    if (event.key === 'ArrowUp') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1)
      this.render()
      return true
    }

    if (event.key === 'ArrowDown') {
      this.selectedIndex = Math.min(this.items.length - 1, this.selectedIndex + 1)
      this.render()
      return true
    }

    if (event.key === 'Enter') {
      this.selectItem(this.selectedIndex)
      return true
    }

    return false
  }

  selectItem(index: number) {
    const item = this.items[index]
    console.log('Selecting item:', item, 'Command exists:', !!this.command)
    
    if (item && this.command) {
      // 直接调用命令，不用 try-catch 包装
      this.command({ 
        id: item.id, 
        label: item.label 
      })
    }
  }
}

export default TiptapEditor