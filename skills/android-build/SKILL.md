---
name: android-build
description: "Android build, test, install, and debug via Gradle and ADB. Use when: (1) building Android projects, (2) running instrumented tests, (3) installing APKs to devices, (4) viewing device logs, (5) managing emulators."
metadata:
  {
    "openclaw":
      {
        "emoji": "🤖",
        "requires": { "bins": ["adb", "gradle"] },
      },
  }
---

# Android Build Skill

Use Gradle and ADB to build, test, install, and debug Android projects.

## When to Use

- Building Android apps (debug/release)
- Running unit tests or instrumented tests
- Installing/uninstalling APKs on devices/emulators
- Viewing device logs via logcat
- Managing Android emulators
- Analyzing build performance

## Prerequisites

- Android SDK installed (`echo $ANDROID_HOME`)
- ANDROID_HOME or ANDROID_SDK_ROOT set in environment
- Device connected or emulator running (`adb devices`)

## Common Commands

### Build

```bash
# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Build App Bundle (for Play Store)
./gradlew bundleRelease

# Clean build
./gradlew clean
```

### Test

```bash
# Run unit tests
./gradlew test

# Run specific test class
./gradlew test --tests "com.example.LoginTest"

# Run instrumented tests (requires device/emulator)
./gradlew connectedAndroidTest

# Generate test report
./gradlew testDebugUnitTest
# Report: app/build/reports/tests/testDebugUnitTest/index.html
```

### Install & Deploy

```bash
# List connected devices
adb devices

# Install APK
adb install -r ./app/build/outputs/apk/debug/app-debug.apk

# Uninstall app
adb uninstall com.example.app

# Launch app
adb shell am start -n com.example.app/.MainActivity
```

### Debugging & Logs

```bash
# View all logs
adb logcat

# Filter by app
adb logcat --pid=$(adb shell pidof com.example.app)

# Clear logs
adb logcat -c

# Take screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Screen recording
adb shell screenrecord /sdcard/recording.mp4
```

### Emulator Management

```bash
# List available AVDs
emulator -list-avds

# Start emulator
emulator -avd <avd-name> &

# Cold boot emulator
emulator -avd <avd-name> -no-snapshot-load &

# Wait for device ready
adb wait-for-device
```

### Gradle Utilities

```bash
# View project tasks
./gradlew tasks

# Dependency tree
./gradlew app:dependencies

# Build profile (performance analysis)
./gradlew assembleDebug --profile
# Report: app/build/reports/profile/

# Offline build
./gradlew assembleDebug --offline
```

### Project Structure

```
app/
├── src/
│   ├── main/          # Production code + resources
│   ├── test/          # Unit tests
│   └── androidTest/   # Instrumented tests
├── build.gradle.kts   # Module build config
└── proguard-rules.pro
build.gradle.kts       # Project build config
settings.gradle.kts
gradle.properties
```
