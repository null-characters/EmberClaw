---
name: android-dev
description: Android / Jetpack Compose development skill for EmberClaw IoT companion apps
category: IoT
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# Android Development Skill

Jetpack Compose-based Android development for IoT companion applications — BLE device management, real-time dashboards, and firmware OTA.

## Tech Stack

- **Language**: Kotlin 2.0+
- **UI**: Jetpack Compose + Material 3
- **BLE**: Android BLE API with `BluetoothLeScanner`
- **Networking**: Retrofit + OkHttp, Kotlin Coroutines
- **Storage**: Room database
- **Build**: Gradle (Kotlin DSL), AGP 8+

## Core Patterns

### BLE Scanner

```kotlin
@SuppressLint("MissingPermission")
class BLEScanner(private val context: Context) {
    private val bluetoothManager = context.getSystemService(BluetoothManager::class.java)
    private val scanner = bluetoothManager.adapter?.bluetoothLeScanner
    private val _devices = MutableStateFlow<List<ScanResult>>(emptyList())
    val devices: StateFlow<List<ScanResult>> = _devices

    private val callback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            _devices.update { list ->
                if (list.none { it.device.address == result.device.address }) list + result
                else list
            }
        }
    }

    fun startScan() {
        scanner?.startScan(callback)
    }

    fun stopScan() {
        scanner?.stopScan(callback)
    }
}
```

### Compose Dashboard

```kotlin
@Composable
fun SensorDashboard(scanner: BLEScanner) {
    val devices by scanner.devices.collectAsState()
    Scaffold(topBar = { TopAppBar(title = { Text("Devices") }) }) { padding ->
        LazyColumn(contentPadding = padding) {
            items(devices, key = { it.device.address }) { result ->
                ListItem(
                    headlineContent = { Text(result.device.name ?: "Unknown") },
                    supportingContent = { Text(result.device.address) },
                    trailingContent = { Text("${result.rssi} dBm") },
                )
            }
        }
    }
}
```

## App Architecture

```
app/
├── feature/
│   ├── devices/          — Scan + connect BLE
│   ├── sensors/          — Real-time data display
│   ├── settings/         — Device configuration
│   └── firmware/         — OTA DFU
├── core/
│   ├── ble/              — BLE scanner + GATT client
│   ├── mqtt/             — MQTT bridge (Eclipse Paho)
│   └── network/          — Retrofit API client
├── data/
│   └── Room DB, DataStore
└── ui/
    └── theme, charts, gauges
```

## Key Considerations

- Request `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` permissions (Android 12+)
- Handle runtime permission flow with `ActivityResultContracts.RequestMultiplePermissions`
- Use `ForegroundService` for long-running BLE connections
- Test on physical device (emulator has limited BLE)
- Support Material You dynamic colors and large text accessibility
