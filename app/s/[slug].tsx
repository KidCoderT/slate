import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { Text } from '@/components/ui/Text'
import { usePublicFile } from '@/hooks/usePublicFile'
import { useViewedFiles } from '@/hooks/useViewedFiles'
import { useThemeColors } from '@/theme/ThemeProvider'
import { useUser } from '@clerk/expo'
import { Link, useLocalSearchParams } from 'expo-router'
import { Eye } from 'lucide-react-native'
import { useEffect } from 'react'
import { ScrollView, View } from 'react-native'

/**
 * Public note viewer — the growth-loop screen (DESIGN §7). Lives OUTSIDE the (app)/(auth)
 * route groups, so it renders with no account. Read-only: reuses MarkdownRenderer (no editing
 * machinery). Editing a public note still requires an explicit invite — signing in here just
 * opens the app. When a signed-in, non-owner visitor opens the link, we bookmark it (0012) so
 * it reappears in their workspace; signed-out visitors save nothing.
 */
export default function PublicNote() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { file, isLoading } = usePublicFile(slug)
  const { user } = useUser()
  const { recordView } = useViewedFiles()
  const colors = useThemeColors()

  useEffect(() => {
    if (file && user && file.owner_id !== user.id) recordView(file.id)
  }, [file, user, recordView])

  // No skeletons (APP_AESTHETIC §8): render just the ground until the note resolves.
  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />
  }

  if (!file) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }} className="items-center justify-center px-[18px]">
        <Text variant="heading-sm" className="text-ink-muted">This note isn’t available.</Text>
        <Text variant="caption" className="text-empty-faint mt-1.5">The link may be off or the note deleted.</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: 28,
        paddingBottom: 80,
        width: '100%',
        maxWidth: 680,
        alignSelf: 'center',
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header: wordmark + a quiet "View only" marker */}
      <View className="flex-row items-center justify-between mb-6">
        <Text variant="wordmark">Slate</Text>
        <View className="flex-row items-center">
          <Eye size={14} color={colors.icon} strokeWidth={1.5} />
          <Text variant="label" className="ml-1.5 text-ink-muted">View only</Text>
        </View>
      </View>

      <Text variant="heading" className="mb-5">{file.title || 'Untitled'}</Text>

      <MarkdownRenderer>{file.content}</MarkdownRenderer>

      {/* Growth CTA — honest: opening the app, not a promise of edit access */}
      <View className="mt-12 pt-6 border-t border-divider items-center">
        <Text variant="caption" className="text-empty-faint">Made with Slate</Text>
        <Link href="/" className="mt-2">
          <Text variant="title" className="text-ink">Open Slate</Text>
        </Link>
      </View>
    </ScrollView>
  )
}
