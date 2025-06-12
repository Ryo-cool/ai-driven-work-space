'use client'

import { Editor } from '@tiptap/react'
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote
} from 'lucide-react'

interface ToolbarProps {
  editor: Editor | null
}

export default function Toolbar({ editor }: ToolbarProps) {
  if (!editor) {
    return null
  }

  const ToolButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    title 
  }: { 
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`
        p-2 rounded-md transition-all duration-200
        ${isActive 
          ? 'bg-blue-100 text-blue-600 shadow-inner' 
          : 'hover:bg-gray-100 text-gray-700'
        }
      `}
    >
      {children}
    </button>
  )

  return (
    <div className="flex items-center space-x-1 p-3 border-b border-gray-200 bg-gray-50/50">
      <div className="flex items-center space-x-1 pr-2 border-r border-gray-200">
        <ToolButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="粗體"
        >
          <Bold size={18} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="斜體"
        >
          <Italic size={18} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="刪除線"
        >
          <Underline size={18} />
        </ToolButton>
      </div>

      <div className="flex items-center space-x-1 px-2 border-r border-gray-200">
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="標題 1"
        >
          <Heading1 size={18} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="標題 2"
        >
          <Heading2 size={18} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="標題 3"
        >
          <Heading3 size={18} />
        </ToolButton>
      </div>

      <div className="flex items-center space-x-1 px-2">
        <ToolButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="項目符號列表"
        >
          <List size={18} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="編號列表"
        >
          <ListOrdered size={18} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="程式碼區塊"
        >
          <Code size={18} />
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="引用"
        >
          <Quote size={18} />
        </ToolButton>
      </div>
    </div>
  )
}