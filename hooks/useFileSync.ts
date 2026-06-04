import { useSupabase } from '@/lib/supabase'
import type { File } from '@/types/db'
import { useUser } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type FilePermission = 'owner' | 'edit' | 'view'

const AUTOSAVE_DEBOUNCE_MS = 700

/** True when the HTML carries no visible text (e.g. '' or '<p></p>'). */
function isBlankHtml(html: string): boolean {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length === 0
}

/**
 * Owns a single open note: load + debounced autosave + discard-if-empty.
 * This is the ONE place note content is read from / written to Supabase
 * (AGENTS.md principle #1). Milestone B adds presence, soft-lock, and the
 * live broadcast mirror *inside this hook* — the editor and screen do not
 * change. See LIVE_EDITING.md.
 */
export function useFileSync(id: string) {
  const { user } = useUser()
  const supabase = useSupabase()

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitleState] = useState('')
  const [content, setContentState] = useState('')
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  // Least-privilege default until the file (and any share row) loads.
  const [permission, setPermission] = useState<FilePermission>('view')

  // Refs hold the latest values for the debounced save closure.
  const titleRef = useRef('')
  const contentRef = useRef('')
  const versionRef = useRef(1)
  const dirtyRef = useRef(false)
  const deletedRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async () => {
    if (!user || deletedRef.current) return
    setSaveStatus('saving')
    const newVersion = versionRef.current + 1
    const { error: updateError } = await supabase
      .from('files')
      .update({
        title: titleRef.current,
        content: contentRef.current,
        version: newVersion,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      setSaveStatus('error')
      return
    }
    versionRef.current = newVersion
    dirtyRef.current = false
    setSaveStatus('saved')
  }, [supabase, user?.id, id])

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { save() }, AUTOSAVE_DEBOUNCE_MS)
  }, [save])

  const setTitle = useCallback((t: string) => {
    titleRef.current = t
    setTitleState(t)
    scheduleSave()
  }, [scheduleSave])

  const setContent = useCallback((c: string) => {
    contentRef.current = c
    setContentState(c)
    scheduleSave()
  }, [scheduleSave])

  // Load the note once per id. Populates refs directly so this does NOT
  // trigger an autosave (only user edits via setTitle/setContent do).
  useEffect(() => {
    let cancelled = false
    deletedRef.current = false
    dirtyRef.current = false

    async function load() {
      setLoading(true)
      const { data, error: loadError } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .single()

      if (cancelled) return
      if (loadError) {
        setError(new Error(loadError.message))
        setLoading(false)
        return
      }
      // Resolve this user's permission: owner if they own it, otherwise the
      // permission on their share row (default 'view'). Owner needs no extra query.
      let resolved: FilePermission = 'view'
      if (data.owner_id === user?.id) {
        resolved = 'owner'
      } else if (user) {
        const { data: shareRow } = await supabase
          .from('shares')
          .select('permission')
          .eq('resource_type', 'file')
          .eq('resource_id', id)
          .eq('shared_with', user.id)
          .limit(1)
          .maybeSingle()
        resolved = (shareRow?.permission as 'view' | 'edit' | undefined) ?? 'view'
      }
      if (cancelled) return

      setFile(data)
      titleRef.current = data.title
      contentRef.current = data.content
      versionRef.current = data.version
      setTitleState(data.title)
      setContentState(data.content)
      setPermission(resolved)
      setError(null)
      setSaveStatus('idle')
      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
      if (saveTimer.current) clearTimeout(saveTimer.current)
      // Flush a pending edit so nothing is lost on unmount/navigation.
      if (dirtyRef.current && !deletedRef.current) save()
    }
  }, [id, supabase, save])

  /** Delete the note if it was never given a title or body. Returns true if discarded.
   *  Call this when leaving the editor so abandoned "+" taps don't litter the workspace. */
  const discardIfEmpty = useCallback(async (): Promise<boolean> => {
    if (titleRef.current.trim() !== '' || !isBlankHtml(contentRef.current)) return false
    if (saveTimer.current) clearTimeout(saveTimer.current)
    deletedRef.current = true
    dirtyRef.current = false
    await supabase.from('files').delete().eq('id', id)
    return true
  }, [supabase, id])

  return {
    file,
    isLoading,
    error,
    title,
    setTitle,
    content,
    setContent,
    saveStatus,
    permission,
    discardIfEmpty,
  }
}
