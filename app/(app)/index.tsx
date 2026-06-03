import { FolderListItem } from '@/components/FolderListItem'
import { NoteListItem } from '@/components/NoteListItem'
import { Card } from '@/components/ui/Card'
import { FAB } from '@/components/ui/FAB'
import { ProfileButton } from '@/components/ui/ProfileButton'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { SearchBar } from '@/components/ui/SearchBar'
import { Text } from '@/components/ui/Text'
import { useProfile } from '@/hooks/useProfile'
import {
  countFilesInFolder,
  getPreview,
  getRelativeTime,
  getRootFiles,
  getRootFolders,
} from '@/lib/dummyData'
import type { File } from '@/types/db'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Platform, ScrollView, View } from 'react-native'

// TODO: FILTER FOLDER NAMES ALSO AND NESTED FOLDERS AND FILES ALSO

export default function Home() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { profile } = useProfile()

  const initial = profile?.display_name?.charAt(0).toUpperCase() ?? '?'
  const rootFolders = getRootFolders()
  const rootFiles = getRootFiles()

  const lowerSearch = search.toLowerCase()
  const filteredFiles: File[] = search.trim()
    ? rootFiles.filter(
      f =>
        f.title.toLowerCase().includes(lowerSearch) ||
        f.content.toLowerCase().includes(lowerSearch),
    )
    : rootFiles

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
                  title={file.title}
                  preview={getPreview(file.content)}
                  updatedAt={getRelativeTime(file.updated_at)}
                  showDivider={index < filteredFiles.length - 1}
                  onPress={() => router.push(`/note/${file.id}` as any)}
                  onLongPress={() => { }}
                />
              ))}
            </Card>
          ) : (
            <Text variant="caption" className="text-icon mt-2">
              No notes match "{search}"
            </Text>
          )}
        </View>
      </ScrollView>

      <FAB onPress={() => router.push('/note/new' as any)} />
    </ScreenContainer>
  )
}
