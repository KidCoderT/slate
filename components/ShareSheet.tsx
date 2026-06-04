import { Divider } from '@/components/ui/Divider'
import { Text } from '@/components/ui/Text'
import {
  COLLABORATOR,
  COLLABORATOR_2,
  OWNER,
  getCollaboratorsForFile,
  type CollaboratorEntry,
} from '@/lib/dummyData'
import { Copy, Link2, X } from 'lucide-react-native'
import { useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = {
  visible: boolean
  onClose: () => void
  fileName: string
  fileId: string
  publicSlug: string | null
}

// Avatar identity colours — non-monochrome permitted for presence circles (APP_AESTHETIC.md §2 exception)
const AVATAR_COLORS: Record<string, string> = {
  [OWNER.id]: '#1A1A1A',  // ink
  [COLLABORATOR.id]: '#6BBF94',  // avatar identity colour
  [COLLABORATOR_2.id]: '#9B8EC4',  // avatar identity colour
}

function getAvatarColor(id: string): string {
  return AVATAR_COLORS[id] ?? '#ADADAB'
}

function getInitial(displayName: string | null): string {
  return (displayName ?? '?').charAt(0).toUpperCase()
}

export function ShareSheet({ visible, onClose, fileName, fileId, publicSlug }: Props) {
  const insets = useSafeAreaInsets()
  const collaborators = getCollaboratorsForFile(fileId)

  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<Record<string, 'edit' | 'view'>>(() => {
    const init: Record<string, 'edit' | 'view'> = {}
    for (const c of collaborators) {
      if (c.permission !== 'owner') {
        init[c.profile.id] = c.permission
      }
    }
    return init
  })

  function togglePermission(profileId: string) {
    setPermissions(prev => ({
      ...prev,
      [profileId]: prev[profileId] === 'edit' ? 'view' : 'edit',
    }))
  }

  function handleCopyLink() {
    // TODO: replace with expo-clipboard when added
    if (!publicSlug) return
    console.log('Copy link:', `https://slate.app/s/${publicSlug}`)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* Sheet panel */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text variant="title" numberOfLines={1}>{fileName}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.65} style={styles.closeButton}>
            <X size={20} color="#1A1A1A" strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Email input row */}
        <View style={styles.inputRow}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Add email address..."
            placeholderTextColor="#B4B6BB"
            style={styles.emailInput}
            autoCapitalize="none"
            keyboardType="email-address"
            selectionColor="#1A1A1A"
          />
          <TouchableOpacity
            onPress={() => setEmail('')}
            activeOpacity={0.75}
            style={styles.sendButton}
          >
            {/* Explicit color in style — NativeWind text-surface className loses specificity battle on web */}
            <Text style={[styles.sendButtonText, { color: '#FFFFFF' }]}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* People with access */}
        <Text variant="label" className="mt-5 mb-3 px-1">People with access</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
          {collaborators.map((entry: CollaboratorEntry, index: number) => (
            <View key={entry.profile.id}>
              <CollaboratorRow
                entry={entry}
                permission={
                  entry.permission === 'owner'
                    ? 'owner'
                    : (permissions[entry.profile.id] ?? entry.permission)
                }
                onToggle={() => togglePermission(entry.profile.id)}
              />
              {index < collaborators.length - 1 && <Divider inset={60} />}
            </View>
          ))}
        </ScrollView>

        <View style={{ marginTop: 16, marginBottom: 16 }}>
          <Divider />
        </View>

        {/* Public link row */}
        <View style={styles.linkRow}>
          <Link2 size={16} color="#ADADAB" strokeWidth={1.5} />
          {publicSlug ? (
            <>
              <Text variant="caption" className="text-ink flex-1 ml-3" numberOfLines={1}>
                slate.app/s/{publicSlug}
              </Text>
              <TouchableOpacity onPress={handleCopyLink} activeOpacity={0.65}>
                <Copy size={16} color="#ADADAB" strokeWidth={1.5} />
              </TouchableOpacity>
            </>
          ) : (
            <Text variant="caption" className="text-icon ml-3">
              Public link off
            </Text>
          )}
        </View>
      </View>
    </Modal>
  )
}

type RowProps = {
  entry: CollaboratorEntry
  permission: 'owner' | 'edit' | 'view'
  onToggle: () => void
}

function CollaboratorRow({ entry, permission, onToggle }: RowProps) {
  return (
    <View style={styles.collaboratorRow}>
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          { backgroundColor: getAvatarColor(entry.profile.id) },
        ]}
      >
        <Text style={[styles.avatarInitial, { color: '#FFFFFF' }]}>
          {getInitial(entry.profile.display_name)}
        </Text>
      </View>

      {/* Name + email */}
      <View style={styles.collaboratorInfo}>
        <Text variant="title" numberOfLines={1}>
          {entry.profile.display_name ?? entry.profile.email}
        </Text>
        <Text variant="caption" className="text-icon" numberOfLines={1}>
          {entry.profile.email}
        </Text>
      </View>

      {/* Permission chip */}
      {permission === 'owner' ? (
        <View style={styles.ownerChip}>
          <Text className="text-ink-subtle" style={styles.ownerChipText}>Owner</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={onToggle} activeOpacity={0.65}>
          <View
            style={[
              styles.permChip,
              permission === 'edit' ? styles.permChipEdit : styles.permChipView,
            ]}
          >
            <Text style={[styles.permChipText, permission === 'edit' ? { color: '#FFFFFF' } : undefined]}>
              {permission === 'edit' ? 'Edit' : 'View'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',  // surface token
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D4D2',  // crumb token
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F0F1F4',  // canvas token
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E6',  // divider token
    borderRadius: 12,
    overflow: 'hidden',
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1A1A1A',  // ink token
  },
  sendButton: {
    backgroundColor: '#1A1A1A',  // ink token
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  collaboratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  collaboratorInfo: {
    flex: 1,
  },
  ownerChip: {
    backgroundColor: '#F0F1F4',  // canvas token
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ownerChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  permChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  permChipEdit: {
    backgroundColor: '#1A1A1A',  // ink token
  },
  permChipView: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E8E8E6',  // divider token
  },
  permChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
