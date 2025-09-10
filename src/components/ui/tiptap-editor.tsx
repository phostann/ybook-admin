import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent, Editor, type AnyExtension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'

interface TiptapEditorProps {
  content?: string
  onChange?: (content: string) => void
  onUpdate?: (editor: Editor) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  extensions?: AnyExtension[] // 支持传入自定义扩展
}

export function TiptapEditor({
  content = '',
  onChange,
  onUpdate,
  placeholder = 'Write something...',
  className,
  disabled = false,
  extensions = [], // 默认为空数组
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
      ...extensions, // 展开传入的自定义扩展
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

export default TiptapEditor