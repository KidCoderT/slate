import { NoteListItem } from '@/components/NoteListItem'
import { Card } from '@/components/ui/Card'
import { ScreenContainer } from '@/components/ui/ScreenContainer'
import { Text } from '@/components/ui/Text'
import { useSharedFiles } from '@/hooks/useSharedFiles'
import { getPreview, getRelativeTime } from '@/lib/noteFormat'
import { colors } from '@/theme/colors'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { ScrollView, TouchableOpacity, View } from 'react-native'

export default function SharedWithMe() {
  const router = useRouter()
  const { files } = useSharedFiles()

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back ── */}
        <View className="mt-[14px] mb-5">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.65}
            className="flex-row items-center self-start"
          >
            <ChevronLeft size={20} color={colors.ink} strokeWidth={1.5} />
            <Text variant="body" className="ml-0.5">Account</Text>
          </TouchableOpacity>
        </View>

        {/* ── Title ── */}
        <Text variant="heading" className="mb-[30px]">Shared with me</Text>

        {/* ── Files shared with me ── */}
        {files.length > 0 ? (
          <Card noPad>
            {files.map((file, index) => (
              <NoteListItem
                key={file.id}
                title={file.title || 'Untitled'}
                preview={getPreview(file.content)}
                updatedAt={getRelativeTime(file.updated_at)}
                showDivider={index < files.length - 1}
                onPress={() => router.push({ pathname: '/note/[id]', params: { id: file.id } })}
              />
            ))}
          </Card>
        ) : (
          <View className="items-center mt-8">
            <Text variant="body" className="text-ink-muted">Nothing shared with you yet.</Text>
            <Text variant="caption" className="text-empty-faint mt-1">
              Notes others share will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  )
}
