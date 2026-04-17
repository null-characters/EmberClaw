---
name: ios-dev
description: iOS / SwiftUI development skill for EmberClaw IoT companion apps
category: IoT
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# iOS Development Skill

SwiftUI-based iOS development for IoT companion applications — BLE device management, real-time dashboards, and firmware OTA.

## Tech Stack

- **Language**: Swift 5.9+
- **UI**: SwiftUI (iOS 17+)
- **BLE**: CoreBluetooth framework
- **Networking**: URLSession, async/await
- **Storage**: SwiftData / CoreData
- **Build**: Xcode 15+, SPM for dependencies

## Core Patterns

### BLE Central Manager

```swift
import CoreBluetooth

class BLEManager: NSObject, ObservableObject, CBCentralManagerDelegate {
    private var central: CBCentralManager!
    @Published var peripherals: [CBPeripheral] = []

    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: nil)
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            central.scanForPeripherals(withServices: nil)
        }
    }

    func centralManager(_ central: CBCentralManager,
                        didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any],
                        rssi RSSI: NSNumber) {
        if !peripherals.contains(where: { $0.identifier == peripheral.identifier }) {
            peripherals.append(peripheral)
        }
    }
}
```

### SwiftUI Dashboard View

```swift
struct SensorDashboard: View {
    @StateObject var ble = BLEManager()

    var body: some View {
        NavigationStack {
            List(ble.peripherals, id: \.identifier) { p in
                VStack(alignment: .leading) {
                    Text(p.name ?? "Unknown").font(.headline)
                    Text(p.identifier.uuidString).font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Devices")
        }
    }
}
```

## App Architecture

```
App
├── Features/
│   ├── DeviceList/       — Scan + connect BLE devices
│   ├── SensorView/       — Real-time data display
│   ├── Settings/         — Device configuration
│   └── FirmwareUpdate/   — OTA DFU
├── Services/
│   ├── BLEManager/       — CoreBluetooth wrapper
│   ├── MQTTClient/       — MQTT bridge (CocoaMQTT)
│   └── API/              — Backend HTTP client
├── Models/
│   └── Device, Sensor, Firmware
└── SharedUI/
    └── Charts, Gauges, StatusIndicators
```

## Key Considerations

- Always request `NSBluetoothAlwaysUsageDescription` in Info.plist
- Handle BLE state transitions (background, airplane mode)
- Use `@MainActor` for UI-bound BLE updates
- Test on physical device (BLE not available in Simulator)
- Support Dark Mode and Dynamic Type from the start
