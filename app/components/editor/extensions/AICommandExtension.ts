import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import CommandPalette from '../CommandPalette'
import { AICommand } from '../ai-commands'

export const AICommandExtension = Extension.create({
  name: 'aiCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: () => {
          // この部分はTipTapが自動的に処理する
          // 実際のコマンド実行は onSelect ハンドラで処理される
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

export function createAICommandSuggestion(commands: AICommand[], onExecute?: (command: AICommand) => void) {
  return {
    items: ({ query }: { query: string }) => {
      return Promise.resolve(
        commands.filter(command => 
          command.name.toLowerCase().includes(query.toLowerCase()) ||
          command.description.toLowerCase().includes(query.toLowerCase()) ||
          command.id.toLowerCase().includes(query.toLowerCase())
        )
      )
    },

    render: () => {
      let component: ReactRenderer | null = null
      let popup: TippyInstance | null = null

      return {
        onStart: (props: { query: string; editor: unknown; clientRect: () => DOMRect }) => {
          component = new ReactRenderer(CommandPalette, {
            props: {
              commands,
              query: props.query,
              onSelect: (command: AICommand) => {
                if (onExecute) {
                  onExecute(command)
                }
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor: props.editor as any,
          })

          popup = tippy(document.body, {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate: (props: { query: string; clientRect: () => DOMRect }) => {
          if (component) {
            component.updateProps({
              commands,
              query: props.query,
              onSelect: (command: AICommand) => {
                if (onExecute) {
                  onExecute(command)
                }
              },
            })
          }

          if (popup) {
            popup.setProps({
              getReferenceClientRect: props.clientRect,
            })
          }
        },

        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === 'Escape') {
            popup?.hide()
            return true
          }

          return false
        },

        onExit: () => {
          popup?.destroy()
          component?.destroy()
        },
      }
    },
  }
}