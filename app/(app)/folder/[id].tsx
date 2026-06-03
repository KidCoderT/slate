import { Breadcrumbs } from '@/components/Breadcrumbs'
import { NoteListItem } from '@/components/NoteListItem'
import { Card } from '@/components/ui/Card'
import { FAB } from '@/components/ui/FAB'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { Text } from '@/components/ui/Text'
import {
  buildBreadcrumbs,
  getFilesInFolder,
  getFolderById,
  getPreview,
  getRelativeTime,
} from '@/lib/dummyData'
import type { File } from '@/types/db'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScrollView, View } from 'react-native'

export default function FolderView() {
  const { id }  = useLocalSearchParams<{ id: string }>()
  const router  = useRouter()

  const folder = getFolderById(id)
  const files  = getFilesInFolder(id)
  const crumbs = buildBreadcrumbs(id)

  function handleCrumbPress(crumb: { id: string | null; name: string }) {
    if (crumb.id === null) {
      router.push('/')
    } else {
      router.push({ pathname: '/folder/[id]', params: { id: crumb.id! } })
    }
  }

  if (!folder) {
    return (
      <ScreenContainer padded>
        <View className="flex-1 items-center justify-center">
          <Text variant="body">Folder not found.</Text>
        </View>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Breadcrumbs ── */}
        <View className="mt-[14px] mb-5">
          <Breadcrumbs crumbs={crumbs} onCrumbPress={handleCrumbPress} />
        </View>

        {/* ── Folder title + meta ── */}
        <Text variant="heading" className="mb-1">{folder.name}</Text>
        <Text variant="caption" className="text-icon mb-7">
          {files.length} {files.length === 1 ? 'note' : 'notes'}
        </Text>

        {/* ── Files ── */}
        <View>
          <Text variant="label" className="mb-3">Notes</Text>
          {files.length > 0 ? (
            <Card noPad>
              {files.map((file: File, index: number) => (
                <NoteListItem
                  key={file.id}
                  title={file.title}
                  preview={getPreview(file.content)}
                  updatedAt={getRelativeTime(file.updated_at)}
                  showDivider={index < files.length - 1}
                  onPress={() => router.push(`/note/${file.id}` as any)}  // TODO: remove cast when note/[id].tsx is created
                  onLongPress={() => {}}
                />
              ))}
            </Card>
          ) : (
            <Card className="items-center">
              <Text variant="caption" className="text-icon">No notes in this folder yet.</Text>
              <Text variant="caption" className="text-empty-faint mt-1">Tap + to create the first one.</Text>
            </Card>
          )}
        </View>
      </ScrollView>

      <FAB onPress={() => router.push('/note/new' as any)} />
    </ScreenContainer>
  )
}
