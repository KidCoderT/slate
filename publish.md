# How to publish a Slate build for friend testing (Android)

Uses EAS Internal Distribution — no App Store, no Firebase needed.
Friends get a standalone APK they install directly.

---

## One-time setup (already done)

- `expo-dev-client` installed
- EAS project ID in `app.json` → `extra.eas.projectId`
- `eas.json` has a `preview` profile with `distribution: internal`
- Android package set to `com.tejas.slate` in `app.json`

---

## Every time you want to publish a new build

### 1. Push secrets to EAS (first time only — they persist)

```bash
bunx eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_..."
bunx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
bunx eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

Verify: `bunx eas secret:list`

### 2. Trigger the build

```bash
bunx eas build --platform android --profile preview
```

- Takes ~5–15 min on EAS cloud
- EAS handles the Android keystore automatically (stored in your EAS account)
- You'll get a build URL when it finishes

### 3. Share with friends

**Option A — Share the install page (best)**
- Go to expo.dev → your project → Builds → click the build
- Copy the "Internal Distribution" link
- Send that URL to friends — they tap it on their phone → single "Install" button

**Option B — Share the raw APK**
- Click Download on the build page → get the `.apk`
- Send via WhatsApp, Drive, iMessage, etc.

### 4. Friends install it (one-time per device)

1. Settings → Apps → Special app access → Install unknown apps → allow their browser or Files app
2. Tap the `.apk` → Install → Open

---

## Important notes

- Use `preview` profile, NOT `development`. Development builds require connecting to your running Metro server.
- The Android package name (`com.tejas.slate`) is permanent — changing it = new app identity, existing installs won't update.
- EAS keystore is stored in your EAS account. Don't lose access to it.

---

## iOS (future — needs Apple Developer account $99/yr)

When you have an Apple Developer account:
1. Register each tester's device UDID in the Apple Developer portal
2. Add `eas build --platform ios --profile preview` — EAS will walk you through provisioning
3. Or use TestFlight: `production` profile → `eas submit --platform ios`
