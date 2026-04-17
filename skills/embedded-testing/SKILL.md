---
name: embedded-testing
description: Embedded systems testing — unit, integration, HIL, and CI for firmware
category: IoT
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# Embedded Testing Skill

Testing strategies for embedded firmware: unit testing on host, integration on target, hardware-in-the-loop (HIL), and CI pipeline setup.

## Testing Layers

### 1. Unit Testing (Host-side)

Run logic tests on the development machine without target hardware.

**Frameworks:**
- **Unity** (ThrowTheSwitch) — lightweight C test framework
- **Google Test** — C++ projects
- **CMock** — mock generation for C

**Strategy:**
- Abstract hardware access behind HAL (Hardware Abstraction Layer)
- Mock HAL functions in tests
- Test pure logic: state machines, parsers, protocols, math

```c
// Unity test example
void test_pid_clamps_output(void) {
    pid_t pid = { .kp=1.0f, .ki=0.0f, .kd=0.0f, .output_min=0.0f, .output_max=100.0f };
    float out = pid_update(&pid, 200.0f, 0.0f); // huge error
    TEST_ASSERT_EQUAL_FLOAT(100.0f, out);        // should clamp
}
```

### 2. Integration Testing (On-target)

Flash firmware on dev board and run automated test sequences.

**Tools:**
- **Zephyr Test Framework**: `ztest`, `CONFIG_ZTEST`
- **nRF Connect SDK**: `west build -b nrf52840dk_nrf52840 -- -DCONFIG_ZTEST=y`
- **GDB + OpenOCD**: Automated flash + run + collect output

### 3. Hardware-in-the-Loop (HIL)

Physical test rigs with actuators/sensors controlled by the test host.

**Components:**
- Relay boards for power cycling
- Logic analyzers (Saleae) for signal verification
- Programmable loads for power supply testing
- BLE dongle for wireless link testing

### 4. CI Pipeline

```yaml
# GitHub Actions example
name: Firmware CI
on: [push, pull_request]
jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd firmware && mkdir build && cd build && cmake .. -DBUILD_TESTS=ON && make && ctest
  build-target:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: nrfconnect/action-setup-ncs@v2
      - run: west build -b nrf52840dk_nrf52840
      - uses: actions/upload-artifact@v4
        with:
          name: firmware-hex
          path: build/zephyr/zephyr.hex
```

## Coverage & Quality

- Use `gcov` / `lcov` for host-side code coverage
- Target >80% line coverage for logic modules
- Static analysis: `cppcheck`, `clang-tidy`, `PC-lint`
- MISRA C compliance for safety-critical modules

## Best Practices

- Keep hardware-dependent code thin (HAL only)
- Test at the API boundary, not internal implementation
- Use CI to build firmware on every PR (catches build errors early)
- HIL tests run nightly or on release branches (costly hardware)
