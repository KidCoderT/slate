import { hexToRgbTriplet, type ThemeColors } from '@/theme/colors'
import { useThemeColors } from '@/theme/ThemeProvider'
import React, { useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'

type Props = { children: string }

// Read-only markdown display (view mode + public viewer). Colours reference theme CSS variables
// (`rgb(var(--color-*))`) so they follow light/dark. On web the vars come from ThemeProvider's
// root; in the native WebView (an isolated document) we inject a :root var block per palette.
// Never hardcode hex here (APP_AESTHETIC §2). Reading scale mirrors the editor.
const SLATE_STYLES = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-size: 17px; color: rgb(var(--color-ink)); line-height: 1.6;
    padding: 0; margin: 0; background: rgb(var(--color-canvas));
  }
  h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin: 8px 0 14px; color: rgb(var(--color-ink)); }
  h2 { font-size: 21px; font-weight: 600; letter-spacing: -0.3px; margin: 6px 0 12px; color: rgb(var(--color-ink)); }
  h3 { font-size: 17px; font-weight: 600; margin: 4px 0 10px; color: rgb(var(--color-ink)); }
  p  { margin: 0 0 14px; }
  p:last-child { margin-bottom: 0; }
  ul, ol { padding-left: 20px; margin: 0 0 14px; }
  li { margin-bottom: 4px; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  s  { text-decoration: line-through; }
  code {
    font-family: "SF Mono", "Fira Code", monospace;
    background: rgb(var(--color-surface-raised)); padding: 2px 5px; border-radius: 4px; font-size: 14px; color: rgb(var(--color-ink));
  }
  pre { background: rgb(var(--color-surface-raised)); padding: 14px; border-radius: 10px; margin-bottom: 14px; overflow-x: auto; border: 1px solid rgb(var(--color-divider)); }
  pre code { background: none; padding: 0; }
  blockquote {
    border-left: 2px solid rgb(var(--color-crumb)); padding-left: 14px;
    color: rgb(var(--color-ink-muted)); font-style: italic; margin: 0 0 14px;
  }
  hr { border: none; border-top: 1px solid rgb(var(--color-divider)); margin: 22px 0; }
  a  { color: rgb(var(--color-ink)); text-decoration: underline; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid rgb(var(--color-divider)); font-size: 14px; }
  th { font-weight: 600; }
`

// Web: inject CSS once into document head (vars inherited from the themed app root → auto light/dark)
if (typeof document !== 'undefined') {
  const id = '__slate_renderer_styles__'
  if (!document.getElementById(id)) {
    const el = document.createElement('style')
    el.id = id
    el.textContent = SLATE_STYLES
    document.head.appendChild(el)
  }
}

// Native WebView is isolated — define the theme vars in its own :root from the active palette.
function rootVarsBlock(c: ThemeColors): string {
  return `:root{` +
    `--color-ink:${hexToRgbTriplet(c.ink)};` +
    `--color-canvas:${hexToRgbTriplet(c.canvas)};` +
    `--color-surface-raised:${hexToRgbTriplet(c.surfaceRaised)};` +
    `--color-divider:${hexToRgbTriplet(c.divider)};` +
    `--color-crumb:${hexToRgbTriplet(c.crumb)};` +
    `--color-ink-muted:${hexToRgbTriplet(c.inkMuted)};` +
    `}`
}

function buildHtmlDoc(content: string, c: ThemeColors): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${rootVarsBlock(c)}${SLATE_STYLES}</style></head><body>${content}</body></html>`
}

// Native: auto-sizing WebView — measures body height after load and resizes
function NativeHtmlRenderer({ children }: Props) {
  const [height, setHeight] = useState(200)
  const colors = useThemeColors()

  return (
    <View style={{ minHeight: height }}>
      <WebView
        source={{ html: buildHtmlDoc(children, colors) }}
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
    // React.createElement avoids JSX type errors for dangerouslySetInnerHTML.
    // color references the theme var → follows light/dark.
    return React.createElement('div', {
      dangerouslySetInnerHTML: { __html: children },
      style: { color: 'rgb(var(--color-ink))', fontSize: '17px', lineHeight: '1.6' },
    })
  }
  return <NativeHtmlRenderer>{children}</NativeHtmlRenderer>
}

const styles = StyleSheet.create({
  webView: {
    backgroundColor: 'transparent',
  },
})
