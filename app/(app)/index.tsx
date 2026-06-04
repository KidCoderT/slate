import { FolderListItem } from '@/components/FolderListItem'
import { NoteListItem } from '@/components/NoteListItem'
import { Card } from '@/components/ui/Card'
import { FAB } from '@/components/ui/FAB'
import { ProfileButton } from '@/components/ui/ProfileButton'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { SearchBar } from '@/components/ui/SearchBar'
import { Text } from '@/components/ui/Text'
import { useProfileContext } from '@/context/ProfileContext'
import { useFiles } from '@/hooks/useFiles'
// Folders are still dummy — folder creation is out of scope for this milestone (TODO).
import { countFilesInFolder, getRootFolders } from '@/lib/dummyData'
import { getPreview, getRelativeTime } from '@/lib/noteFormat'
import type { File } from '@/types/db'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Platform, ScrollView, View } from 'react-native'

export default function Home() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { profile } = useProfileContext()
  const { files, createFile } = useFiles(null)  // root-level files (folder_id is null)

  const initial = profile?.display_name?.charAt(0).toUpperCase() ?? '?'
  const rootFolders = getRootFolders()

  const lowerSearch = search.toLowerCase()
  const filteredFiles: File[] = search.trim()
    ? files.filter(
      f =>
        f.title.toLowerCase().includes(lowerSearch) ||
        f.content.toLowerCase().includes(lowerSearch),
    )
    : files

  async function handleCreate() {
    const id = await createFile()
    if (id) router.push(`/note/${id}` as any)
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View className="flex-row items-center justify-between mt-3 mb-5">
          <Text
            variant="wordmark"
            style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}
          >
            Slate
          </Text>
          <ProfileButton
            initial={initial}
            onPress={() => router.push('/account')}
          />
        </View>

        {/* ── Search ── */}
        <SearchBar value={search} onChangeText={setSearch} />

        {/* ── Folders ── */}
        {rootFolders.length > 0 && (
          <View className="mt-[30px]">
            <Text variant="label" className="mb-3">Folders</Text>
            <Card noPad>
              {rootFolders.map((folder, index) => (
                <FolderListItem
                  key={folder.id}
                  name={folder.name}
                  noteCount={countFilesInFolder(folder.id)}
                  showDivider={index < rootFolders.length - 1}
                  onPress={() => router.push({ pathname: '/folder/[id]', params: { id: folder.id } })}
                />
              ))}
            </Card>
          </View>
        )}

        {/* ── Notes ── */}
        <View className="mt-[30px]">
          <Text variant="label" className="mb-3">
            {search.trim() ? `Results for "${search}"` : 'Notes'}
          </Text>
          {filteredFiles.length > 0 ? (
            <Card noPad>
              {filteredFiles.map((file, index) => (
                <NoteListItem
                  key={file.id}
                  title={file.title || 'Untitled'}
                  preview={getPreview(file.content)}
                  updatedAt={getRelativeTime(file.updated_at)}
                  showDivider={index < filteredFiles.length - 1}
                  onPress={() => router.push(`/note/${file.id}` as any)}
                  onLongPress={() => { }}
                />
              ))}
            </Card>
          ) : search.trim() ? (
            <Text variant="caption" className="text-icon mt-2">
              No notes match “{search}”
            </Text>
          ) : (
            <View className="items-center mt-8">
              <Text variant="body" className="text-ink-muted">No notes yet.</Text>
              <Text variant="caption" className="text-empty-faint mt-1">Tap + to create one.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <FAB onPress={handleCreate} />
    </ScreenContainer>
  )
}
