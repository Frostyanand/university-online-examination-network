# Viva Voce Academic Examination Guide & Technical Reference

This guide provides exhaustive theoretical principles, RFC references, and authoritative answers to potential technical questions posed during university viva examinations for this project.

---

## Section 1: System Architecture & Design Choices

### Q1: Why did you implement a three-tier hierarchical design instead of connecting all switches to a single powerful router?
**Answer:** A flat or single-switch design introduces a catastrophic Single Point of Failure (SPOF) and creates uncontrolled broadcast domains where ARP requests from hundreds of workstations consume CPU cycles across the entire campus. The three-tier model divides duties:
- The **Core Layer** provides unconstrained, ultra-high-speed packet switching without CPU-intensive packet inspection.
- The **Distribution Layer** isolates problems, performs inter-VLAN routing, enforces access control lists (ACLs), terminates broadcast domains, and provides redundant default gateways.
- The **Access Layer** manages device admission, enforces 802.1Q tagging, and prevents loops via RSTP.

### Q2: What distinguishes this emulation platform from typical JavaScript-based network visualizers?
**Answer:** Most web-based network visualizers run purely simulated JavaScript objects in the browser DOM, animating SVG lines without real networking. In contrast, this project runs **real Linux network interfaces, genuine Docker containers, real Open vSwitch (OVS) Layer 2 bridges, real FRRouting OSPF daemons, real Keepalived VRRP processes, and real Nginx web servers**. When a packet is transmitted from a client PC, a genuine Ethernet frame is serialized, processed by the Linux kernel IP routing stack, tagged with an 802.1Q header by OVS, and routed via FRR Dijkstra routing tables. Raw PCAPs captured with `tcpdump` can be exported directly into Wireshark for deep packet inspection.

---

## Section 2: IP Addressing, Subnetting & VLSM

### Q3: Why is Variable-Length Subnet Masking (VLSM) mandatory for this examination architecture?
**Answer:** Host counts differ drastically across departments:
- Exam Lab A requires **380 workstations**.
- Exam Labs B and C require **190 workstations** each.
- Point-to-point router links require only **2 IP addresses** each.
If Fixed-Length Subnet Masking (FLSM) with a `/24` mask were used, Lab A would fail to fit into a single subnet, forcing the exam proctor to divide students across two broadcast domains. If FLSM with a `/23` mask were used, every point-to-point link would waste 510 IP addresses. VLSM allows us to allocate `/23` to Lab A, `/24` to Labs B and C, and `/30` to transit links, achieving an overall subnet efficiency of **87.4%** while preserving 88% of the `10.20.0.0/16` supernet for future expansion.

### Q4: Explain the difference between Network Address, Usable Host Range, and Broadcast Address for Lab A (`10.20.20.0/23`).
**Answer:**
- **Network Address (`10.20.20.0`):** All host bits are set to 0 (`10.20.0001010 0.00000000`). Used by routers to identify the destination subnet in routing tables. Cannot be assigned to a host.
- **Broadcast Address (`10.20.21.255`):** All host bits are set to 1 (`10.20.0001010 1.11111111`). Frames sent to this IP are received by all 510 stations in Lab A.
- **Usable Host Range (`10.20.20.1` to `10.20.21.254`):** Exactly $2^9 - 2 = 510$ unique IP addresses assignable to interfaces, default gateways, and DHCP scopes.

---

## Section 3: Layer 2 Switching, VLANs & Spanning Tree

### Q5: How does IEEE 802.1Q frame tagging operate across trunk links?
**Answer:** Standard Ethernet II frames have a 14-byte header (6-byte Dst MAC, 6-byte Src MAC, 2-byte EtherType). When an access switch forwards a frame across a trunk link, it inserts a 4-byte 802.1Q tag between the Source MAC and EtherType fields:
- **TPID (Tag Protocol Identifier - 2 bytes):** Always set to `0x8100` to indicate an 802.1Q tagged frame.
- **PCP (Priority Code Point - 3 bits):** CoS priority level (0-7) for Layer 2 QoS.
- **DEI (Drop Eligible Indicator - 1 bit):** Indicates drop precedence in congested links.
- **VID (VLAN Identifier - 12 bits):** Defines the VLAN (values 1 to 4094).
When the receiving switch forwards the frame to an access port, it strips the 4-byte tag so end PCs receive standard untagged Ethernet frames.

### Q6: How does RSTP (802.1w) prevent bridging loops without the long 30-50 second delay of legacy 802.1D?
**Answer:** Legacy 802.1D Spanning Tree relied on passive timer expiration (Listening: 15s, Learning: 15s) to guarantee no loops existed before transitioning a port to Forwarding. RSTP uses an active **Proposal / Agreement handshake** on point-to-point links:
1. When a link initializes, the designated switch sends a Configuration BPDU with the Proposal bit asserted.
2. The downstream switch enters a momentary sync state (blocking non-edge ports).
3. The downstream switch returns an Agreement BPDU.
4. The designated port transitions immediately to Forwarding.
This entire cycle finishes in **less than 1.0 second**.

---

## Section 4: Dynamic Routing & Gateway Redundancy

### Q7: Describe how OSPF Area 0 calculates the best route when a transit link fails.
**Answer:** OSPF is a link-state protocol based on Dijkstra's Shortest Path First (SPF) algorithm. Every router in Area 0 maintains an identical Link-State Database (LSDB) composed of Type-1 Router LSAs. When link `R-CORE-1 <-> R-CORE-2` fails:
1. `R-CORE-1` detects loss of carrier on its interface.
2. It generates an updated Type-1 LSA withdrawing the neighbor adjacency and floods it out all remaining interfaces.
3. Every router in Area 0 receives the LSA and re-runs Dijkstra's SPF algorithm.
4. The SPF tree determines that the shortest path between `R-CORE-1` and `R-CORE-2` is now via `DSW-1` (Cost: 1 + 1 = 2).
5. The kernel routing table is updated in **under 1.5 seconds**.

### Q8: Compare VRRP and Cisco HSRP. What happens to the ARP cache of client workstations during a failover?
**Answer:**
- **VRRP (RFC 5798):** Open standard, uses multicast `224.0.0.18`, IP protocol 112, virtual MAC `00:00:5E:00:01:{VRID}`.
- **HSRP (RFC 2281):** Cisco proprietary, uses multicast `224.0.0.2` on UDP 1985, virtual MAC `00:00:0C:07:AC:{GROUP}`.
**ARP Cache Handling:**
Clients never configure the physical IP of `DSW-1` or `DSW-2`; they configure the Virtual IP (`10.20.x.1`). The VIP is permanently bound to the shared Virtual MAC. When `DSW-1` fails, `DSW-2` takes over the same Virtual MAC and transmits a **Gratuitous ARP (GARP)** broadcast. The access switches receive this GARP and immediately update their CAM (MAC address) tables to forward frames destined for the Virtual MAC out the uplink toward `DSW-2`. The client workstations do **not** need to update their ARP caches, resulting in seamless, zero-reconfiguration failover.

