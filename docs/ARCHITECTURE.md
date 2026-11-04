# University Online Examination Network: Architecture Reference

## 1. Executive Summary & Design Philosophy

The University Online Examination Network Simulation System is designed to provide **zero single points of failure**, deterministic sub-second convergence, strict security isolation between academic roles, and guaranteed high availability for mission-critical digital examinations.

The architecture strictly follows the industry-standard **Cisco Three-Tier Hierarchical Campus Network Model**:
1. **Core Layer:** High-speed transport and routing backbone without packet inspection overhead.
2. **Distribution Layer:** Policy enforcement, Inter-VLAN routing, First-Hop Redundancy (VRRP/HSRP), and Quality of Service (QoS).
3. **Access Layer:** High-density workstation connectivity, 802.1Q VLAN segmentation, Rapid Spanning Tree (RSTP), and Port Security.

---

## 2. Comprehensive Device Inventory (31 Physical / Logical Devices)

| Layer | Device ID | Role | Emulation Engine | Physical Hardware Baseline |
| :--- | :--- | :--- | :--- | :--- |
| **Core** | `R-CORE-1` | Primary Core Gateway | Kathará / FRRouting (OSPFv2) | Cisco 2911 ISR Router |
| **Core** | `R-CORE-2` | Secondary Core Gateway | Kathará / FRRouting (OSPFv2) | Cisco 2911 ISR Router |
| **Distribution** | `DSW-1` | Primary MLS / VRRP Master | Kathará / FRR + OVS + Keepalived | Cisco Catalyst 3560-24PS |
| **Distribution** | `DSW-2` | Secondary MLS / VRRP Backup | Kathará / FRR + OVS + Keepalived | Cisco Catalyst 3560-24PS |
| **Access** | `ASW-LAB-A1` | Exam Lab A Switch 1 (Odd Stations) | Kathará / Open vSwitch (RSTP) | Cisco Catalyst 2960-24TT |
| **Access** | `ASW-LAB-A2` | Exam Lab A Switch 2 (Even Stations) | Kathará / Open vSwitch (RSTP) | Cisco Catalyst 2960-24TT |
| **Access** | `ASW-LAB-B1` | Exam Lab B Switch 1 | Kathará / Open vSwitch (RSTP) | Cisco Catalyst 2960-24TT |
| **Access** | `ASW-LAB-B2` | Exam Lab B Switch 2 | Kathará / Open vSwitch (RSTP) | Cisco Catalyst 2960-24TT |
| **Access** | `ASW-LAB-C1` | Exam Lab C Switch 1 | Kathará / Open vSwitch (RSTP) | Cisco Catalyst 2960-24TT |
| **Access** | `ASW-LAB-C2` | Exam Lab C Switch 2 | Kathará / Open vSwitch (RSTP) | Cisco Catalyst 2960-24TT |
| **Access** | `ASW-SRV-1` | Server Farm Access Switch 1 | Kathará / Open vSwitch (RSTP) | Cisco Catalyst 2960-24TT |
| **Access** | `ASW-SRV-2` | Server Farm Access Switch 2 | Kathará / Open vSwitch (RSTP) | Cisco Catalyst 2960-24TT |
| **Access** | `ASW-ADM-1` | Admin & Faculty Access Switch 1 | Kathará / Open vSwitch (RSTP) | Cisco Catalyst 2960-24TT |
| **Access** | `ASW-ADM-2` | Admin & Faculty Access Switch 2 | Kathará / Open vSwitch (RSTP) | Cisco Catalyst 2960-24TT |
| **Servers** | `SRV-WEB-1` | Primary Exam Web Portal (Active) | Nginx + Keepalived VIP | Linux Enterprise Host |
| **Servers** | `SRV-WEB-2` | Secondary Exam Web Portal (Standby)| Nginx + Keepalived VIP | Linux Enterprise Host |
| **Servers** | `SRV-DB` | PostgreSQL Exam Database Server | Linux Base (`kathara/base`) | Linux Enterprise Host |
| **Servers** | `SRV-DNS-DHCP`| Campus Authoritative DNS & DHCP | `dnsmasq` Multi-Pool Relay | Linux Enterprise Host |
| **Clients** | `PC-LAB-A1..C2`| Student Examination Workstations | Linux Workstations (VLAN 20/30/40) | Standard Campus Desktop |
| **Clients** | `PC-FAC-1` | Faculty Invigilation Laptop | Linux Workstation (VLAN 50) | Campus Laptop |
| **Clients** | `PC-ADM-1` | Examination Controller Workstation | Linux Workstation (VLAN 60) | Secure Admin PC |
| **Clients** | `PC-MGMT-1` | Network Engineering Station | Linux Workstation (VLAN 70) | OOB Management Console |
| **Clients** | `PC-GUEST-1`| External Auditor / Guest Client | Linux Workstation (VLAN 80) | Untrusted Mobile Client |

*Total Count: 2 Core + 2 Distribution + 10 Access + 4 Servers + 13 End-User Workstations = 31 Devices.*

---

## 3. Layer-by-Layer Architectural Details

### 3.1 Core Layer Routing Fabric
- **Topology:** Full Triangle Mesh between `R-CORE-1`, `R-CORE-2`, and the Distribution switches.
- **Protocol:** Single-Area OSPFv2 (Area 0.0.0.0).
- **Transit Addressing:** Subnets sized with `/30` point-to-point masks (`255.255.255.252`):
  - `R-CORE-1 <-> R-CORE-2`: `10.20.0.0/30`
  - `R-CORE-1 <-> DSW-1`: `10.20.0.4/30`
  - `R-CORE-1 <-> DSW-2`: `10.20.0.8/30`
  - `R-CORE-2 <-> DSW-1`: `10.20.0.12/30`
  - `R-CORE-2 <-> DSW-2`: `10.20.0.16/30`
  - `DSW-1 <-> DSW-2`: `10.20.0.20/30`
- **Convergence:** Equal-Cost Multi-Path (ECMP) routing with dead interval timers achieving sub-2-second failover.

### 3.2 Distribution Layer Multi-Layer Switching
- **Gateway Redundancy:**
  - Virtual Router Redundancy Protocol (VRRP / RFC 5798) on Linux/Kathará.
  - Hot Standby Router Protocol (HSRP) in Cisco Packet Tracer.
  - `DSW-1` acts as **Active/Master** (Priority 110 with Preemption enabled).
  - `DSW-2` acts as **Standby/Backup** (Priority 100).
  - Shared Virtual IP (VIP): `10.20.x.1` across all 8 VLANs.
  - Virtual MAC Format: `00:00:5E:00:01:{VRID}` (e.g. `00:00:5E:00:01:14` for VLAN 20).
- **Inter-VLAN Routing:** Switched Virtual Interfaces (SVIs) configured on `DSW-1` and `DSW-2` terminate VLANs 10, 20, 30, 40, 50, 60, 70, 80.
- **Access Control Policies:** Stateless packet filters prevent unauthorized VLANs (e.g. Guest VLAN 80) from reaching the internal Exam Server farm or Database.

### 3.3 Access Layer Switching & Spanning Tree
- **Switching Engine:** Open vSwitch (OVS 3.1.0) on Linux; Cisco Catalyst 2960 on Packet Tracer.
- **Trunking:** 802.1Q encapsulation with explicit allowed VLAN lists on all inter-switch trunks.
- **Loop Prevention:** Rapid Spanning Tree Protocol (IEEE 802.1w / RSTP).
  - `DSW-1` is configured as Primary Root Bridge (`bridge_priority = 0x1000` / 4096).
  - `DSW-2` is configured as Secondary Root Bridge (`bridge_priority = 0x2000` / 8192).
  - Access switches operate at default priority 32768, ensuring deterministic root placement at the distribution tier.

---

## 4. High-Availability Server Farm Cluster
- **Floating Virtual IP:** `10.20.10.210` shared between `SRV-WEB-1` (Master, priority 101) and `SRV-WEB-2` (Backup, priority 100).
- **Failover Mechanism:** Keepalived health script periodically queries local Nginx HTTP socket (`curl -I http://127.0.0.1:80`). If Nginx terminates, Keepalived releases the VIP, and `SRV-WEB-2` assumes it within 1.5 seconds without dropping active exam submissions.
- **Database Backend:** `SRV-DB` at `10.20.10.15` isolated on port 5432, accessible only by Web server IPs.

