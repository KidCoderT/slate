import { fonts } from '@/theme/fonts'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { marked } from 'marked'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { StyleSheet, View } from 'react-native'

function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|^\*\*|^__|\*[^*]|^[-*+]\s|^\d+\.\s|^> |^```|^`[^`]/.test(text.trim())
}

// Inject TipTap ProseMirror styles once into the document head (web only).
// Colours interpolate from theme/colors.ts — never hardcode hex here (APP_AESTHETIC §2/§12).
if (typeof document !== 'undefined') {
  const id = '__tiptap_slate_styles__'
  if (!document.getElementById(id)) {
    const el = document.createElement('style')
    el.id = id
    // Colours reference the theme CSS variables (set by ThemeProvider's vars() root), so the
    // editor content themes automatically with light/dark — inject once, no re-theme needed.
    el.textContent = `
      .ProseMirror { outline: none; font-family: ${fonts.ui}; font-size: 17px; color: rgb(var(--color-ink)); line-height: 1.6; min-height: 200px; }
      .ProseMirror p { margin-bottom: 14px; }
      .ProseMirror p:last-child { margin-bottom: 0; }
      .ProseMirror h1 { font-family: ${fonts.displayBold}; font-size: 26px; letter-spacing: -0.5px; margin: 4px 0 14px; }
      .ProseMirror h2 { font-family: ${fonts.display}; font-size: 21px; letter-spacing: -0.3px; margin: 2px 0 12px; }
      .ProseMirror h3 { font-family: ${fonts.display}; font-size: 17px; margin-bottom: 10px; }
      .ProseMirror ul, .ProseMirror ol { padding-left: 20px; margin-bottom: 14px; }
      .ProseMirror li { margin-bottom: 4px; }
      .ProseMirror code { font-family: "SF Mono","Fira Code",monospace; background: rgb(var(--color-surface-raised)); padding: 2px 5px; border-radius: 4px; font-size: 14px; }
      .ProseMirror pre { background: rgb(var(--color-surface-raised)); padding: 14px; border-radius: 10px; margin-bottom: 14px; overflow-x: auto; border: 1px solid rgb(var(--color-divider)); }
      .ProseMirror pre code { background: none; padding: 0; }
      .ProseMirror blockquote { border-left: 2px solid rgb(var(--color-crumb)); padding-left: 14px; color: rgb(var(--color-ink-muted)); font-style: italic; margin-bottom: 14px; }
      .ProseMirror strong { font-family: ${fonts.uiSemibold}; font-weight: 600; }
      .ProseMirror em { font-style: italic; }
      .ProseMirror s { text-decoration: line-through; }
      .ProseMirror hr { border: none; border-top: 1px solid rgb(var(--color-divider)); margin: 22px 0; }
      .ProseMirror a { color: rgb(var(--color-ink)); text-decoration: underline; }
    `
    document.head.appendChild(el)
  }
}

export type ToolbarAction =
  | 'bold' | 'italic' | 'strike'
  | 'h1' | 'h2' | 'h3'
  | 'bullet' | 'ordered' | 'code' | 'quote'

export type MarkdownEditorHandle = {
  execCommand: (action: ToolbarAction) => void
}

type Props = {
  content: string
  onChange: (html: string) => void
  editable?: boolean
  onEditRequest?: () => void
  style?: object
}

const MarkdownEditorWeb = forwardRef<MarkdownEditorHandle, Props>(
  ({ content, onChange, editable = true, onEditRequest, style }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: {},
          blockquote: {},
        }),
      ],
      content,
      editable,
      onUpdate({ editor }) {
        onChange(editor.getHTML())
      },
    })

    // Sync editable state when prop changes (live lock/unlock)
    useEffect(() => {
      if (editor && editor.isEditable !== editable) {
        editor.setEditable(editable)
      }
    }, [editor, editable])

    useImperativeHandle(ref, () => ({
      execCommand(action: ToolbarAction) {
        if (!editor) return
        const c = editor.chain().focus()
        if (action === 'bold') { c.toggleBold().run(); return }
        if (action === 'italic') { c.toggleItalic().run(); return }
        if (action === 'strike') { c.toggleStrike().run(); return }
        if (action === 'h1') { c.toggleHeading({ level: 1 }).run(); return }
        if (action === 'h2') { c.toggleHeading({ level: 2 }).run(); return }
        if (action === 'h3') { c.toggleHeading({ level: 3 }).run(); return }
        if (action === 'bullet') { c.toggleBulletList().run(); return }
        if (action === 'ordered') { c.toggleOrderedList().run(); return }
        if (action === 'code') { c.toggleCode().run(); return }
        if (action === 'quote') { c.toggleBlockquote().run(); return }
      },
    }))

    // Sync external content changes into the editor.
    // For read-only editors (!editable): apply — a focused but non-editable
    // editor must still receive live broadcast updates from the writer.
    // For editable editors: skip when focused so the writer's in-progress keystroke
    // is never overwritten by a race with an incoming remote sync.
    // Skip when the document already matches: setContent is a FULL ProseMirror re-parse
    // (O(doc size), resets selection/scroll). Without the guard it ran on every
    // pen acquire/release (editable flip) and on the writer's own echoed value.
    useEffect(() => {
      if (editor && (!editable || !editor.isFocused) && editor.getHTML() !== content) {
        editor.commands.setContent(content)
      }
    }, [content, editor, editable])

    // When read-only: clicking the editor fires onEditRequest (tap-to-edit)
    useEffect(() => {
      if (!editor || editable) return
      const dom = editor.view.dom as HTMLElement
      const onClick = () => onEditRequest?.()
      dom.addEventListener('click', onClick)
      return () => dom.removeEventListener('click', onClick)
    }, [editor, editable, onEditRequest])

    // Paste detection: if pasted plain text looks like markdown, convert it to HTML first
    useEffect(() => {
      if (!editor) return
      const dom = editor.view.dom as HTMLElement
      const onPaste = (e: Event) => {
        const event = e as ClipboardEvent
        const text = event.clipboardData?.getData('text/plain') ?? ''
        if (text && looksLikeMarkdown(text)) {
          event.preventDefault()
          event.stopPropagation()
          editor.commands.insertContent(marked.parse(text) as string)
        }
      }
      dom.addEventListener('paste', onPaste, { capture: true })
      return () => dom.removeEventListener('paste', onPaste, { capture: true })
    }, [editor])

    return (
      <View style={[styles.container, style]}>
        <EditorContent editor={editor} />
      </View>
    )
  },
)

MarkdownEditorWeb.displayName = 'MarkdownEditorWeb'

export { MarkdownEditorWeb }

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

