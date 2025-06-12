'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react'
import { AI_COMMANDS, AICommand, searchCommands } from './ai-commands'
import { Loader2 } from 'lucide-react'

interface CommandPaletteProps {
  onSelect: (command: AICommand) => void
  query?: string
}

export interface CommandPaletteRef {
  onKeyDown: (event: KeyboardEvent) => boolean
}

const CommandPalette = forwardRef<CommandPaletteRef, CommandPaletteProps>(
  ({ onSelect, query = '' }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const filteredCommands = searchCommands(query)

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedIndex((prev) => 
            prev <= 0 ? filteredCommands.length - 1 : prev - 1
          )
          return true
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedIndex((prev) => 
            prev >= filteredCommands.length - 1 ? 0 : prev + 1
          )
          return true
        }

        if (event.key === 'Enter') {
          event.preventDefault()
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex])
          }
          return true
        }

        return false
      }
    }))

    useEffect(() => {
      setSelectedIndex(0)
    }, [query])

    if (filteredCommands.length === 0) {
      return (
        <div className="w-80 p-2 bg-white rounded-lg shadow-xl border border-gray-200">
          <div className="text-center py-8 text-gray-500">
            沒有找到匹配的指令
          </div>
        </div>
      )
    }

    return (
      <div className="w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        <div className="max-h-80 overflow-y-auto">
          {filteredCommands.map((command, index) => {
            const Icon = command.icon
            const isSelected = index === selectedIndex
            
            return (
              <button
                key={command.id}
                onClick={() => onSelect(command)}
                className={`
                  w-full px-4 py-3 flex items-start space-x-3 transition-colors
                  ${isSelected 
                    ? 'bg-blue-50 border-l-2 border-blue-500' 
                    : 'hover:bg-gray-50 border-l-2 border-transparent'
                  }
                `}
              >
                <div className={`
                  mt-0.5 p-1.5 rounded-md
                  ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                `}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 text-left">
                  <div className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {command.name}
                  </div>
                  <div className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                    {command.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }
)

CommandPalette.displayName = 'CommandPalette'

export default CommandPalette

export function CommandPalettePortal({ 
  referenceEl,
  show,
  query,
  onSelect,
  onClose
}: {
  referenceEl: HTMLElement | null
  show: boolean
  query: string
  onSelect: (command: AICommand) => void
  onClose: () => void
}) {
  const commandRef = useRef<CommandPaletteRef>(null)
  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 })
    ],
    whileElementsMounted: autoUpdate
  })

  useEffect(() => {
    if (referenceEl) {
      refs.setReference(referenceEl)
    }
  }, [referenceEl, refs])

  useEffect(() => {
    if (!show) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      commandRef.current?.onKeyDown(event)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [show, onClose])

  if (!show) return null

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="z-50"
    >
      <CommandPalette
        ref={commandRef}
        query={query}
        onSelect={onSelect}
      />
    </div>
  )
}