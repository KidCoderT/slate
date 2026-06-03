import { useProfile } from '@/hooks/useProfile'
import { useClerk } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { Platform, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const CANVAS = '#F0F1F4'
const H_PAD  = 18

export default function Account() {
  const { signOut } = useClerk()
  const router = useRouter()
  const { profile } = useProfile()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/sign-in')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CANVAS }}>
      <View
        style={
          Platform.OS === 'web'
            ? { flex: 1, maxWidth: 680, width: '100%', alignSelf: 'center', paddingHorizontal: H_PAD }
            : { flex: 1, paddingHorizontal: H_PAD }
        }
      >
        {/* ── Header ── */}
        <View style={{ marginTop: 12, marginBottom: 36 }}>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              color: '#1A1A1A',
              letterSpacing: -0.8,
            }}
          >
            Account
          </Text>
        </View>

        {/* ── Profile card ── */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            marginBottom: 30,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: '#9E9890',
              letterSpacing: 0.7,
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Profile
          </Text>

          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#1A1A1A',
              letterSpacing: -0.4,
              marginBottom: 4,
            }}
          >
            {profile?.display_name ?? '—'}
          </Text>
          <Text style={{ fontSize: 14, color: '#9E9890' }}>
            {profile?.email ?? '—'}
          </Text>
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.75}
          style={{
            borderWidth: 1,
            borderColor: '#1A1A1A',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A' }}>
            Sign out
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
