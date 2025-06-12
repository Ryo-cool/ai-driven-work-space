'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { AICommandExtension, createAICommandSuggestion } from './extensions/AICommandExtension'
import { AICommand } from './ai-commands'
import Toolbar from './Toolbar'

interface EditorProps {
  documentId: Id<'documents'>
  userId: Id<'users'>
}

export default function Editor({ documentId, userId }: EditorProps) {
  const document = useQuery(api.documents.getDocument, { documentId })
  const updateContent = useMutation(api.documents.updateContent)

  const handleAICommand = async (command: AICommand) => {
    const { from, to } = editor?.state.selection || { from: 0, to: 0 }
    const selectedText = editor?.state.doc.textBetween(from, to, ' ') || ''
    
    try {
      const result = await command.action(selectedText, document?.content)
      
      if (selectedText) {
        editor?.chain().focus().insertContentAt({ from, to }, result).run()
      } else {
        editor?.chain().focus().insertContent(result).run()
      }
    } catch (error) {
      console.error('AI command failed:', error)
    }
  }

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
      AICommandExtension.configure({
        suggestion: createAICommandSuggestion(handleAICommand),
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
    <div className="w-full h-full bg-white rounded-lg shadow-sm flex flex-col">
      <Toolbar editor={editor} />
      <EditorContent 
        editor={editor} 
        className="w-full flex-1 overflow-y-auto"
      />
    </div>
  )
}