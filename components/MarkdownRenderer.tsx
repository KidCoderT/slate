import React, { useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'

type Props = { children: string }

const SLATE_STYLES = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-size: 15px; color: #1A1A1A; line-height: 1.6;
    padding: 0; margin: 0; background: transparent;
  }
  h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin: 8px 0 14px; color: #1A1A1A; }
  h2 { font-size: 18px; font-weight: 600; letter-spacing: -0.3px; margin: 6px 0 12px; color: #1A1A1A; }
  h3 { font-size: 15px; font-weight: 600; margin: 4px 0 10px; color: #1A1A1A; }
  p  { margin: 0 0 12px; }
  p:last-child { margin-bottom: 0; }
  ul, ol { padding-left: 20px; margin: 0 0 12px; }
  li { margin-bottom: 4px; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  s  { text-decoration: line-through; }
  code {
    font-family: "SF Mono", "Fira Code", monospace;
    background: #FAFAF8; padding: 2px 5px; border-radius: 4px; font-size: 13px;
  }
  pre { background: #FAFAF8; padding: 14px; border-radius: 10px; margin-bottom: 12px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote {
    border-left: 3px solid #D4D4D2; padding-left: 14px;
    color: #9E9890; font-style: italic; margin: 0 0 12px;
  }
  hr { border: none; border-top: 1px solid #E8E8E6; margin: 20px 0; }
  a  { color: #1A1A1A; text-decoration: underline; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #E8E8E6; font-size: 14px; }
  th { font-weight: 600; }
`

// Web: inject CSS once into document head
if (typeof document !== 'undefined') {
  const id = '__slate_renderer_styles__'
  if (!document.getElementById(id)) {
    const el = document.createElement('style')
    el.id = id
    el.textContent = SLATE_STYLES
    document.head.appendChild(el)
  }
}

function buildHtmlDoc(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${SLATE_STYLES}</style></head><body>${content}</body></html>`
}

// Native: auto-sizing WebView — measures body height after load and resizes
function NativeHtmlRenderer({ children }: Props) {
  const [height, setHeight] = useState(200)

  return (
    <View style={{ minHeight: height }}>
      <WebView
        source={{ html: buildHtmlDoc(children) }}
        scrollEnabled={false}
        style={[styles.webView, { height }]}
        onMessage={(e) => {
          const h = Number(e.nativeEvent.data)
          if (h > 0) setHeight(h)
        }}
        injectedJavaScript="window.ReactNativeWebView.postMessage(String(document.body.scrollHeight)); true;"
        mixedContentMode="always"
      />
    </View>
  )
}

export function MarkdownRenderer({ children }: Props) {
  if (Platform.OS === 'web') {
    // React.createElement avoids JSX type errors for dangerouslySetInnerHTML
    return React.createElement('div', {
      dangerouslySetInnerHTML: { __html: children },
      style: { color: '#1A1A1A', fontSize: '15px', lineHeight: '1.6' },
    })
  }
  return <NativeHtmlRenderer>{children}</NativeHtmlRenderer>
}

const styles = StyleSheet.create({
  webView: {
    backgroundColor: 'transparent',
  },
})
