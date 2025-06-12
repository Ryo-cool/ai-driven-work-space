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
        command: ({ editor, range, props }: any) => {
          const command = props as AICommand
          
          // 獲取選中的文本
          const { from, to } = editor.state.selection
          const selectedText = editor.state.doc.textBetween(from, to, ' ')
          
          // 刪除觸發字符
          editor.chain()
            .focus()
            .deleteRange(range)
            .run()

          // 執行 AI 命令
          command.action(selectedText).then((result) => {
            if (selectedText) {
              // 如果有選中文本，替換它
              editor.chain()
                .focus()
                .insertContentAt(
                  { from, to },
                  result
                )
                .run()
            } else {
              // 否則在當前位置插入
              editor.chain()
                .focus()
                .insertContent(result)
                .run()
            }
          }).catch(console.error)
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

export function createAICommandSuggestion(onExecute?: (command: AICommand) => void) {
  return {
    items: ({ query }: { query: string }) => {
      return import('../ai-commands').then(({ searchCommands }) => {
        return searchCommands(query)
      })
    },

    render: () => {
      let component: ReactRenderer | null = null
      let popup: TippyInstance | null = null

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(CommandPalette, {
            props: {
              query: props.query,
              onSelect: (command: AICommand) => {
                if (onExecute) {
                  onExecute(command)
                } else {
                  props.command(command)
                }
              },
            },
            editor: props.editor,
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

        onUpdate: (props: any) => {
          if (component) {
            component.updateProps({
              query: props.query,
              onSelect: (command: AICommand) => {
                if (onExecute) {
                  onExecute(command)
                } else {
                  props.command(command)
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

        onKeyDown: (props: any) => {
          if (props.event.key === 'Escape') {
            popup?.hide()
            return true
          }

          return component?.ref?.onKeyDown(props.event) || false
        },

        onExit: () => {
          popup?.destroy()
          component?.destroy()
        },
      }
    },
  }
}