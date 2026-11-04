# Automated Cisco Packet Tracer Generator (Deliverable A)

This directory contains the Python generator, device configuration templates, and validation scripts for **Deliverable A** of the University Online Examination Network Simulation System.

## Directory Layout

- `generator/`
  - `generate_pkt.py`: Builds the complete `.pkt` binary container, SVG diagram, and CSV inventories from `network/network-spec.yaml`.
  - `generate_ios_configs.py`: Compiles Cisco IOS configuration files for all routers, multilayer switches, and access switches.
- `device-configs/`: Contains 15 pre-compiled Cisco IOS startup configuration files (`.cfg`) for offline inspection.
- `validation/`
  - `validate_pkt.py`: Performs structural, link consistency, and schema audit on the generated `.pkt` file using `pkt_core.audit`.
- `scripts/`: Helper scripts for running the generator on Windows and Linux.

## Generating the Packet Tracer File

To generate all deliverables:

```powershell
# 1. Generate IOS configs
python packet-tracer/generator/generate_ios_configs.py

# 2. Build .pkt topology, SVG diagram, and CSV exports
python packet-tracer/generator/generate_pkt.py

# 3. Validate generated artifacts
python packet-tracer/validation/validate_pkt.py
```

Generated outputs are placed in `artifacts/cisco/`:
- `university_online_examination_network.pkt`
- `topology.svg`
- `device-inventory.csv`
- `ip-addressing.csv`

