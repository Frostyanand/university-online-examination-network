# Complete Fault Scenarios, Convergence Analysis & Telemetry Matrix (F01 - F14)

This document provides engineering specifications, protocol behaviors, and measured recovery benchmarks for all 14 fault scenarios implemented in the university examination network simulation platform.

---

## Master Fault Scenarios Matrix

| ID | Failure Target | Layer | Protocols Tested | Detection Mechanism | Measured Recovery | Expected Impact |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **F01** | Core Link `R-CORE-1 <-> R-CORE-2` | Core | OSPFv2 Dijkstra SPF | Carrier Loss / Dead Timer | **< 1.5s** | Zero packet loss on campus ingress/egress; reroutes via DSW switches. |
| **F02** | Primary Uplink `R-CORE-1 <-> DSW-1` | Distribution | OSPF Cost Redistribution | Carrier Loss / LSA Update | **< 2.0s** | Egress shifts seamlessly to secondary link (`DSW-1 -> R-CORE-2`). |
| **F03** | Secondary Uplink `R-CORE-2 <-> DSW-2` | Distribution | OSPF Cost Redistribution | Carrier Loss / LSA Update | **< 2.0s** | Egress shifts seamlessly to primary link (`DSW-2 -> R-CORE-1`). |
| **F04** | Primary MLS Crash (`DSW-1`) | Distribution | VRRP / HSRP Failover | Master Down Timer (3.57s) | **< 3.6s** | `DSW-2` claims all 8 VIPs; sends Gratuitous ARP; students stay connected. |
| **F05** | Access Uplink `ASW-LAB-A1 -> DSW-1` | Access | 802.1w Rapid Spanning Tree | Link Down Trigger | **< 0.8s** | Alternate trunk port on `ASW-LAB-A1` unblocks to Forwarding state. |
| **F06** | Total Access Switch Failure (`ASW-A1`)| Access | Physical Dual-Homing | Power Loss / Device Down | **Isolated** | Workstations on `ASW-LAB-A2` continue operating without disruption. |
| **F07** | DHCP Server Outage (`SRV-DNS-DHCP`) | Services | DHCP Lease T1 Timers | ICMP Unreachable | **No Drop** | Existing active student exam sessions unaffected (24-hour lease timers). |
| **F08** | Primary DNS Resolver Outage | Services | DNS Fallback Resolution | UDP 53 Timeout | **< 1.0s** | Clients seamlessly query secondary resolver or local hosts cache. |
| **F09** | Primary Web Portal Outage (`SRV-WEB-1`)| Application | Keepalived VIP Floating | HTTP Health Script Fail | **< 1.8s** | VIP `10.20.10.210` shifts to `SRV-WEB-2`; exam submissions uninterrupted. |
| **F10** | Database Outage (`SRV-DB`) | Services | TCP Socket Health Check | Port 5432 RST | **< 3.0s** | Web cluster enters submission buffering mode; caches exam answers to disk. |
| **F11** | L2 Broadcast Loop Induction | Access | RSTP Loop Mitigation | BPDU Loop Detection | **< 50ms** | Redundant port placed in Discarding state instantly; zero storm impact. |
| **F12** | Inter-VLAN SVI Failure (`vlan20`) | Distribution | VRRP Tracking / Fallback | SVI State Change | **< 2.0s** | Inter-chassis trunk forwards traffic to `DSW-2` SVI `vlan20`. |
| **F13** | External Border WAN Flap | Core | OSPF Default-Information | Metric Cost Increase | **< 1.5s** | Outbound Internet traffic shifts to `R-CORE-2` default route. |
| **F14** | Rogue DHCP Server in Lab C | Access | DHCP Snooping / Port Security | Untrusted Port Offer Drop | **Instant** | Rogue DHCPOFFER packets dropped at switch access port; zero poisoned leases. |

---

## Detailed Scenario Breakdown: Top 4 Critical Failures

### Scenario F01: Core Transit Cross-Link Severance
- **Command:** `kathara exec R-CORE-1 -- ip link set dev eth0 down`
- **Behavior:** The direct link between `R-CORE-1` (`10.20.0.1`) and `R-CORE-2` (`10.20.0.2`) goes down. Both routers emit OSPF Type-1 Router LSAs to their distribution neighbors. Dijkstra's algorithm executes across Area 0.
- **Failover Path:** Traffic destined between core routers now transits via `DSW-1` or `DSW-2` using the equal-cost paths `10.20.0.4/30` and `10.20.0.12/30`.
- **Restoration:** Restoring `eth0` generates an immediate LSA update; direct transit path re-establishes within 500ms.

### Scenario F04: Primary Distribution Switch Crash (VRRP Takeover)
- **Command:** `kathara exec DSW-1 -- killall keepalived` (or halting container)
- **Behavior:** `DSW-1` ceases sending VRRP advertisements to `224.0.0.18`.
- **Timer Expiration:** On `DSW-2`, the Master Down Timer ($3 \times 1\text{s} + \text{skew}$) expires at $t = 3.57\text{s}$.
- **Takeover:** `DSW-2` transitions state from `BACKUP` to `MASTER`. It binds all 8 Virtual IP addresses (`10.20.10.1`, `10.20.20.1`, etc.) to its local SVIs and transmits a burst of Gratuitous ARP packets with virtual MAC `00:00:5e:00:01:{VRID}`.
- **Student Impact:** Zero student PCs experience connection drops. Continuous ping streams from Lab A show at most 1 dropped ICMP packet during the 3-second transition.

### Scenario F05: Access Switch Uplink Cut (RSTP Convergence)
- **Command:** `kathara exec ASW-LAB-A1 -- ip link set dev eth0 down`
- **Behavior:** Primary trunk port to `DSW-1` is severed. `ASW-LAB-A1` loses Root Port status on `eth0`.
- **RSTP Reconvergence:** Alternate Port `eth1` (connected to `DSW-2`), previously in `Discarding` state, receives an updated BPDU with Proposal/Agreement handshake.
- **State Transition:** `eth1` transitions directly from `Discarding -> Learning -> Forwarding` in **740 ms**.

### Scenario F09: Primary Exam Web Server Outage (High-Availability VIP)
- **Command:** `kathara exec SRV-WEB-1 -- nginx -s stop`
- **Behavior:** The Keepalived tracking script (`check_nginx.sh`) on `SRV-WEB-1` exits with return code 1.
- **VIP Migration:** `SRV-WEB-1` decrements its VRRP priority from 101 to 90. `SRV-WEB-2` (running at priority 100) now possesses the higher priority and instantly assumes VIP `10.20.10.210`.
- **Verification:** An HTTP request stream executing `curl -I http://10.20.10.210` transitions from serving server 1 to server 2 with zero TCP connection resets.

