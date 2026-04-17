---
name: nordic-mesh
description: nRF Mesh development — Provisioning, configuration, models, and network management
category: IoT
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# Nordic Mesh Skill

Development guidance for Bluetooth Mesh on Nordic nRF52/nRF53 platforms using nRF Connect SDK (Zephyr-based).

## Mesh Architecture

### Core Concepts
- **Provisioning**: Adding devices to a mesh network (OOB, PB-ADV, PB-GATT)
- **Configuration**: Setting up model bindings, publication, and subscription
- **Models**: Server, Client, and Control models (Generic OnOff, Level, Light, Sensor)
- **Relay / Friend / Low Power Nodes**: Network topology roles
- **Subnets and App Keys**: Security key management

### Key Zephyr Mesh APIs
- `bt_mesh_init()` — Mesh stack initialization
- `bt_mesh_prov_enable()` / `bt_mesh_prov_disable()`
- `bt_mesh_cfg_*` — Configuration Client/Server models
- `bt_mesh_model_*` — Model publication and subscription

## Development Workflow

1. **Build** with `CONFIG_BT_MESH=y` and required models
2. **Provision** device via nRF Mesh mobile app or CLI provisioner
3. **Configure** model bindings and publication addresses
4. **Test** with nRF Mesh app or custom provisioner

## Typical prj.conf

```kconfig
CONFIG_BT=y
CONFIG_BT_OBSERVER=y
CONFIG_BT_PERIPHERAL=y
CONFIG_BT_MESH=y
CONFIG_BT_MESH_RELAY=y
CONFIG_BT_MESH_FRIEND=y
CONFIG_BT_MESH_PB_GATT=y
CONFIG_BT_MESH_PB_ADV=y
CONFIG_BT_MESH_GATT_PROXY=y
```

## Model Implementation Pattern

```c
/* Define a simple OnOff server model */
static void onoff_set(struct bt_mesh_model *model,
                      struct bt_mesh_msg_ctx *ctx,
                      struct net_buf_simple *buf) {
    uint8_t onoff = net_buf_simple_pull_u8(buf);
    // Apply state change to hardware
    gpio_pin_set_dt(&led, onoff);
    // Publish state
    bt_mesh_model_msg_init(model->pub->msg, BT_MESH_MODEL_OP_2(0x82, 0x04));
    net_buf_simple_add_u8(model->pub->msg, onoff);
    bt_mesh_model_publish(model);
}

static const struct bt_mesh_model_op onoff_op[] = {
    BT_MESH_MODEL_OP_2(0x82, 0x02), onoff_set,
    BT_MESH_MODEL_OP_END,
};
```

## Troubleshooting

| Problem | Check |
|---------|-------|
| Provisioning fails | PB-ADV/PB-GATT enabled? Provisioner supports same bearers? |
| Messages not relayed | Relay enabled on relay nodes? TTL > 0? |
| Model not responding | App key bound to model? Publication address correct? |
| High power consumption | Enable Friend/LPN roles properly; reduce advertising |
