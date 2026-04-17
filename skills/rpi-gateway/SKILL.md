---
name: rpi-gateway
description: Raspberry Pi Linux gateway deployment, configuration, and debugging
category: IoT
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# RPi Gateway Skill

Deployment, configuration, and operational support for Raspberry Pi acting as IoT gateways — bridging BLE/Zigbee/Thread devices to cloud or local services.

## Hardware Targets

| Model | Use Case |
|-------|----------|
| RPi 4 Model B | Primary gateway — USB BLE dongle + Ethernet |
| RPi Zero 2 W | Low-cost edge node, limited I/O |
| RPi 5 | High-performance gateway with PCIe |
| Compute Module 4 | Industrial, custom carrier board |

## Core Components

### OS Setup
- Raspberry Pi OS Lite (headless)
- Ubuntu Server (for Docker/K8s workloads)
- Custom Yocto/Buildroot images (production)

### Connectivity Stack
- **BLE**: BlueZ 5.x, `bluetoothctl`, `gatttool`, D-Bus API
- **Zigbee/Thread**: Silicon Labs RCP (Radio Co-Processor) via `zigbee2mqtt` or `ot-br-posix`
- **MQTT**: Mosquitto broker, bridging to cloud MQTT
- **HTTP/WebSocket**: Node.js / Python gateway services

### Containerization
- Docker Compose for multi-service gateway
- Portainer for web management
- Health checks and auto-restart policies

## Gateway Architecture

```
[Edge Devices] --BLE/Zigbee--> [RPi Gateway] --MQTT/HTTP--> [Cloud / Local Server]
                                     |
                              [Docker Compose]
                              ├── mosquitto (MQTT broker)
                              ├── zigbee2mqtt (Zigbee bridge)
                              ├── node-red (flow automation)
                              └── custom-gateway (Python/Node)
```

## Common Tasks

### BLE Scan from RPi
```bash
sudo hcitool lescan
# or using bluetoothctl:
bluetoothctl scan on
```

### MQTT Pub/Sub Test
```bash
mosquitto_pub -t "sensors/temp" -m '{"value": 23.5}'
mosquitto_sub -t "sensors/#" -v
```

### Docker Compose Template
```yaml
version: "3.8"
services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports: ["1883:1883"]
    volumes: ["./mosquitto/config:/mosquitto/config"]
  gateway:
    build: ./gateway
    depends_on: [mosquitto]
    restart: unless-stopped
```

## Troubleshooting

| Problem | Diagnosis |
|---------|-----------|
| BLE device not found | `hciconfig` — check adapter up; `bluetoothctl list` |
| MQTT connection refused | Check mosquitto.conf `listener` and `allow_anonymous` |
| High CPU on RPi | `htop` — check for runaway Python/Node processes |
| SD card corruption | Use overlay FS or `log2ram` to reduce writes |
| Zigbee devices drop off | Check RCP firmware version; ensure channel not congested |
