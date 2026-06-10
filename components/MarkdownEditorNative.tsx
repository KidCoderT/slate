import { TIPTAP_EDITOR_HTML } from '@/lib/tiptapEditorHtml'
import { colors } from '@/theme/colors'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import WebView, { type WebViewMessageEvent } from 'react-native-webview'
import type { MarkdownEditorHandle, ToolbarAction } from './MarkdownEditorWeb'

type Props = {
  content: string
  onChange: (html: string) => void
  editable?: boolean
  onEditRequest?: () => void
  onHeightChange?: (height: number) => void
  style?: object
}

const MarkdownEditorNative = forwardRef<MarkdownEditorHandle, Props>(
  ({ content, onChange, editable = true, onEditRequest, onHeightChange, style }, ref) => {
    const webViewRef = useRef<WebView>(null)
    // isReady ref: guards injection logic (no re-render cost)
    // editorReady state: drives the loading overlay visibility
    const isReady = useRef(false)
    const [editorReady, setEditorReady] = useState(false)
    // Keep latest content/editable in refs so handleMessage closure is always fresh
    const contentRef = useRef(content)
    const editableRef = useRef(editable)

    useEffect(() => { contentRef.current = content }, [content])
    useEffect(() => { editableRef.current = editable }, [editable])

    // Sync editable state when prop changes (live lock/unlock).
    // Guard: only inject if the editor is already ready; on mount editable=false
    // is the default so skipping is safe.
    useEffect(() => {
      if (!isReady.current) return
      webViewRef.current?.injectJavaScript(
        `window.setEditable(${editable}); true`,
      )
    }, [editable])

    // Sync content into the WebView whenever it changes AND the editor is read-only.
    // The ready handler injects content once on mount. Without this effect, subsequent
    // broadcast updates (applyRemoteContent → setContentState → prop change) are tracked
    // in contentRef but never pushed into the WebView — native observers see a frozen note.
    // Guard: skip when editable so the writer's active editor is never overwritten.
    useEffect(() => {
      if (!isReady.current || editable) return
      webViewRef.current?.injectJavaScript(
        `window.setContent(${JSON.stringify(content)}); true`,
      )
    }, [content, editable])

    useImperativeHandle(ref, () => ({
      execCommand(action: ToolbarAction) {
        webViewRef.current?.injectJavaScript(
          `window.execCommand(${JSON.stringify(action)}); true`,
        )
      },
    }))

    function handleMessage(e: WebViewMessageEvent) {
      try {
        const msg = JSON.parse(e.nativeEvent.data)

        if (msg.type === 'ready') {
          // The TipTap module has fully loaded and the editor is initialised.
          // Now it's safe to inject content and editable state.
          isReady.current = true
          setEditorReady(true)
          webViewRef.current?.injectJavaScript(
            `window.setContent(${JSON.stringify(contentRef.current)}); ` +
            `window.setEditable(${editableRef.current}); true`,
          )
          return
        }

        if (msg.type === 'content') onChange(msg.html)
        if (msg.type === 'height') onHeightChange?.(msg.height)
        if (msg.type === 'editRequest') onEditRequest?.()
        if (msg.type === 'error') console.error('[WebView]', msg.message)
      } catch { }
    }

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          source={{ html: TIPTAP_EDITOR_HTML, baseUrl: 'https://localhost/' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMessage}
          scrollEnabled={false}
          style={styles.webView}
          mixedContentMode="always"
        />
        {!editorReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colors.icon} />
          </View>
        )}
      </View>
    )
  },
)

MarkdownEditorNative.displayName = 'MarkdownEditorNative'

export { MarkdownEditorNative }

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
