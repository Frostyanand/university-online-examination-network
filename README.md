# University Online Examination Network Simulation System

[![Build Status](https://img.shields.io/badge/Next.js-14.2.15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Kathará](https://img.shields.io/badge/Kathar%C3%A1-Framework-blue)](https://www.kathara.org/)
[![Docker](https://img.shields.io/badge/Docker-Containers-2496ED?style=flat&logo=docker)](https://www.docker.com/)
[![Cisco Packet Tracer](https://img.shields.io/badge/Packet%20Tracer-8.2+-005073?style=flat)](https://www.netacad.com/)

An enterprise-grade, highly available, multi-layer network simulation and emulation system built from scratch for university online examination infrastructure.

This repository features **two distinct, fully realized deliverables** built from a single authoritative specification:
1. **Deliverable A:** Standalone **Cisco Packet Tracer** project (`.pkt`), fully cabled and configured via automated Python generation (0 manual GUI operations required).
2. **Deliverable B:** Standalone **Next.js NOC Operations Workbench & Kathará/Docker Network Emulator**, executing real Linux kernel network interfaces, Open vSwitch bridges, FRRouting OSPF daemons, Keepalived VRRP virtual gateways, and Nginx web server clusters.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |               CAMPUS CORE             |
                      |  [R-CORE-1] <==== 10.20.0.0/30 =====> [R-CORE-2]  |
                      |   (1.1.1.1)       OSPF Area 0         (1.1.1.2)   |
                      +-------+-------------------------------+-------+
                              | \                           / |
              10.20.0.4/30    |   \ 10.20.0.8/30 10.20.0.12/30|   | 10.20.0.16/30
                              |     \                       / |
                      +-------+-------\-------------------+---+-------+
                      |         DISTRIBUTION LAYER (MLS)              |
                      |  [DSW-1 (VRRP Master)] <===> [DSW-2 (Backup)] |
                      |    VIPs: 10.20.x.1        10.20.0.20/30       |
                      +-------+-------------------------------+-------+
                              |                               |
          +-------------------+-------------------------------+-------------------+
          |                   |                               |                   |
+---------+---------+ +-------+---------+           +---------+---------+ +-------+---------+
|    EXAM LAB A     | |    EXAM LAB B   |           |   EXAM SERVERS    | |  ADMIN & FACULTY  |
| [ASW-A1] [ASW-A2] | | [ASW-B1] [ASW-B2]           | [ASW-SRV1] [ASW-SRV2] | [ASW-ADM1] [ASW-ADM2]
|   VLAN 20 (/23)   | |   VLAN 30 (/24) |           |   VLAN 10 (/24)   | | VLAN 50,60,70,80|
| 380 Workstations  | | 190 Workstations|           |  Web Cluster VIP  | | Secure Isolation|
|  (510 Usable IPs) | | (254 Usable IPs)|           |   10.20.10.210    | |  Strict L3 ACLs |
+-------------------+ +-----------------+           +-------------------+ +-----------------+
```

---

## Deliverables Summary

### Deliverable A: Cisco Packet Tracer Standalone Project
- **Primary Binary File:** [`artifacts/cisco/university_online_examination_network.pkt`](artifacts/cisco/university_online_examination_network.pkt) (127,658 bytes)
- **Device Count:** 31 Devices (2 Core Routers, 2 DSW MLS, 10 Access Switches, 4 Servers, 13 Workstations)
- **High-Resolution Topology:** [`artifacts/cisco/topology.svg`](artifacts/cisco/topology.svg)
- **Inventory Exports:** [`artifacts/cisco/device-inventory.csv`](artifacts/cisco/device-inventory.csv) & [`artifacts/cisco/ip-addressing.csv`](artifacts/cisco/ip-addressing.csv)
- **Cisco IOS Configurations:** [`packet-tracer/device-configs/*.cfg`](packet-tracer/device-configs/) (15 files)
- **Verification Audit:** Passed with **0 Failures, 0 Warnings** via `pkt_core.audit.validate_lab`.

### Deliverable B: Next.js NOC Workbench & Simulation Engine
- **Frontend Workbench:** Next.js 14 App Router, TypeScript, TailwindCSS, React Flow topology visualizer, real-time telemetry.
- **Backend Emulation Engine:** Python FastAPI, Docker Engine integration, Kathará framework, Scapy packet analyzer.
- **Switching Infrastructure:** Open vSwitch (OVS 3.1.0) with IEEE 802.1w Rapid Spanning Tree Protocol (RSTP).
- **Routing Infrastructure:** FRRouting (FRR 10.5.3) running OSPFv2 Single-Area Backbone (Area 0.0.0.0).
- **Gateway Redundancy:** Keepalived VRRPv3 virtual gateways (`10.20.x.1`) with sub-second failover.
- **Web Cluster High Availability:** Floating IP `10.20.10.210` between dual Nginx web servers.

---

## IP Addressing & VLSM Subnet Plan (Supernet: 10.20.0.0/16)

| VLAN | Name | CIDR Subnet | Subnet Mask | Usable Range | Default VIP | DSW-1 IP | DSW-2 IP | Host Capacity |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **10** | `VLAN_EXAM_SRV` | `10.20.10.0/24` | `255.255.255.0` | `10.20.10.1 - .254` | `10.20.10.1` | `10.20.10.2` | `10.20.10.3` | 15 / 254 |
| **20** | `VLAN_LAB_A` | `10.20.20.0/23` | `255.255.254.0` | `10.20.20.1 - 10.20.21.254` | `10.20.20.1` | `10.20.20.2` | `10.20.20.3` | 380 / 510 |
| **30** | `VLAN_LAB_B` | `10.20.30.0/24` | `255.255.255.0` | `10.20.30.1 - .254` | `10.20.30.1` | `10.20.30.2` | `10.20.30.3` | 190 / 254 |
| **40** | `VLAN_LAB_C` | `10.20.40.0/24` | `255.255.255.0` | `10.20.40.1 - .254` | `10.20.40.1` | `10.20.40.2` | `10.20.40.3` | 190 / 254 |
| **50** | `VLAN_FACULTY` | `10.20.50.0/24` | `255.255.255.0` | `10.20.50.1 - .254` | `10.20.50.1` | `10.20.50.2` | `10.20.50.3` | 60 / 254 |
| **60** | `VLAN_ADMIN` | `10.20.60.0/24` | `255.255.255.0` | `10.20.60.1 - .254` | `10.20.60.1` | `10.20.60.2` | `10.20.60.3` | 45 / 254 |
| **70** | `VLAN_MGMT` | `10.20.70.0/24` | `255.255.255.0` | `10.20.70.1 - .254` | `10.20.70.1` | `10.20.70.2` | `10.20.70.3` | 25 / 254 |
| **80** | `VLAN_GUEST` | `10.20.80.0/24` | `255.255.255.0` | `10.20.80.1 - .254` | `10.20.80.1` | `10.20.80.2` | `10.20.80.3` | 100 / 254 |

**Point-to-Point Transit Links (/30s):**
- `R-CORE-1 <-> R-CORE-2`: `10.20.0.0/30`
- `R-CORE-1 <-> DSW-1`: `10.20.0.4/30`
- `R-CORE-1 <-> DSW-2`: `10.20.0.8/30`
- `R-CORE-2 <-> DSW-1`: `10.20.0.12/30`
- `R-CORE-2 <-> DSW-2`: `10.20.0.16/30`
- `DSW-1 <-> DSW-2`: `10.20.0.20/30`

---

## Quick Start Guide

### Prerequisites
- **Operating System:** Windows 10/11 (with WSL2) or Linux (Ubuntu 22.04+)
- **Python:** Python 3.10+
- **Node.js:** Node.js v18+ or v20+
- **Docker:** Docker Desktop or Docker Engine running
- **Cisco Packet Tracer:** Version 8.0+ (for Deliverable A `.pkt` review)

---

### Starting the System (Windows PowerShell)

```powershell
# 1. Verify Prerequisites
.\scripts\windows\check-prerequisites.ps1

# 2. Run Setup (installs pip & npm packages, builds docker images, generates configs)
.\scripts\windows\setup.ps1

# 3. Start the Simulation API and Next.js Web UI
.\scripts\windows\start.ps1
```

Once launched:
- **NOC Web Operations Centre:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Packet Tracer File:** `artifacts/cisco/university_online_examination_network.pkt`

To stop or reset the system:
```powershell
.\scripts\windows\stop.ps1      # Cleanly terminates simulation
.\scripts\windows\reset.ps1     # Wipes temporary lab state and restores pristine configs
.\scripts\windows\diagnose.ps1  # Runs full health checks on containers and ports
```

---

### Starting the System (Linux / macOS Bash)

```bash
# 1. Audit Prerequisites
chmod +x scripts/linux/*.sh
./scripts/linux/check-prerequisites.sh

# 2. Run Setup
./scripts/linux/setup.sh

# 3. Start Platform
./scripts/linux/start.sh
```

---

## Next.js NOC Operations Pages (8 Workbenches)

1. **NOC Operations Centre (`/`):** Real-time device status cards, interactive React Flow fabric topology, live device inspector, and quick terminal actions.
2. **IP Addressing & VLSM Workbench (`/addressing`):** Authoritative IP matrix, mathematical VLSM vs FLSM efficiency calculator, and custom CIDR subnet calculator.
3. **Packet Journey Explorer (`/packet-explorer`):** Hop-by-hop packet decapsulation timeline (ARP, 802.1Q tags, SVI routing, TCP handshakes) and downloadable raw PCAP captures.
4. **Device Configuration Explorer (`/devices`):** Side-by-side comparison of Cisco IOS running-config vs Linux/FRR/OVS commands, with interactive live web terminal.
5. **Fault Injection Lab (`/faults`):** One-click trigger and recovery for 14 failure scenarios (F01–F14) with live telemetry and convergence timers.
6. **Connectivity Test Centre (`/tests`):** Full 8-test acceptance suite runner (intra-VLAN, inter-VLAN, web VIP, ACL drop, DNS, OSPF adjacencies) with terminal console.
7. **Campus Scalability Planner (`/scalability`):** Automatic subnet calculation and CLI script generation for adding new exam halls (e.g. Lab D with 250 stations) without downtime.
8. **Networking Concepts & Viva Reference (`/viva`):** Comprehensive academic guide covering Ethernet, ARP, DHCP DORA, OSPF, VRRP, RSTP, 20+ viva interview Q&As, and student team contribution logs.

---

## Complete Fault Scenarios (F01 - F14)

- **F01:** Core Link Failure (`R-CORE-1 <-> R-CORE-2`) — OSPF Dijkstra reroute via DSW switches (< 1.5s).
- **F02:** Primary Distribution Uplink Failure (`R-CORE-1 <-> DSW-1`) — OSPF metric cost shift (< 2.0s).
- **F03:** Secondary Distribution Uplink Failure (`R-CORE-2 <-> DSW-2`) — Asymmetric OSPF transit (< 2.0s).
- **F04:** Primary Distribution MLS Crash (`DSW-1`) — VRRP gateway failover to DSW-2 (< 3.6s).
- **F05:** Access Switch Uplink Cut (`ASW-LAB-A1 -> DSW-1`) — RSTP unblocks alternate trunk (< 0.8s).
- **F06:** Total Access Switch Failure (`ASW-LAB-A1`) — Redundant switch `ASW-LAB-A2` isolates failure.
- **F07:** DHCP Server Outage (`SRV-DNS-DHCP`) — Lease persistence prevents student disconnects.
- **F08:** Primary DNS Resolver Outage — Secondary DNS fallback query (< 1.0s).
- **F09:** Primary Web Portal Outage (`SRV-WEB-1`) — Keepalived VIP `10.20.10.210` shifts to `SRV-WEB-2` (< 1.8s).
- **F10:** Database Server Outage (`SRV-DB`) — Web frontends cache submissions locally (< 3.0s).
- **F11:** L2 Broadcast Loop Induction — RSTP BPDU detection places looping port in Discarding (< 50ms).
- **F12:** Inter-VLAN SVI Failure (`vlan20`) — Inter-chassis trunk forwards across DSW-2 SVI (< 2.0s).
- **F13:** External WAN Border Flap — OSPF default-information metric shifts to Core 2 (< 1.5s).
- **F14:** Rogue DHCP Server Injection — Access switch untrusted port drops rogue DHCPOFFERs instantly.

---

## Technical Documentation Suite (`docs/`)

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): Multi-layer campus topology, device inventory, and hardware specifications.
- [`docs/DESIGN_AUDIT.md`](docs/DESIGN_AUDIT.md): Mathematical audit of subnets, gateway VIPs, transit links, and inventory count resolution.
- [`docs/IP_ADDRESSING.md`](docs/IP_ADDRESSING.md): Detailed VLSM calculations, broadcast ranges, and FLSM comparison proofs.
- [`docs/PROTOCOL_REFERENCE.md`](docs/PROTOCOL_REFERENCE.md): Technical deep-dive on OSPFv2, VRRP, HSRP, RSTP, 802.1Q, and DHCP Relay.
- [`docs/PACKET_FLOW.md`](docs/PACKET_FLOW.md): Hop-by-hop packet header decapsulation and routing journeys.
- [`docs/FAULT_SCENARIOS.md`](docs/FAULT_SCENARIOS.md): Protocol mechanics and recovery benchmarks for scenarios F01 through F14.
- [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md): System acceptance test results, latency tables, and terminal outputs.
- [`docs/PACKET_TRACER_GUIDE.md`](docs/PACKET_TRACER_GUIDE.md): Cisco Packet Tracer opening, verification, and testing guide.
- [`docs/VIVA_PREPARATION.md`](docs/VIVA_PREPARATION.md): Comprehensive theoretical viva defense questions and model answers.
- [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md): Simulation constraints, host hardware limits, and future roadmap.
- [`docs/TEAM_CONTRIBUTIONS.md`](docs/TEAM_CONTRIBUTIONS.md): Individual student contribution logs and accountability matrix.

---

## Project Structure

```
university-exam-network/
│
├── NETWORK_DESIGN.md                     # Authoritative engineering baseline
├── README.md                             # Project manual and execution guide
│
├── apps/
│   └── web/                              # Next.js 14 NOC Operations Frontend
│       ├── src/app/                      # 8 Dedicated Workbench Pages
│       ├── src/components/               # TopologyView, Navbar, Controls
│       └── src/lib/                      # API Client & TypeScript Interfaces
│
├── backend/
│   └── simulation-api/                   # FastAPI Emulation Engine
│       ├── routers/                      # Simulation, Devices, Tests, Faults, Addressing
│       ├── services/                     # Kathará controller, Scapy PCAP, Test runner
│       └── main.py                       # FastAPI application entrypoint
│
├── network/
│   ├── network-spec.yaml                 # Machine-readable single source of truth
│   ├── kathara/                          # Kathará lab generator & lab configurations
│   └── validation/                       # Mathematical spec audit & verification scripts
│
├── packet-tracer/
│   ├── generator/                        # Automated .pkt builder & IOS config generator
│   ├── device-configs/                   # 15 Cisco IOS running-config files
│   └── validation/                       # Automated pkt_core audit validator
│
├── artifacts/
│   ├── cisco/                            # .pkt binary, SVG diagram, inventory CSVs
│   ├── pcaps/                            # Captured .pcap packet capture traces
│   └── reports/                          # Verification logs and audit reports
│
├── scripts/
│   ├── windows/                          # PowerShell setup, start, stop, reset, diagnose
│   └── linux/                            # Bash setup, start, stop, reset, diagnose
│
├── docker/                               # Custom Dockerfiles for DSW and Web cluster
└── docs/                                 # 11 In-depth technical documentation files
```

---

## Academic Assessment & Team Roster

| Member | Role | Key Contributions |
| :--- | :--- | :--- |
| **Student 1** | Lead Systems Architect | Dual-Core OSPF Area 0, Triangle Routing Backbone, VRRP Gateway Design |
| **Student 2** | L2 Switching & Security Specialist | Open vSwitch Bridges, 802.1Q Trunks, RSTP Loop Prevention, Security ACLs |
| **Student 3** | Network Services & HA Engineer | VLSM Subnet Plan, Multi-Pool DHCP Relay, Authoritative DNS, Keepalived Web VIP |
| **Student 4** | Test Automation & Full-Stack Engineer | Automated Packet Tracer Generator, FastAPI Backend, Scapy PCAP, Next.js NOC UI |

