---
name: xcode-build
description: "Xcode/iOS build, test, sign, and simulator management via xcodebuild and xcrun. Use when: (1) building iOS/macOS projects, (2) running unit/UI tests, (3) managing simulators, (4) signing and archiving, (5) inspecting provisioning profiles."
metadata:
  {
    "openclaw":
      {
        "emoji": "🍎",
        "requires": { "bins": ["xcodebuild"] },
      },
  }
---

# Xcode Build Skill

Use `xcodebuild` and `xcrun` to build, test, sign, and deploy iOS/macOS projects.

## When to Use

- Building iOS/macOS apps from command line
- Running unit tests or UI tests
- Managing iOS simulators (boot, install, launch)
- Creating archives for distribution
- Inspecting provisioning profiles and certificates

## Prerequisites

- Xcode installed (check: `xcode-select -p`)
- Command Line Tools: `xcode-select --install`
- Valid provisioning profile for device builds

## Common Commands

### Build

```bash
# Build for simulator
xcodebuild -workspace App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 16' build

# Build for device
xcodebuild -workspace App.xcworkspace -scheme App -destination 'generic/platform=iOS' build

# Clean build
xcodebuild clean -workspace App.xcworkspace -scheme App
```

### Test

```bash
# Run unit tests
xcodebuild test -workspace App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 16'

# Run specific test class
xcodebuild test -workspace App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:AppTests/LoginTests
```

### Archive & Export

```bash
# Archive
xcodebuild archive -workspace App.xcworkspace -scheme App -archivePath ./build/App.xcarchive

# Export IPA
xcodebuild -exportArchive -archivePath ./build/App.xcarchive -exportOptionsPlist ExportOptions.plist -exportPath ./build
```

### Simulator Management

```bash
# List available simulators
xcrun simctl list devices available

# Boot simulator
xcrun simctl boot <device-udid>

# Install app on simulator
xcrun simctl install <device-udid> ./build/App.app

# Launch app
xcrun simctl launch <device-udid> com.example.app

# Shutdown simulator
xcrun simctl shutdown <device-udid>
```

### Provisioning & Signing

```bash
# List available signing identities
security find-identity -p codesigning -v

# List installed provisioning profiles
ls ~/Library/MobileDevice/Provisioning\ Profiles/

# Decode provisioning profile
security cms -D -i ~/Library/MobileDevice/Provisioning\ Profiles/<uuid>.mobileprovision
```

### Swift Package Manager

```bash
# Resolve dependencies
xcodebuild -resolvePackageDependencies -workspace App.xcworkspace -scheme App

# Build with SPM
swift build
swift test
```
