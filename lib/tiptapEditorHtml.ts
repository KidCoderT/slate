import { hexToRgbTriplet, type ThemeColors } from '@/theme/colors'
import { TIPTAP_BUNDLE } from './tiptapBundle.generated'

/**
 * Self-contained HTML loaded into the native WebView for the markdown editor.
 * TipTap + marked are INLINED from lib/tiptapBundle.generated.ts (built by
 * `bun run build:editor`) — no network access needed, no CDN dependency. The
 * editor opens instantly and works offline; rebuild the bundle when bumping
 * @tiptap/* or marked.
 *
 * Colours reference theme CSS variables injected into the WebView's :root from the ACTIVE
 * palette (this document is isolated, so it can't inherit the app's vars). Built per-mount via
 * getTiptapEditorHtml(colors) — never hardcode hex here (APP_AESTHETIC §2/§12).
 *
 * Two-way contract:
 *   RN → WebView:  injectJavaScript(`window.setContent('<html>...'); true`)
 *                  injectJavaScript(`window.execCommand('bold'); true`)
 *   WebView → RN:  window.ReactNativeWebView.postMessage(
 *                    JSON.stringify({ type: 'content', html: '...', text: '...' })
 *                  )
 */
const regex = "return /^#{1,6}\\s|^\\*\\*|^__|\\*[^*]|^[-*+]\\s|^\\d+\\.\\s|^> |^```|^`[^`]/.test(text.trim())"

function rootVarsBlock(c: ThemeColors): string {
  return `:root{` +
    `--color-ink:${hexToRgbTriplet(c.ink)};` +
    `--color-canvas:${hexToRgbTriplet(c.canvas)};` +
    `--color-surface-raised:${hexToRgbTriplet(c.surfaceRaised)};` +
    `--color-divider:${hexToRgbTriplet(c.divider)};` +
    `--color-crumb:${hexToRgbTriplet(c.crumb)};` +
    `--color-ink-muted:${hexToRgbTriplet(c.inkMuted)};` +
    `--color-placeholder:${hexToRgbTriplet(c.placeholder)};` +
    `}`
}

export function getTiptapEditorHtml(c: ThemeColors): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  ${rootVarsBlock(c)}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: rgb(var(--color-canvas)); }
  body { padding: 0 2px; }
  #editor {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-size: 17px;
    color: rgb(var(--color-ink));
    caret-color: rgb(var(--color-ink));
    line-height: 1.6;
    min-height: 200px;
    cursor: text;
  }
  .ProseMirror { outline: none; min-height: 200px; }
  .ProseMirror p { margin-bottom: 14px; }
  .ProseMirror p:last-child { margin-bottom: 0; }
  .ProseMirror h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin: 4px 0 14px; color: rgb(var(--color-ink)); }
  .ProseMirror h2 { font-size: 21px; font-weight: 600; letter-spacing: -0.3px; margin: 2px 0 12px; color: rgb(var(--color-ink)); }
  .ProseMirror h3 { font-size: 17px; font-weight: 600; margin-bottom: 10px; color: rgb(var(--color-ink)); }
  .ProseMirror ul, .ProseMirror ol { padding-left: 20px; margin-bottom: 14px; }
  .ProseMirror li { margin-bottom: 4px; }
  .ProseMirror code {
    font-family: "SF Mono", "Fira Code", monospace;
    background: rgb(var(--color-surface-raised));
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 14px;
    color: rgb(var(--color-ink));
  }
  .ProseMirror pre {
    background: rgb(var(--color-surface-raised));
    padding: 14px;
    border-radius: 10px;
    margin-bottom: 14px;
    overflow-x: auto;
    border: 1px solid rgb(var(--color-divider));
  }
  .ProseMirror pre code { background: none; padding: 0; }
  .ProseMirror blockquote {
    border-left: 2px solid rgb(var(--color-crumb));
    padding-left: 14px;
    color: rgb(var(--color-ink-muted));
    font-style: italic;
    margin-bottom: 14px;
  }
  .ProseMirror strong { font-weight: 700; }
  .ProseMirror em { font-style: italic; }
  .ProseMirror s { text-decoration: line-through; }
  .ProseMirror hr { border: none; border-top: 1px solid rgb(var(--color-divider)); margin: 22px 0; }
  .ProseMirror a { color: rgb(var(--color-ink)); text-decoration: underline; }
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    color: rgb(var(--color-placeholder));
    pointer-events: none;
    float: left;
    height: 0;
  }
</style>
</head>
<body>
<div id="editor"></div>
<script>
  window.onerror = function(msg, src, line) {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: 'error', message: msg + ' (' + src + ':' + line + ')' })
    )
    return true
  }
  window.addEventListener('unhandledrejection', function(e) {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: 'error', message: String(e.reason) })
    )
  })
</script>
<script>${TIPTAP_BUNDLE}</script>
<script>
  // Provided by the inlined bundle above (scripts/editor-webview-entry.js).
  const { Editor, StarterKit, marked } = window.__SLATE_EDITOR__

  let editor = null
  let pendingContent = null
  let ready = false

  function init(initialContent) {
    editor = new Editor({
      element: document.getElementById('editor'),
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: {},
          blockquote: {},
        })
      ],
      content: initialContent || '',
      onCreate() {
        ready = true
        if (pendingContent !== null) {
          editor.commands.setContent(pendingContent)
          pendingContent = null
          postHeight()
        }
        // Signal to React Native that the editor is ready to receive content.
        // postContent() is intentionally NOT called here — it would push an empty
        // string and overwrite the content the RN side is about to inject.
        window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'ready' }))
      },
      onUpdate() {
        postContent()
        postHeight()
      },
    })
  }

  function postContent() {
    if (!editor || typeof window.ReactNativeWebView === 'undefined') return
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'content',
      html: editor.getHTML(),
      text: editor.getText(),
    }))
  }

  function postHeight() {
    requestAnimationFrame(function() {
      const h = Math.max(200, document.documentElement.scrollHeight)
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'height', height: h }))
    })
  }

  window.setContent = function(html) {
    if (ready && editor) {
      editor.commands.setContent(html || '')
      postHeight()
    } else {
      pendingContent = html || ''
    }
  }

  window.setEditable = function(val) {
    if (editor) editor.setEditable(val)
  }

  window.execCommand = function(cmd) {
    if (!editor) return
    const c = editor.chain().focus()
    if (cmd === 'bold')    { c.toggleBold().run(); return }
    if (cmd === 'italic')  { c.toggleItalic().run(); return }
    if (cmd === 'strike')  { c.toggleStrike().run(); return }
    if (cmd === 'h1')      { c.toggleHeading({ level: 1 }).run(); return }
    if (cmd === 'h2')      { c.toggleHeading({ level: 2 }).run(); return }
    if (cmd === 'h3')      { c.toggleHeading({ level: 3 }).run(); return }
    if (cmd === 'bullet')  { c.toggleBulletList().run(); return }
    if (cmd === 'ordered') { c.toggleOrderedList().run(); return }
    if (cmd === 'code')    { c.toggleCode().run(); return }
    if (cmd === 'quote')   { c.toggleBlockquote().run(); return }
  }

  function looksLikeMarkdown(text) {
    ${regex}
  }
  document.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') ?? ''
    if (text && looksLikeMarkdown(text)) {
      e.preventDefault()
      e.stopPropagation()
      if (editor) editor.commands.insertContent(marked.parse(text))
    }
  }, { capture: true })


  // Handle messages from React Native (Android uses document, iOS uses window)
  function handleMessage(e) {
    try {
      const msg = JSON.parse(e.data)
      if (msg.type === 'setContent') window.setContent(msg.content)
      if (msg.type === 'command')    window.execCommand(msg.command)
    } catch {}
  }
  document.addEventListener('message', handleMessage)
  window.addEventListener('message', handleMessage)

  init('')

  document.getElementById('editor').addEventListener('click', () => {
    if (editor && !editor.isEditable) {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'editRequest' }))
    }
  })
</script>
</body>
</html>`
}
