# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   bun install
   ```

2. Start the app

   ```bash
   bun start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
bun run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Builds & releases (EAS)

Three build profiles (`eas.json`): `development` (your own phone, local Metro),
`preview` (the APK friends install), `production` (store releases). Two EAS
Workflows (`.eas/workflows/`) automate the ones that aren't a one-off local dev
build. Both are manual-trigger only — nothing runs just from pushing to GitHub.

**Install your own dev build** (native code, run whenever the dev client itself
needs to change):

```bash
bunx eas build --profile development --platform android
```

**Cut a new preview build for friends** (native rebuild — needed only when a native
dependency, permission, or `app.config.js` native field changes). This also updates
the "download the app" link used on the website and in share-invite emails, so
there's nothing else to do after it finishes:

```bash
bunx eas workflow:run .eas/workflows/preview-build.yml
```

**Ship a JS-only change** (styling, screens, hooks, bugfixes — no native rebuild
needed, goes out instantly to everyone already on a build):

```bash
bunx eas workflow:run .eas/workflows/ota-update.yml -F channel=production -F message="what changed"
```

**Update the webapp manually**

```bash
bunx expo export --platform web && eas deploy --prod
```

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
