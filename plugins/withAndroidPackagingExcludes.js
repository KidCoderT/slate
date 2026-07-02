const { withAppBuildGradle } = require('@expo/config-plugins')

const EXCLUDE = "excludes += ['META-INF/versions/9/OSGI-INF/MANIFEST.MF']"

/**
 * Adds a resources.excludes entry to packagingOptions in android/app/build.gradle.
 * Needed because okhttp3:logging-interceptor and jspecify both ship the same
 * OSGi manifest in their multi-release JARs — the duplicate causes a merge error.
 */
module.exports = function withAndroidPackagingExcludes(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes(EXCLUDE)) return mod

    mod.modResults.contents = mod.modResults.contents.replace(
      /(packagingOptions\s*\{[\s\S]*?jniLibs\s*\{[\s\S]*?\})/,
      `$1\n        resources {\n            ${EXCLUDE}\n        }`,
    )

    return mod
  })
}
