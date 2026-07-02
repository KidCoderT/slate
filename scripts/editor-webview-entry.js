// Entry point for the native WebView editor bundle (see build-editor-bundle.mjs).
// Bundled to a self-contained IIFE and inlined into TIPTAP_EDITOR_HTML so the
// native editor needs NO network access (previously it imported these from
// esm.sh at runtime — slow first open, dead offline, third-party SPOF).
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { marked } from 'marked'

window.__SLATE_EDITOR__ = { Editor, StarterKit, marked }
