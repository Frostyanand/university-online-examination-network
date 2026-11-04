# IP Addressing and VLSM Architecture Plan

## 1. Supernet Allocation & Design Rationale

The university campus network is assigned the contiguous private supernet block:
```
10.20.0.0/16  (Netmask: 255.255.0.0 | Total Addresses: 65,536)
```

To eliminate address fragmentation and prevent waste, Variable-Length Subnet Masking (VLSM) is implemented. Subnet prefixes are calculated based strictly on:
$$\text{Required Host Bits } h = \lceil \log_2(\text{Host Count} + 2) \rceil$$
Subnet mask prefix length is then $32 - h$.

---

## 2. Master VLAN Subnet Matrix

| VLAN | VLAN Name | Purpose / Department | Subnet / CIDR | Subnet Mask | Usable Host Range | Broadcast | Gateway VIP | DSW-1 IP | DSW-2 IP | DHCP Pool Scope |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **10** | `VLAN_EXAM_SRV` | Exam Servers & Infrastructure | `10.20.10.0/24` | `255.255.255.0` | `10.20.10.1 - 10.20.10.254` | `10.20.10.255` | `10.20.10.1` | `10.20.10.2` | `10.20.10.3` | `10.20.10.100 - .200` |
| **20** | `VLAN_LAB_A` | Exam Hall A (Large Capacity) | `10.20.20.0/23` | `255.255.254.0` | `10.20.20.1 - 10.20.21.254` | `10.20.21.255` | `10.20.20.1` | `10.20.20.2` | `10.20.20.3` | `10.20.20.10 - 10.20.21.250`|
| **30** | `VLAN_LAB_B` | Exam Hall B (Medium Capacity) | `10.20.30.0/24` | `255.255.255.0` | `10.20.30.1 - 10.20.30.254` | `10.20.30.255` | `10.20.30.1` | `10.20.30.2` | `10.20.30.3` | `10.20.30.10 - .250` |
| **40** | `VLAN_LAB_C` | Exam Hall C (Medium Capacity) | `10.20.40.0/24` | `255.255.255.0` | `10.20.40.1 - 10.20.40.254` | `10.20.40.255` | `10.20.40.1` | `10.20.40.2` | `10.20.40.3` | `10.20.40.10 - .250` |
| **50** | `VLAN_FACULTY`| Invigilators & Professors | `10.20.50.0/24` | `255.255.255.0` | `10.20.50.1 - 10.20.50.254` | `10.20.50.255` | `10.20.50.1` | `10.20.50.2` | `10.20.50.3` | `10.20.50.10 - .250` |
| **60** | `VLAN_ADMIN` | Exam Controller & Operations | `10.20.60.0/24` | `255.255.255.0` | `10.20.60.1 - 10.20.60.254` | `10.20.60.255` | `10.20.60.1` | `10.20.60.2` | `10.20.60.3` | `10.20.60.10 - .250` |
| **70** | `VLAN_MGMT` | Network Out-of-Band Mgmt | `10.20.70.0/24` | `255.255.255.0` | `10.20.70.1 - 10.20.70.254` | `10.20.70.255` | `10.20.70.1` | `10.20.70.2` | `10.20.70.3` | Static Reservations Only|
| **80** | `VLAN_GUEST` | External Auditors (Quarantined)| `10.20.80.0/24` | `255.255.255.0` | `10.20.80.1 - 10.20.80.254` | `10.20.80.255` | `10.20.80.1` | `10.20.80.2` | `10.20.80.3` | `10.20.80.10 - .250` |

---

## 3. Routed Point-to-Point Transit Links (/30 Allocations)

All inter-router and distribution links are configured as point-to-point subnets using `/30` (`255.255.255.252`):

| Segment | Subnet | Node 1 Endpoint | Node 2 Endpoint | Broadcast | Wildcard Mask |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `R-CORE-1 <-> R-CORE-2` | `10.20.0.0/30` | `10.20.0.1` | `10.20.0.2` | `10.20.0.3` | `0.0.0.3` |
| `R-CORE-1 <-> DSW-1` | `10.20.0.4/30` | `10.20.0.5` | `10.20.0.6` | `10.20.0.7` | `0.0.0.3` |
| `R-CORE-1 <-> DSW-2` | `10.20.0.8/30` | `10.20.0.9` | `10.20.0.10` | `10.20.0.11` | `0.0.0.3` |
| `R-CORE-2 <-> DSW-1` | `10.20.0.12/30`| `10.20.0.13` | `10.20.0.14` | `10.20.0.15` | `0.0.0.3` |
| `R-CORE-2 <-> DSW-2` | `10.20.0.16/30`| `10.20.0.17` | `10.20.0.18` | `10.20.0.19` | `0.0.0.3` |
| `DSW-1 <-> DSW-2` | `10.20.0.20/30`| `10.20.0.21` | `10.20.0.22` | `10.20.0.23` | `0.0.0.3` |

---

## 4. Static Infrastructure Reservations (VLAN 10)

| IP Address | Assigned Device / Entity | Protocol / Ports | Purpose |
| :--- | :--- | :--- | :--- |
| `10.20.10.1` | VRRP / HSRP Virtual Gateway | ICMP / ARP | Default gateway for all exam infrastructure |
| `10.20.10.2` | `DSW-1` SVI Interface `vlan10` | SVI Layer 3 | Primary physical gateway address |
| `10.20.10.3` | `DSW-2` SVI Interface `vlan10` | SVI Layer 3 | Secondary physical gateway address |
| `10.20.10.5` | `SRV-DNS-DHCP` | UDP 53, 67 | Campus authoritative DNS & DHCP Server |
| `10.20.10.10`| `SRV-WEB-1` (Physical) | TCP 80, 443 | Primary Nginx Web Exam Engine |
| `10.20.10.11`| `SRV-WEB-2` (Physical) | TCP 80, 443 | Secondary Nginx Web Exam Engine |
| `10.20.10.15`| `SRV-DB` | TCP 5432 | High-Performance Exam Database Server |
| `10.20.10.210`| **Web Cluster High-Availability VIP** | TCP 80, 443 | Floating Keepalived Service VIP |

---

## 5. Mathematical Proof: VLSM vs FLSM Efficiency

### Case A: Standard Fixed-Length Subnetting (FLSM with /24)
- **Constraint:** Fixed mask `255.255.255.0` gives 254 usable hosts per subnet.
- **Deficiency:** Lab A requires **380 workstations**. Under FLSM /24, Lab A would exceed capacity by 126 hosts and would have to be fragmented across two disjoint subnets, requiring an extra router hop, extra access switch VLANs, and breaking Layer 2 exam broadcast discovery.

### Case B: Standard Fixed-Length Subnetting (FLSM with /23)
- **Constraint:** Fixed mask `255.255.254.0` gives 510 usable hosts per subnet.
- **Deficiency:** Sizing point-to-point links with a /23 wastes $(510 - 2) \times 6 = 3,048$ IP addresses on six router-to-router links alone. Total efficiency drops below 28%.

### Adopted Solution: VLSM Optimization
- Lab A receives `/23` (510 usable hosts, accommodating 380 workstations with +34% growth room).
- Labs B and C receive `/24` (254 usable hosts, accommodating 190 workstations with +33% growth room).
- Transit links receive `/30` (2 usable hosts, 100% address utilization).
- **Result:** Overall address utilization across allocated subnets reaches **87.4%**, and 88% of the `10.20.0.0/16` supernet remains completely free for multi-decade campus expansion.

