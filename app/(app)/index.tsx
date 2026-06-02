import { FolderChip } from '@/components/FolderChip'
import { NoteListItem } from '@/components/NoteListItem'
import { FAB } from '@/components/ui/FAB'
import { Grid } from '@/components/ui/Grid'
import { ProfileButton } from '@/components/ui/ProfileButton'
import { SearchBar } from '@/components/ui/SearchBar'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Platform, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// ─── Dummy data (replace with useFiles / useFolders hooks) ───────────────────

type DummyFolder = { id: string; name: string; noteCount: number }
type DummyNote   = { id: string; title: string; preview: string; updatedAt: string }

const FOLDERS: DummyFolder[] = [
  { id: 'f1', name: 'Work Notes',     noteCount: 18 },
  { id: 'f2', name: 'Personal Ideas', noteCount: 10 },
]

const NOTES: DummyNote[] = [
  { id: 'n1', title: 'Project Apollo',    preview: 'Starting with the user research phase. Need to schedule interviews with potential users before the design sprint.',  updatedAt: '2h ago' },
  { id: 'n2', title: 'Book Notes',        preview: 'Atomic Habits — Chapter 1. The fundamentals of habit formation and the compound effect of tiny changes over time.',  updatedAt: '1d ago' },
  { id: 'n3', title: 'Grocery List',      preview: 'Eggs, milk, sourdough bread, olive oil, cherry tomatoes, fresh basil, parmesan cheese.',                            updatedAt: '3h ago' },
  { id: 'n4', title: 'Meeting Agenda',    preview: 'Q3 planning sync. Cover roadmap priorities, resourcing gaps, and launch timeline for Q4.',                          updatedAt: '5h ago' },
  { id: 'n5', title: 'New Recipe Idea',   preview: 'Miso glazed salmon with sesame bok choy and steamed jasmine rice. Marinade: white miso, mirin, sake, ginger.',     updatedAt: '2d ago' },
  { id: 'n6', title: 'Weekend Trip Plan', preview: 'Drive up Friday evening. Check in at the cabin, stop for groceries on the way. Hike Saturday morning.',            updatedAt: '1d ago' },
  { id: 'n7', title: 'UI / UX Notes',     preview: "Principles from Don Norman's Design of Everyday Things. Affordances, signifiers, and feedback loops.",              updatedAt: '4d ago' },
  { id: 'n8', title: 'Draft Title',       preview: 'Opening paragraph ideas for the essay. Start with the question, not the answer. Let the reader in slowly.',        updatedAt: '1w ago' },
]

// ─────────────────────────────────────────────────────────────────────────────

const CANVAS = '#F0F1F4'
const GAP    = 10
const H_PAD  = 18

export default function Home() {
  const router   = useRouter()
  const [search, setSearch] = useState('')
  const { profile } = useProfile()

  const initial = profile?.display_name?.charAt(0).toUpperCase() ?? '?'

  const filteredNotes = search.trim()
    ? NOTES.filter(
        n =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.preview.toLowerCase().includes(search.toLowerCase()),
      )
    : NOTES

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
              onPress={() => router.push('/account' as any)}
            />
          </View>

          {/* ── Search ── */}
          <SearchBar value={search} onChangeText={setSearch} />

          {/* ── Folders ── */}
          {FOLDERS.length > 0 && (
            <View style={{ marginTop: 30 }}>
              <SectionLabel>Folders</SectionLabel>
              <Grid
                data={FOLDERS}
                gap={GAP}
                renderItem={(folder) => (
                  <FolderChip
                    key={folder.id}
                    name={folder.name}
                    noteCount={folder.noteCount}
                    onPress={() => router.push(`/folder/${folder.id}` as any)}
                  />
                )}
              />
            </View>
          )}

          {/* ── Notes ── */}
          <View style={{ marginTop: 30 }}>
            <SectionLabel>Notes</SectionLabel>
            {filteredNotes.length > 0 ? (
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
                {filteredNotes.map((note, index) => (
                  <NoteListItem
                    key={note.id}
                    title={note.title}
                    preview={note.preview}
                    updatedAt={note.updatedAt}
                    showDivider={index < filteredNotes.length - 1}
                    onPress={() => router.push(`/note/${note.id}` as any)}
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
