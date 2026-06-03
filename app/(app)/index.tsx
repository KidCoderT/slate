import { FolderChip } from '@/components/FolderChip'
import { NoteListItem } from '@/components/NoteListItem'
import { FAB } from '@/components/ui/FAB'
import { Grid } from '@/components/ui/Grid'
import { ProfileButton } from '@/components/ui/ProfileButton'
import { SearchBar } from '@/components/ui/SearchBar'
import { useProfile } from '@/hooks/useProfile'
import {
  countFilesInFolder,
  getPreview,
  getRelativeTime,
  getRootFiles,
  getRootFolders,
} from '@/lib/dummyData'
import type { File, Folder } from '@/types/db'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Platform, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// ─────────────────────────────────────────────────────────────────────────────

const CANVAS = '#F0F1F4'
const GAP    = 10
const H_PAD  = 18

// TODO: FILTER FOLDER NAMES ALSO AND NESTED FOLDERS AND FILES ALSO

export default function Home() {
  const router              = useRouter()
  const [search, setSearch] = useState('')
  const { profile }         = useProfile()

  const initial      = profile?.display_name?.charAt(0).toUpperCase() ?? '?'
  const rootFolders  = getRootFolders()
  const rootFiles    = getRootFiles()

  const lowerSearch   = search.toLowerCase()
  const filteredFiles: File[] = search.trim()
    ? rootFiles.filter(
        f =>
          f.title.toLowerCase().includes(lowerSearch) ||
          f.content.toLowerCase().includes(lowerSearch),
      )
    : rootFiles

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
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ── */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
              marginBottom: 20,
            }}
            className='px-3'
          >
            <Text
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                fontSize: 38,
                fontWeight: '700',
                color: '#1A1A1A',
                letterSpacing: -1.2,
              }}
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
            <View style={{ marginTop: 30 }}>
              <SectionLabel>Folders</SectionLabel>
              <Grid
                data={rootFolders}
                gap={GAP}
                keyExtractor={(folder) => folder.id}
                renderItem={(folder: Folder) => (
                  <FolderChip
                    name={folder.name}
                    noteCount={countFilesInFolder(folder.id)}
                    onPress={() => router.push({ pathname: '/folder/[id]', params: { id: folder.id } })}
                  />
                )}
              />
            </View>
          )}

          {/* ── Notes ── */}
          <View style={{ marginTop: 30 }}>
            <SectionLabel>
              {search.trim() ? `Results for "${search}"` : 'Notes'}
            </SectionLabel>
            {filteredFiles.length > 0 ? (
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
                {filteredFiles.map((file, index) => (
                  <NoteListItem
                    key={file.id}
                    title={file.title}
                    preview={getPreview(file.content)}
                    updatedAt={getRelativeTime(file.updated_at)}
                    showDivider={index < filteredFiles.length - 1}
                    onPress={() => router.push(`/note/${file.id}` as any)}
                    onLongPress={() => {}}
                  />
                ))}
              </View>
            ) : (
              <Text style={{ color: '#ADADAB', fontSize: 14, marginTop: 8 }}>
                No notes match "{search}"
              </Text>
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
