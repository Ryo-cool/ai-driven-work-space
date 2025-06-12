'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

interface EditorProps {
  documentId: Id<'documents'>
  userId: Id<'users'>
}

export default function Editor({ documentId, userId }: EditorProps) {
  const document = useQuery(api.documents.getDocument, { documentId })
  const updateContent = useMutation(api.documents.updateContent)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: '開始入力或使用 "/" 呼叫 AI 助手...',
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
    ],
    content: document?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-neutral max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      updateContent({
        documentId,
        content,
        userId,
      }).catch(console.error)
    },
  })

  useEffect(() => {
    if (editor && document?.content && document.content !== editor.getHTML()) {
      editor.commands.setContent(document.content)
    }
  }, [editor, document?.content])

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-gray-500">載入中...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm">
      <EditorContent 
        editor={editor} 
        className="w-full h-full"
      />
    </div>
  )
}