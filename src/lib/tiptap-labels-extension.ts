import Mention from '@tiptap/extension-mention'
import type { MentionOptions } from '@tiptap/extension-mention'
import { labelsApi } from '@/features/labels/api'
import type { LabelResponse } from '@/features/labels/types'

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
    this.element.style.zIndex = '10000' // 更高的 z-index
    this.element.style.pointerEvents = 'auto'
    this.element.setAttribute('data-mention-popup', 'true')
    
    // 在构造函数中添加事件委托
    this.setupEventListeners()
    
    this.update({ items })
  }
  
  setupEventListeners() {
    // 使用事件委托处理点击
    this.element.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      
      const target = e.target as HTMLElement
      const itemElement = target.closest('[data-index]') as HTMLElement
      
      if (itemElement) {
        const index = parseInt(itemElement.getAttribute('data-index') || '0')
        console.log('Mousedown on item:', index, this.items[index])
        this.selectItem(index)
      }
    })
    
    // 添加 mouseover 事件来更新选中状态
    this.element.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement
      const itemElement = target.closest('[data-index]') as HTMLElement
      
      if (itemElement) {
        const index = parseInt(itemElement.getAttribute('data-index') || '0')
        if (this.selectedIndex !== index) {
          this.selectedIndex = index
          this.render()
        }
      }
    })
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
      event.preventDefault()
      event.stopPropagation()
      this.selectItem(this.selectedIndex)
      return true
    }

    return false
  }

  selectItem(index: number) {
    const item = this.items[index]
    console.log('Selecting item:', item, 'Command exists:', !!this.command)
    
    if (item && this.command) {
      // 直接执行命令，不需要延迟
      this.command({ 
        id: item.id, 
        label: item.label 
      })
    }
  }
}

export const LabelsExtension = Mention.configure({
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
      let component: MentionList | null = null
      let containerEl: HTMLElement | null = null
      let useFixedPosition = true

      return {
        onStart: (props: any) => {
          console.log('Mention popup starting with props:', props)
          component = new MentionList({
            items: props.items,
            command: (attrs: any) => {
              console.log('Command called with attrs:', attrs)
              try {
                props.command(attrs)
              } catch (error) {
                console.error('Command execution error:', error)
              }
            }
          })
          
          // Mount inside the nearest dialog content to avoid outside-click dismissal
          const editorDom = (props?.editor?.view?.dom as HTMLElement) || null
          const dialogContent = editorDom
            ? (editorDom.closest('[data-slot="dialog-content"]') as HTMLElement | null)
            : null
          containerEl = dialogContent || editorDom?.parentElement || document.body
          useFixedPosition = containerEl === document.body

          // Ensure element is attached
          if (!containerEl.contains(component.element)) {
            containerEl.appendChild(component.element)
          }

          const rect = props.clientRect()
          if (rect) {
            // Position relative to container (absolute) if inside dialog; otherwise fixed to viewport
            component.element.style.position = useFixedPosition ? 'fixed' : 'absolute'
            const containerRect = useFixedPosition ? { left: 0, top: 0, width: window.innerWidth } as any : containerEl.getBoundingClientRect()

            let left = rect.left - containerRect.left
            let top = rect.bottom + 5 - containerRect.top

            component.element.style.left = `${left}px`
            component.element.style.top = `${top}px`
            component.element.style.zIndex = '10000'
            component.element.style.display = 'block'
            component.element.style.pointerEvents = 'auto'

            // Constrain width to container to avoid horizontal scrollbars
            const padding = 8
            const maxWidth = Math.max(200, (containerRect.width ?? containerEl.clientWidth) - padding * 2)
            component.element.style.maxWidth = `${maxWidth}px`
            component.element.style.right = 'auto'

            console.log('Positioning dropdown at:', { left, top, useFixedPosition })
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
          if (rect && component?.element && containerEl) {
            // Re-evaluate container bounds in case dialog moved/resized
            useFixedPosition = containerEl === document.body
            component.element.style.position = useFixedPosition ? 'fixed' : 'absolute'
            const containerRect = useFixedPosition ? { left: 0, top: 0, width: window.innerWidth } as any : containerEl.getBoundingClientRect()

            let left = rect.left - containerRect.left
            let top = rect.bottom + 5 - containerRect.top

            // Constrain horizontally within container
            const padding = 8
            const maxWidth = Math.max(200, (containerRect.width ?? containerEl.clientWidth) - padding * 2)
            component.element.style.maxWidth = `${maxWidth}px`

            // If element has a width, clamp left to fit within container
            const elWidth = component.element.getBoundingClientRect().width || 0
            const maxLeft = ((containerRect.width ?? containerEl.clientWidth) - elWidth - padding)
            if (!isNaN(maxLeft)) {
              left = Math.max(padding, Math.min(left, maxLeft))
            }

            component.element.style.left = `${left}px`
            component.element.style.top = `${top}px`
          }
        },

        onKeyDown: (props: any) => {
          if (props.event.key === 'Escape') {
            props.event.preventDefault()
            props.event.stopPropagation()
            return true
          }
          return component?.onKeyDown(props)
        },

        onExit: () => {
          console.log('Mention popup exiting')
          if (component?.element && component.element.parentElement) {
            component.element.parentElement.removeChild(component.element)
          }
          component = null
        },
      }
    },
  },
} as Partial<MentionOptions>)
