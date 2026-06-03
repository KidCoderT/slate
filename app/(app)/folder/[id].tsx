import { Breadcrumbs } from '@/components/Breadcrumbs'
import { NoteListItem } from '@/components/NoteListItem'
import { FAB } from '@/components/ui/FAB'
import {
  buildBreadcrumbs,
  getFilesInFolder,
  getFolderById,
  getPreview,
  getRelativeTime,
} from '@/lib/dummyData'
import type { File } from '@/types/db'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Platform, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const CANVAS = '#F0F1F4'
const H_PAD  = 18

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
      router.push(`/folder/${crumb.id}` as any)
    }
  }

  if (!folder) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CANVAS, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#ADADAB', fontSize: 15 }}>Folder not found.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CANVAS }}>
      <View
        style={
          Platform.OS === 'web'
            ? { flex: 1, maxWidth: 680, width: '100%', alignSelf: 'center' }
            : { flex: 1 }
        }
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: H_PAD, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Breadcrumbs ── */}
          <View style={{ marginTop: 14, marginBottom: 20 }}>
            <Breadcrumbs crumbs={crumbs} onCrumbPress={handleCrumbPress} />
          </View>

          {/* ── Folder title + meta ── */}
          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              color: '#1A1A1A',
              letterSpacing: -0.8,
              marginBottom: 4,
            }}
          >
            {folder.name}
          </Text>
          <Text style={{ fontSize: 13, color: '#ADADAB', marginBottom: 28 }}>
            {files.length} {files.length === 1 ? 'note' : 'notes'}
          </Text>

          {/* ── Files ── */}
          <View>
            <SectionLabel>Notes</SectionLabel>
            {files.length > 0 ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.07,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                {files.map((file: File, index: number) => (
                  <NoteListItem
                    key={file.id}
                    title={file.title}
                    preview={getPreview(file.content)}
                    updatedAt={getRelativeTime(file.updated_at)}
                    showDivider={index < files.length - 1}
                    onPress={() => router.push(`/note/${file.id}` as any)}
                    onLongPress={() => {}}
                  />
                ))}
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 24,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.07,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 14, color: '#ADADAB' }}>
                  No notes in this folder yet.
                </Text>
                <Text style={{ fontSize: 13, color: '#C8C8C6', marginTop: 4 }}>
                  Tap + to create the first one.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <FAB onPress={() => router.push('/note/new' as any)} />
      </View>
    </SafeAreaView>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '500',
        color: '#ADADAB',
        letterSpacing: 0.7,
        textTransform: 'uppercase',
        marginBottom: 12,
      }}
    >
      {children}
    </Text>
  )
}
