# Network Protocol Reference & Implementation Standards

## 1. OSPFv2 Dynamic Routing (RFC 2328)

Open Shortest Path First Version 2 is the Interior Gateway Protocol (IGP) implemented across the campus core and distribution backbone.

### Configuration Parameters
- **Area Architecture:** Single Backbone Area (`0.0.0.0`).
- **Router IDs:**
  - `R-CORE-1`: `1.1.1.1`
  - `R-CORE-2`: `1.1.1.2`
  - `DSW-1`: `2.2.2.1`
  - `DSW-2`: `2.2.2.2`
- **Metric Formulation:**
  $$\text{Cost} = \frac{\text{Reference Bandwidth}}{\text{Interface Bandwidth}}$$
  Reference bandwidth is set to $100\text{ Gbps}$ (`auto-cost reference-bandwidth 100000`) so that 10G and 1G links have distinct cost values.
- **Timers:**
  - Hello Interval: 10 seconds (P2P / Broadcast)
  - Dead Interval: 40 seconds
- **Designated Router Election:** On point-to-point transit links (`/30`), network type is configured as `point-to-point` to bypass DR/BDR election and accelerate adjacency formation.

---

## 2. First-Hop Gateway Redundancy: VRRP vs HSRP

### Linux / Kathará Implementation: VRRP (RFC 5798)
- Managed by `keepalived` daemon on `DSW-1` and `DSW-2`.
- **Multicast Group:** `224.0.0.18` (IP protocol 112).
- **Advertisement Interval:** 1 second.
- **Master Down Interval:**
  $$\text{Master Down Timer} = 3 \times \text{Advertisement Interval} + \text{Skew Time}$$
  $$\text{Skew Time} = \frac{256 - \text{Priority}}{256} \approx 0.57\text{ seconds}$$
  Failover triggers in approximately **3.57 seconds**.
- **Virtual MAC Address:** `00:00:5E:00:01:{VRID_HEX}`
  - VLAN 10 (VRID 10): `00:00:5E:00:01:0A`
  - VLAN 20 (VRID 20): `00:00:5E:00:01:14`
  - VLAN 30 (VRID 30): `00:00:5E:00:01:1E`

### Cisco Packet Tracer Implementation: HSRP (RFC 2281)
- Configured via Cisco IOS `standby <vlan> ip <vip>` and `standby <vlan> priority <prio>`.
- **Multicast Group:** `224.0.0.2` (HSRPv1 UDP port 1985) or `224.0.0.102` (HSRPv2).
- **Virtual MAC Address:** `00:00:0C:07:AC:{GROUP_HEX}`.
- Preemption enabled on `DSW-1` (`standby <vlan> preempt`) ensuring deterministic gateway restoration.

---

## 3. Rapid Spanning Tree Protocol (IEEE 802.1w / RSTP)

### Port Roles
- **Root Port (RP):** The single port on a non-root switch with the lowest path cost to the Root Bridge.
- **Designated Port (DP):** The port on a network segment that forwards BPDUs away from the Root Bridge.
- **Alternate Port (AP):** An active backup port offering an alternate path to the Root Bridge (in Discarding state).

### Port States
1. **Discarding:** Drops user frames; processes and transmits BPDUs. Prevents loops.
2. **Learning:** Populates MAC address table from incoming frames; does not forward.
3. **Forwarding:** Fully forwards and receives user data frames and BPDUs.

### Convergence Mechanism
Unlike legacy 802.1D, which required 30-50 second listening/learning timeouts, RSTP uses an explicit **Proposal / Agreement handshake** on point-to-point links to transition ports to Forwarding in **less than 1.0 second**.

---

## 4. DHCP & DHCP Relay (RFC 2131 / RFC 3046)

### Four-Way DORA Handshake
1. **Discover:** Client broadcasts `255.255.255.255` on UDP 68 -> UDP 67.
2. **Offer:** Server unicasts/broadcasts proposed IP, mask, lease, and server ID.
3. **Request:** Client formally requests the offered lease.
4. **Acknowledge (ACK):** Server confirms the lease allocation.

### Relay Agent Forwarding
When a DHCP Discover hits a Distribution switch SVI:
- The SVI replaces the Layer 2 broadcast with a unicast IP packet directed to `10.20.10.5` (`SRV-DNS-DHCP`).
- The SVI populates the `giaddr` (Gateway IP Address) field with its own interface IP (e.g. `10.20.20.2`).
- The DHCP server reads `giaddr`, identifies the corresponding subnet pool (`10.20.20.0/23`), and allocates an IP within that pool.

---

## 5. Security Access Control Lists (ACLs)

### Access Control Matrix
| Source Subnet | Destination | Protocol / Port | Action | Purpose |
| :--- | :--- | :---: | :---: | :--- |
| `10.20.20.0/23` (Lab A) | `10.20.10.210` | TCP 80, 443 | **PERMIT** | Student Exam Web Portal |
| `10.20.30.0/24` (Lab B) | `10.20.10.210` | TCP 80, 443 | **PERMIT** | Student Exam Web Portal |
| `10.20.40.0/24` (Lab C) | `10.20.10.210` | TCP 80, 443 | **PERMIT** | Student Exam Web Portal |
| `10.20.0.0/16` (All Labs) | `10.20.10.15` | TCP 5432 | **DENY** | Direct DB Access Prohibited |
| `10.20.80.0/24` (Guest) | `10.20.10.0/24` | ALL | **DENY** | Guest Isolation from Exam Fabric |
| `10.20.60.0/24` (Admin) | `10.20.10.0/24` | ALL | **PERMIT** | Full Administrative Access |
| Any | `10.20.10.5` | UDP 53 | **PERMIT** | Campus DNS Resolution |

