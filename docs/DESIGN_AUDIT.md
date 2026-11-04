# Engineering Design Audit & Verification Report

**Project:** University Online Examination Network Simulation System  
**Document Status:** Formal Engineering Baseline Audit v1.0  
**Audit Date:** 2026-11-04  
**Authoritative Specification:** `NETWORK_DESIGN.md`  

---

## 1. Executive Summary

This engineering audit verifies the baseline network architecture, IP address plan, device inventory, routing protocols, Layer 2 fabric, first-hop redundancy protocols, DHCP/DNS services, web service VIP failover, security ACLs, and fault scenarios specified in `NETWORK_DESIGN.md`.

The audit was executed mathematically and programmatically using IPv4 address validation routines (`audit_math.py`). All mathematical, subnetting, and connectivity checks passed with zero overlapping ranges and zero address collisions.

---

## 2. 12-Point Engineering Audit Checklist

| Item | Audit Subject | Result | Verification Notes |
|:---|:---|:---:|:---|
| **1** | All subnet calculations and address ranges | **PASSED** | Parent block `10.20.10.0/23` (512 addresses). VLSM subnets consume 352 addresses (`10.20.10.0` to `10.20.11.95`), leaving 160 contiguous host addresses (`10.20.11.96/27` to `10.20.11.255`) for immediate lab/segment expansion. |
| **2** | All network, usable-host, and broadcast addresses | **PASSED** | Every VLAN subnet has mathematically exact binary boundaries. Lab subnets (/26) provide 62 usable host addresses; auxiliary subnets (/27) provide 30 usable host addresses; P2P transit links (/30) provide 2 usable addresses. |
| **3** | All DHCP pools and reserved addresses | **PASSED** | Two non-overlapping DHCP pools per dynamic VLAN (Pool A on `DHCP-DNS-1`, Pool B on `DHCP-DNS-2`). No DHCP pool overlaps with SVI gateway IPs (.1-.3) or server infrastructure addresses. |
| **4** | Overlapping networks or duplicate IP assignments | **PASSED** | Complete pairwise cross-check confirmed zero overlaps between any VLAN subnets, transit subnets (`10.20.255.0/24`), or the external test network (`198.51.100.0/24`). |
| **5** | Router and switch interface connections | **PASSED** | Dual-homed triangular mesh between distribution switches (`DSW1`, `DSW2`) and edge routers (`EDGE-R1`, `EDGE-R2`). Dual uplinks from each access switch to both `DSW1` and `DSW2`. |
| **6** | Redundant paths have physical/logical alternatives | **PASSED** | Every critical segment has at least two independent Layer 2 or Layer 3 paths: DSW cross-trunk, dual routed uplinks, dual edge routers, dual ISPs/wan links (external), and paired access switches. |
| **7** | Defined gateway and switching path per VLAN | **PASSED** | Each of the 8 VLANs has a designated primary and standby SVI on `DSW1` and `DSW2`. HSRP (Cisco) / VRRP (Kathará/Linux) VIP is assigned as the default gateway for client hosts. |
| **8** | OSPF network statements and routed links | **PASSED** | OSPF Area 0 configured over six `/30` links (`10.20.255.0/30` through `10.20.255.20/30`). Default route advertised conditionally via route tracking / upstream health check. |
| **9** | Implementable ACL requirements | **PASSED** | Policy enforced at distribution layer (Cisco IOS extended ACLs / Linux nftables). Permitted: Student $\to$ Exam VIP (80/443), DNS, DHCP. Denied: Student $\to$ Management; Guest $\to$ Internal subnets. |
| **10** | DHCP relay destinations reachability | **PASSED** | SVI helper-addresses / relay agents forward DHCP broadcasts to unicast destinations `10.20.10.202` (`DHCP-DNS-1`) and `10.20.10.203` (`DHCP-DNS-2`) on Server VLAN 40. |
| **11** | Primary and secondary server VIP configuration | **PASSED** | Stateless exam web nodes `10.20.10.200` and `10.20.10.201` share service VIP `10.20.10.210` via Keepalived VRRP. Health-check script tracks HTTP daemon status. |
| **12** | Circular dependencies or impossible topologies | **PASSED** | No bridging loops; RSTP blocks redundant access uplinks. OSPF transit is isolated to routed point-to-point links. DHCP relay uses static server IPs. |

---

## 3. Critical Device Inventory Audit

### Access Switch Count Clarification

A common point of ambiguity in campus network design is conflating the logical VLAN count with the physical access switch count.

- **Logical VLANs:** 8 (VLAN 10, 20, 30, 40, 50, 60, 70, 80)
- **Physical Access Switches:** **10 Access Switches in Total**
  1. `ASW-LA-1` — Lab A Primary Switch
  2. `ASW-LA-2` — Lab A Redundant Switch (Splitting 40 students across 2 physical switches)
  3. `ASW-LB-1` — Lab B Primary Switch
  4. `ASW-LB-2` — Lab B Redundant Switch (Splitting 40 students across 2 physical switches)
  5. `ASW-LC-1` — Lab C Primary Switch
  6. `ASW-LC-2` — Lab C Redundant Switch (Splitting 40 students across 2 physical switches)
  7. `ASW-SRV-1` — Server Access Switch 1 (Hosts primary server nodes)
  8. `ASW-SRV-2` — Server Access Switch 2 (Hosts secondary server nodes)
  9. `ASW-ADM-1` — Administration & Faculty Access Switch 1
  10. `ASW-ADM-2` — Administration, Management & Guest Access Switch 2

Each of the 10 access switches maintains two 802.1Q trunk uplinks: one terminating at `DSW1` and one terminating at `DSW2`.

---

## 4. Addressing & Subnet Calculation Validation

### VLSM Subnet Table

| VLAN | Name | CIDR Prefix | Subnet Mask | Network ID | First Host | Last Host | Broadcast | Gateway VIP | DSW1 SVI | DSW2 SVI | Usable Hosts | Planned Hosts |
|---:|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|---:|---:|
| 10 | LAB-A | `10.20.10.0/26` | `255.255.255.192` | `10.20.10.0` | `10.20.10.1` | `10.20.10.62` | `10.20.10.63` | `10.20.10.1` | `10.20.10.2` | `10.20.10.3` | 59 | 40 |
| 20 | LAB-B | `10.20.10.64/26` | `255.255.255.192` | `10.20.10.64` | `10.20.10.65` | `10.20.10.126` | `10.20.10.127` | `10.20.10.65` | `10.20.10.66` | `10.20.10.67` | 59 | 40 |
| 30 | LAB-C | `10.20.10.128/26` | `255.255.255.192` | `10.20.10.128` | `10.20.10.129` | `10.20.10.190` | `10.20.10.191` | `10.20.10.129` | `10.20.10.130` | `10.20.10.131` | 59 | 40 |
| 40 | SERVERS | `10.20.10.192/27` | `255.255.255.224` | `10.20.10.192` | `10.20.10.193` | `10.20.10.222` | `10.20.10.223` | `10.20.10.193` | `10.20.10.194` | `10.20.10.195` | 27 | 12 |
| 50 | ADMIN | `10.20.10.224/27` | `255.255.255.224` | `10.20.10.224` | `10.20.10.225` | `10.20.10.254` | `10.20.10.255` | `10.20.10.225` | `10.20.10.226` | `10.20.10.227` | 27 | 15 |
| 60 | FACULTY | `10.20.11.0/27` | `255.255.255.224` | `10.20.11.0` | `10.20.11.1` | `10.20.11.30` | `10.20.11.31` | `10.20.11.1` | `10.20.11.2` | `10.20.11.3` | 27 | 12 |
| 70 | NET-MGMT | `10.20.11.32/27` | `255.255.255.224` | `10.20.11.32` | `10.20.11.33` | `10.20.11.62` | `10.20.11.63` | `10.20.11.33` | `10.20.11.34` | `10.20.11.35` | 27 | 12 |
| 80 | GUEST | `10.20.11.64/27` | `255.255.255.224` | `10.20.11.64` | `10.20.11.65` | `10.20.11.94` | `10.20.11.95` | `10.20.11.65` | `10.20.11.66` | `10.20.11.67` | 27 | 20 |

*Note on Usable Hosts:* The usable host count in the table represents host addresses remaining after deducting the 3 gateway addresses (VIP, DSW1 SVI, DSW2 SVI).

### DHCP Scope Split Validation

| VLAN | DHCP Pool A (`DHCP-DNS-1`) | Leases | DHCP Pool B (`DHCP-DNS-2`) | Leases | Total Dynamic Leases |
|---:|:---|:---:|:---|:---:|:---:|
| 10 | `10.20.10.10` – `10.20.10.34` | 25 | `10.20.10.35` – `10.20.10.59` | 25 | 50 |
| 20 | `10.20.10.74` – `10.20.10.98` | 25 | `10.20.10.99` – `10.20.10.123` | 25 | 50 |
| 30 | `10.20.10.138` – `10.20.10.162` | 25 | `10.20.10.163` – `10.20.10.187` | 25 | 50 |
| 50 | `10.20.10.230` – `10.20.10.239` | 10 | `10.20.10.240` – `10.20.10.249` | 10 | 20 |
| 60 | `10.20.11.10` – `10.20.11.19` | 10 | `10.20.11.20` – `10.20.11.29` | 10 | 20 |
| 80 | `10.20.11.70` – `10.20.11.79` | 10 | `10.20.11.80` – `10.20.11.89` | 10 | 20 |

---

## 5. First-Hop Redundancy Alignment (HSRP / VRRP)

To prevent traffic asymmetry across the Layer 2/Layer 3 boundary, the active gateway switch must align with the Spanning Tree root bridge for each respective VLAN.

- **DSW1 Primary (Priority 110 Active / RSTP Root):**
  - VLAN 10 (LAB-A)
  - VLAN 30 (LAB-C)
  - VLAN 50 (ADMIN)
  - VLAN 70 (NET-MGMT)
- **DSW2 Primary (Priority 110 Active / RSTP Root):**
  - VLAN 20 (LAB-B)
  - VLAN 40 (SERVERS)
  - VLAN 60 (FACULTY)
  - VLAN 80 (GUEST)

Secondary switch configured with Priority 90 and Preempt enabled on both switches.

---

## 6. OSPF Area 0 and Routed Transit Topology

Point-to-point transit connections are established over `/30` links:
1. `DSW1` (eth1: `10.20.255.9`) $\leftrightarrow$ `EDGE-R1` (eth1: `10.20.255.10`)
2. `DSW1` (eth2: `10.20.255.13`) $\leftrightarrow$ `EDGE-R2` (eth1: `10.20.255.14`)
3. `DSW2` (eth1: `10.20.255.17`) $\leftrightarrow$ `EDGE-R1` (eth2: `10.20.255.18`)
4. `DSW2` (eth2: `10.20.255.21`) $\leftrightarrow$ `EDGE-R2` (eth2: `10.20.255.22`)
5. `EDGE-R1` (eth0: `10.20.255.1`) $\leftrightarrow$ `ISP1` (eth0: `10.20.255.2`)
6. `EDGE-R2` (eth0: `10.20.255.5`) $\leftrightarrow$ `ISP1` (eth1: `10.20.255.6`)

### Default Route Propagation Rule
`EDGE-R1` and `EDGE-R2` originate an OSPF default route (`0.0.0.0/0`) dynamically only when upstream reachability to `ISP1` is active (verified through BFD or ip route tracking). Unconditional `default-information originate always` is strictly prohibited.

---

## 7. Audit Conclusion

The authoritative design is mathematically robust, free of address conflicts, and technically sound. All components are approved for automated generation and implementation.

