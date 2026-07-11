import { GetAppBanner } from "@/components/GetAppBanner";
import { NoteBadge } from "@/components/NoteBadge";
import { NoteListItem } from "@/components/NoteListItem";
import { Card } from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { FAB } from "@/components/ui/FAB";
import { ProfileButton } from "@/components/ui/ProfileButton";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { SearchBar } from "@/components/ui/SearchBar";
import { Text } from "@/components/ui/Text";
import { useProfileContext } from "@/context/ProfileContext";
import { useFiles } from "@/hooks/useFiles";
import { useOwnedShareMap } from "@/hooks/useOwnedShareMap";
import { useSharedFiles } from "@/hooks/useSharedFiles";
import { useViewedFiles } from "@/hooks/useViewedFiles";
import { getPreview, getRelativeTime } from "@/lib/noteFormat";
import type { File } from "@/types/db";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { profile } = useProfileContext();
  const { files, createFile } = useFiles(null); // root-level files (folder_id is null)
  const { files: sharedFiles, permissions } = useSharedFiles(); // notes others shared with me
  const { files: viewedFiles } = useViewedFiles(); // public notes I opened via link
  const sharedOutIds = useOwnedShareMap(); // my files shared out to someone → "Shared" tag

  const initial = profile?.display_name?.charAt(0).toUpperCase() ?? "?";

  const lowerSearch = search.toLowerCase();
  const matchesSearch = (f: File) =>
    f.title.toLowerCase().includes(lowerSearch) ||
    f.content.toLowerCase().includes(lowerSearch);
  const filteredFiles: File[] = search.trim()
    ? files.filter(matchesSearch)
    : files;
  const filteredShared: File[] = search.trim()
    ? sharedFiles.filter(matchesSearch)
    : sharedFiles;

  // "Viewed" = public notes opened via link, minus any I already own or was shared (avoids
  // the same note appearing in two sections).
  const ownedOrSharedIds = new Set([
    ...files.map((f) => f.id),
    ...sharedFiles.map((f) => f.id),
  ]);
  const filteredViewed: File[] = (
    search.trim() ? viewedFiles.filter(matchesSearch) : viewedFiles
  ).filter((f) => !ownedOrSharedIds.has(f.id));

  // Owned note tag: public wins over shared-out; private notes get none.
  const ownedBadge = (f: File) =>
    f.is_public ? (
      <NoteBadge kind="public" />
    ) : sharedOutIds.has(f.id) ? (
      <NoteBadge kind="shared" />
    ) : undefined;

  async function handleCreate() {
    const id = await createFile();
    if (id) router.push({ pathname: "/note/[id]", params: { id } });
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View className="flex-row items-center justify-between mt-4 mb-4">
          <Text variant="wordmark">Slate</Text>
          <ProfileButton
            initial={initial}
            backgroundColor={profile?.color}
            onPress={() => router.push("/account")}
          />
        </View>

        {/* Structural rule under the wordmark — the recurring signature (APP_AESTHETIC §4) */}
        <Divider inset={0} />

        {/* ── Search ── */}
        <View className="mt-5">
          <SearchBar value={search} onChangeText={setSearch} />
        </View>

        {/* ── Folders ── */}
        {/* {rootFolders.length > 0 && (
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
        )} */}

        <GetAppBanner />

        {/* ── Notes ── */}
        <View className="mt-[30px]">
          <Text variant="label" className="mb-3">
            {search.trim() ? `Results for "${search}"` : "Notes"}
          </Text>
          {filteredFiles.length > 0 ? (
            <Card noPad>
              {filteredFiles.map((file, index) => (
                <NoteListItem
                  key={file.id}
                  title={file.title || "Untitled"}
                  preview={getPreview(file.content)}
                  updatedAt={getRelativeTime(file.updated_at)}
                  showDivider={index < filteredFiles.length - 1}
                  badge={ownedBadge(file)}
                  onPress={() =>
                    router.push({
                      pathname: "/note/[id]",
                      params: { id: file.id },
                    })
                  }
                />
              ))}
            </Card>
          ) : search.trim() ? (
            <Text variant="caption" className="text-icon mt-2">
              No notes match “{search}”
            </Text>
          ) : (
            <View className="items-center mt-10">
              <Text variant="heading-sm" className="text-ink-muted">
                Nothing here yet.
              </Text>
              <Text variant="caption" className="text-empty-faint mt-1.5">
                Tap New note to begin.
              </Text>
            </View>
          )}
        </View>

        {/* ── Shared with me ── */}
        {filteredShared.length > 0 && (
          <View className="mt-[30px]">
            <Text variant="label" className="mb-3">
              Shared with me
            </Text>
            <Card noPad>
              {filteredShared.map((file, index) => (
                <NoteListItem
                  key={file.id}
                  title={file.title || "Untitled"}
                  preview={getPreview(file.content)}
                  updatedAt={getRelativeTime(file.updated_at)}
                  showDivider={index < filteredShared.length - 1}
                  badge={
                    <NoteBadge
                      kind={permissions[file.id] === "edit" ? "edit" : "view"}
                    />
                  }
                  onPress={() =>
                    router.push({
                      pathname: "/note/[id]",
                      params: { id: file.id },
                    })
                  }
                />
              ))}
            </Card>
          </View>
        )}

        {/* ── Viewed (public notes I opened via link) ── */}
        {filteredViewed.length > 0 && (
          <View className="mt-[30px]">
            <Text variant="label" className="mb-3">
              Viewed
            </Text>
            <Card noPad>
              {filteredViewed.map((file, index) => (
                <NoteListItem
                  key={file.id}
                  title={file.title || "Untitled"}
                  preview={getPreview(file.content)}
                  updatedAt={getRelativeTime(file.updated_at)}
                  showDivider={index < filteredViewed.length - 1}
                  badge={<NoteBadge kind="public" />}
                  onPress={() =>
                    router.push({
                      pathname: "/note/[id]",
                      params: { id: file.id },
                    })
                  }
                />
              ))}
            </Card>
          </View>
        )}
      </ScrollView>

      <FAB onPress={handleCreate} />
    </ScreenContainer>
  );
}
