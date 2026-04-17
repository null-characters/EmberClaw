---
name: nrf-sdk
description: "Nordic nRF Connect SDK build, flash, debug, and configuration via west and nrfjprog. Use when: (1) building nRF52/nRF53 firmware, (2) flashing to dev boards, (3) debugging via J-Link, (4) configuring BLE/Zigbee/Thread, (5) managing Zephyr RTOS projects."
metadata:
  {
    "openclaw":
      {
        "emoji": "📡",
        "requires": { "bins": ["west"] },
      },
  }
---

# nRF Connect SDK Skill

Use `west`, `nrfjprog`, and related Nordic tools to build, flash, and debug nRF firmware.

## When to Use

- Building nRF52840/nRF5340 firmware
- Flashing firmware to dev kits (DK, Dongle, custom boards)
- Debugging via J-Link (GDB/OpenOCD)
- Configuring BLE, Thread, Zigbee, Matter protocols
- Managing Zephyr RTOS applications
- Analyzing power consumption

## When NOT to Use

- Arduino-based projects → use Arduino CLI
- Non-Nordic MCUs → use platform-specific toolchain
- Mobile app development → use xcode-build / android-build skills

## Prerequisites

- nRF Connect SDK installed (`west --version`)
- Toolchain: `west zephyr-export`
- J-Link drivers installed for flashing/debugging
- Board connected via USB

## Common Commands

### Build

```bash
# List available boards
west boards | grep nrf

# Build for nRF52840 DK
west build -b nrf52840dk/nrf52840

# Build with custom overlay
west build -b nrf52840dk/nrf52840 -- -DOVERLAY_CONFIG=overlay-bt.conf

# Build with prj.conf
west build -b nrf52840dk/nrf52840 -- -DCONF_FILE=prj_release.conf

# Clean build
west build -b nrf52840dk/nrf52840 -p always

# Build specific sample
west build -b nrf52840dk/nrf52840 zephyr/samples/bluetooth/peripheral_hr
```

### Flash

```bash
# Flash via west (auto-detect J-Link)
west flash

# Flash via nrfjprog
nrfjprog --program build/zephyr/zephyr.hex --sectorerase --verify --reset

# Flash via USB (nRF52840 Dongle, requires bootloader)
nrfutil pkg generate --hw-version 52 --sd-req 0x00 --application build/zephyr/zephyr.hex app_dfu_package.zip
nrfutil dfu usb-serial -pkg app_dfu_package.zip -p /dev/tty.usbmodem*
```

### Debug

```bash
# Start GDB debug session
west debug

# Start with OpenOCD
west debug --openocd

# Attach to running device
west attach

# RTT (Real-Time Transfer) logging
JLinkRTTClient
```

### Zephyr Configuration

```bash
# Open menuconfig
west build -t menuconfig

# Save config to .config
west build -t guiconfig

# View current config
west build -t usage

# List Kconfig symbols
west build -t kconfig-functions
```

### BLE Development

```bash
# Build BLE peripheral sample
west build -b nrf52840dk/nrf52840 zephyr/samples/bluetooth/peripheral

# Build BLE central sample
west build -b nrf52840dk/nrf52840 zephyr/samples/bluetooth/central

# nRF Connect for Desktop (mobile app)
# - BLE Scanner: scan/connect/GATT operations
# - Bluetooth Low Energy: provision mesh devices
```

### nRF Mesh

```bash
# Build mesh sample
west build -b nrf52840dk/nrf52840 -- -DOVERLAY_CONFIG=overlay-mesh.conf

# Provision via nRF Mesh mobile app or nrf-mesh library
```

### West Utilities

```bash
# Update SDK
west update

# List west commands
west --help

# Export Zephyr CMake package
west zephyr-export

# Diff workspace changes
west diff

# Status of all projects
west status
```

### Board Configuration

```bash
# Board-specific files location:
# <ncs>/zephyr/boards/arm/nrf52840dk_nrf52840/
# - nrf52840dk_nrf52840.dts   (device tree)
# - nrf52840dk_nrf52840_defconfig (default config)
# - board.cmake               (board cmake)

# Custom board overlay:
# boards/nrf52840dk_nrf52840.overlay
```

### Power Profiling

```bash
# nRF Connect for Desktop - Power Profiler
# Connect via nRF USB, measure current in different states

# Low power build
west build -b nrf52840dk/nrf52840 -- -DCONFIG_PM=y -DCONFIG_SOC_NRF52840_LOW_POWER=y
```
