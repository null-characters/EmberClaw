---
name: power-control
description: Switching power supply control driver development for embedded systems
category: IoT
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# Power Control Skill

Development of switching power supply control firmware and drivers for embedded platforms (MCU-based DC-DC, LED drivers, motor control PWM).

## Core Topics

### Topologies
- **Buck** (step-down): High-side switch + catch diode/sync rectifier
- **Boost** (step-up): Inductor + switch + diode to output
- **Buck-Boost**: Combined for wide input range
- **Flyback**: Isolated topology, transformer-based

### Control Methods
- **Voltage-mode control**: Single loop, output voltage feedback
- **Current-mode control**: Inner current loop + outer voltage loop
- **Hysteretic control**: Simple, fast transient response
- **Digital control**: MCU-based PID, feedforward, adaptive algorithms

### MCU Integration
- PWM generation (Timer/CCP peripherals)
- ADC sampling (synchronized to PWM for accurate current sensing)
- Fault protection (OCP, OVP, OTP — overcurrent/voltage/temperature)
- Communication (I2C/SPI to PMBus-compatible regulators)

## Firmware Patterns

### PID Controller

```c
typedef struct {
    float kp, ki, kd;
    float integral;
    float prev_error;
    float output_min, output_max;
} pid_t;

float pid_update(pid_t *pid, float setpoint, float measured) {
    float error = setpoint - measured;
    pid->integral += error;
    float derivative = error - pid->prev_error;
    pid->prev_error = error;
    float output = pid->kp * error + pid->ki * pid->integral + pid->kd * derivative;
    if (output > pid->output_max) output = pid->output_max;
    if (output < pid->output_min) output = pid->output_min;
    return output;
}
```

### PWM Duty Cycle Update (nRF52 example)

```c
#include <zephyr/drivers/pwm.h>

static const struct pwm_dt_spec pwm_led = PWM_DT_SPEC_GET(DT_ALIAS(pwm_led));

int set_duty_cycle(uint8_t duty_percent) {
    uint32_t pulse = (pwm_led.period * duty_percent) / 100;
    return pwm_set_pulse_dt(&pwm_led, pulse);
}
```

## Safety Considerations

- Always implement hardware fault protection (comparator + shutdown pin)
- Software OCP/OVP as second layer
- Ramp-up sequences prevent inrush current
- Brown-out detection for input voltage sag
- Watchdog timer for MCU lockup

## Testing

- Oscilloscope waveform analysis (switching node, output ripple)
- Load step transient response (10% → 90% → 10%)
- Efficiency curve measurement (input power vs output power)
- Thermal imaging under max load
- EMI pre-compliance scan
