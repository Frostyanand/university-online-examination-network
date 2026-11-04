# University Online Examination System — Network Design Specification

**Document status:** Design baseline v1.0  
**Purpose:** Shared, authoritative design for two separate deliverables: (1) Cisco Packet Tracer network project and (2) an independently running, code-built web network simulator.  
**Design principle:** The two implementations reproduce the same logical network and test cases. They do not control, depend on, or exchange runtime state with one another.

---

## 1. Project interpretation and scope

This project is a **university network infrastructure design for an online examination system**. It is not primarily an online examination web application.

The network must provide connectivity for student examination labs, examination servers, faculty/invigilators, administrators and network-management systems. The design must demonstrate normal operation, packet movement, addressing, subnetting, routing, redundancy, failure handling, future expansion and limitations.

### 1.1 Two separate deliverables

#### Deliverable A — Cisco Packet Tracer

- A standalone `.pkt` topology built with Cisco routers, multilayer switches, access switches, servers and PCs.
- Actual device CLI configuration, VLANs, trunks, inter-VLAN routing, HSRP, OSPF, STP/RSTP, DHCP, DNS, ACLs and routing tests to the extent supported by the selected Packet Tracer device models.
- Simulation Mode demonstrations showing actual Packet Tracer PDUs and protocol events.
- CLI evidence: interface status, VLANs, trunks, spanning tree, HSRP, OSPF neighbours, routing tables, ARP, MAC tables, ping and traceroute.
- Packet Tracer remains independent. The Next.js application must not claim to control Packet Tracer or to read live Packet Tracer events.

#### Deliverable B — Next.js network demonstrator

- A standalone web application that independently runs the same logical network design.
- The UI is not the network simulator. It is a control and visualization layer over a real network-emulation backend.
- Use Kathará with Docker-backed Linux containers, Open vSwitch, FRRouting and Keepalived. This gives the simulation real Linux network interfaces, actual IP forwarding, actual ARP/DHCP/DNS/TCP/UDP/ICMP traffic, routing daemons, packet captures and controllable failures.
- A Python FastAPI service manages the emulator, invokes commands on simulated devices, triggers faults, runs connectivity tests and collects packet captures.
- Next.js displays the resulting topology, device state, command output, real test results and packet-capture events.
- Packet animations must be derived from real packet captures and observed interface events. No prewritten packet paths, fabricated ping results, hardcoded failover claims or fake counters.

### 1.2 Shared source of truth

Maintain one machine-readable `network-spec.yaml` (or JSON) as the authoritative logical design. It must define:

- Device IDs, types, roles and display names.
- Interfaces and interface-to-link mappings.
- VLAN IDs and names.
- Subnets, masks, gateway VIPs, device IPs and DHCP ranges.
- Routing relationships and OSPF areas.
- Redundant paths and intended active/standby roles.
- Server roles and service addresses.
- Fault scenarios and expected outcomes.
- Planned host counts and expansion reservations.

The Packet Tracer implementation and the Kathará implementation are separate, but both must be validated against this specification. Generate or document device configurations from the specification wherever practical. Never maintain a different IP plan in the web UI, simulator files and report.

---

## 2. Baseline requirements and explicit assumptions

The user has not supplied an official lab count or machine count yet. Use this documented baseline unless the course rubric or professor gives different numbers:

- 3 examination labs.
- 40 student computers per lab: 120 planned student computers total.
- 15 administration endpoints.
- 12 faculty/invigilator endpoints.
- 12 network-management endpoints.
- Up to 20 guest endpoints in an isolated guest segment.
- Examination servers and network services hosted in a dedicated server VLAN.
- IPv4 private addressing, CIDR and VLSM.
- Two distribution/multilayer switches, two edge routers and redundant access uplinks.
- A simulated external test network, so internal examination traffic and off-campus traffic can be demonstrated separately.

The 40 computers per lab are the **design capacity**, not a claim that every endpoint must be drawn individually in Packet Tracer. Packet Tracer should contain representative student PCs in every VLAN. The web emulator should provide a lightweight demo profile and, where host resources permit, an optional full-scale endpoint/load profile. The UI and report must clearly distinguish planned capacity, instantiated simulation endpoints and generated traffic flows.

---

## 3. High-level architecture

Use a hierarchical campus LAN design with redundant distribution and routed edge paths.

```text
                    SIMULATED EXTERNAL NETWORK
                   198.51.100.0/24 (TEST-NET-2)
                              |
                       ISP ROUTER (ISP1)
                         /          \
                    WAN /30        WAN /30
                       /              \
                  EDGE-R1            EDGE-R2
                    /  \              /  \
                   /    \            /    \
              DSW1 -------------------- DSW2
                |  \                    /  |
                |   \                  /   |
                |    REDUNDANT L2 FABRIC   |
                |      (RSTP/STP)          |
          -------+--------------------------+-------
          |              |                |
       ACCESS          ACCESS           ACCESS
       SWITCHES        SWITCHES         SWITCHES
       LAB-A pair      LAB-B pair       LAB-C pair
          |              |                |
       Student         Student          Student
       endpoints       endpoints        endpoints

       Additional access segments: SERVER VLAN, ADMIN VLAN,
       FACULTY VLAN and NETWORK-MANAGEMENT VLAN.
```

### 3.1 Device roles

| Device ID | Count | Role |
|---|---:|---|
| EDGE-R1, EDGE-R2 | 2 | Redundant campus edge routers; OSPF internally; default route toward ISP |
| DSW1, DSW2 | 2 | Multilayer distribution switches; VLAN gateways; HSRP; inter-VLAN routing; OSPF uplinks |
| ASW-LA-1, ASW-LA-2 | 2 | Lab A access switches; distribute the lab's planned 40 systems |
| ASW-LB-1, ASW-LB-2 | 2 | Lab B access switches |
| ASW-LC-1, ASW-LC-2 | 2 | Lab C access switches |
| ASW-SRV-1, ASW-SRV-2 | 2 | Redundant server access segment |
| ASW-ADM-1, ASW-ADM-2 | 2 | Administration/faculty/management access segment |
| ISP1 | 1 | Simulated upstream router; connects to the external test network |
| EXAM-WEB-1, EXAM-WEB-2 | 2 | Primary and standby examination web service nodes |
| DHCP-DNS-1, DHCP-DNS-2 | 2 | Redundant DHCP/DNS service nodes with non-overlapping DHCP pools |
| TEST-SERVER | 1 | External test host at 198.51.100.10/24 |
| Student/Admin/Faculty PCs | Representative | Test endpoints; the subnet plan supports the full planned host count |

For a visually manageable Packet Tracer file, use representative PCs on each lab/access-switch pair rather than placing all 120 student PCs. The address plan and host-capacity calculation must still account for all 120 planned systems.

---

## 4. VLAN and IPv4 addressing plan

### 4.1 Parent address block

- University campus client/server allocation block: `10.20.10.0/23`
- Subnet mask: `255.255.254.0`
- Range covered: `10.20.10.0` through `10.20.11.255`
- Addressing model: private IPv4 with CIDR/classless subnetting and VLSM.
- Historically, addresses in `10.0.0.0/8` belong to the old Class A range. Modern allocation here is classless because the prefix length is explicitly specified and subnet sizes vary.
- Reserve `10.20.12.0/22` for future university growth.
- Use `10.20.255.0/24` for point-to-point infrastructure/transit links.

### 4.2 VLAN subnet table

All network, first-host, last-host and broadcast values below are IPv4 values. `Gateway VIP` is the default gateway presented to endpoints. In Packet Tracer this is an HSRP virtual IP; in the Linux/Kathará simulator it is a VRRP virtual IP. The physical SVI/interface addresses are listed separately.

| VLAN | Name | Subnet / CIDR | Mask | Network address | First usable | Last usable | Broadcast | Gateway VIP | DSW1 SVI | DSW2 SVI | Planned endpoint capacity |
|---:|---|---|---|---|---|---|---|---|---|---|---:|
| 10 | LAB-A | `10.20.10.0/26` | `255.255.255.192` | `10.20.10.0` | `10.20.10.1` | `10.20.10.62` | `10.20.10.63` | `10.20.10.1` | `10.20.10.2` | 40 students; 59 possible client addresses after 3 gateway addresses |
| 20 | LAB-B | `10.20.10.64/26` | `255.255.255.192` | `10.20.10.64` | `10.20.10.65` | `10.20.10.126` | `10.20.10.127` | `10.20.10.65` | `10.20.10.66` | 40 students; 59 possible client addresses after 3 gateway addresses |
| 30 | LAB-C | `10.20.10.128/26` | `255.255.255.192` | `10.20.10.128` | `10.20.10.129` | `10.20.10.190` | `10.20.10.191` | `10.20.10.129` | `10.20.10.130` | 40 students; 59 possible client addresses after 3 gateway addresses |
| 40 | SERVERS | `10.20.10.192/27` | `255.255.255.224` | `10.20.10.192` | `10.20.10.193` | `10.20.10.222` | `10.20.10.223` | `10.20.10.193` | `10.20.10.194` | 12 planned service endpoints; 27 possible endpoints after gateway addresses |
| 50 | ADMIN | `10.20.10.224/27` | `255.255.255.224` | `10.20.10.224` | `10.20.10.225` | `10.20.10.254` | `10.20.10.255` | `10.20.10.225` | `10.20.10.226` | 15 planned endpoints; 27 possible after gateway addresses |
| 60 | FACULTY | `10.20.11.0/27` | `255.255.255.224` | `10.20.11.0` | `10.20.11.1` | `10.20.11.30` | `10.20.11.31` | `10.20.11.1` | `10.20.11.2` | 12 planned endpoints; 27 possible after gateway addresses |
| 70 | NET-MGMT | `10.20.11.32/27` | `255.255.255.224` | `10.20.11.32` | `10.20.11.33` | `10.20.11.62` | `10.20.11.63` | `10.20.11.33` | `10.20.11.34` | 12 planned management endpoints; 27 possible after gateway addresses |
| 80 | GUEST | `10.20.11.64/27` | `255.255.255.224` | `10.20.11.64` | `10.20.11.65` | `10.20.11.94` | `10.20.11.95` | `10.20.11.65` | `10.20.11.66` | Up to 20 guest endpoints; isolated from internal networks |

**DSW2 SVI addressing:** use the third address in each subnet: VLAN 10 `.3`, VLAN 20 `.67`, VLAN 30 `.131`, VLAN 40 `.195`, VLAN 50 `.227`, VLAN 60 `.3`, VLAN 70 `.35`, VLAN 80 `.67`.

### 4.3 DHCP pools

Use static addresses for infrastructure, switches, routers, servers and management interfaces. Student/admin/faculty/guest clients use DHCP.

| VLAN | DHCP server pool A | DHCP server pool B | Baseline planned use |
|---:|---|---|---:|
| 10 | `10.20.10.10–10.20.10.34` | `10.20.10.35–10.20.10.59` | 40 student leases |
| 20 | `10.20.10.74–10.20.10.98` | `10.20.10.99–10.20.10.123` | 40 student leases |
| 30 | `10.20.10.138–10.20.10.162` | `10.20.10.163–10.20.10.187` | 40 student leases |
| 50 | `10.20.10.230–10.20.10.239` | `10.20.10.240–10.20.10.249` | 15 admin leases |
| 60 | `10.20.11.10–10.20.11.19` | `10.20.11.20–10.20.11.29` | 12 faculty leases |
| 80 | `10.20.11.70–10.20.11.79` | `10.20.11.80–10.20.11.89` | Up to 20 guest leases |

The two DHCP servers use **non-overlapping scopes** for each VLAN. Both are configured as relay destinations on the Layer 3 gateways. This means new clients can still obtain a lease if one DHCP server is down. Existing leases normally remain usable until expiry; if both DHCP services fail, new DHCP assignments fail even though statically addressed infrastructure and unexpired clients may continue working.

VLAN 40 servers and VLAN 70 management devices use static addressing. Do not accidentally assign DHCP pools over infrastructure addresses.

### 4.4 Server addresses

| Device/service | Address | Notes |
|---|---|---|
| DSW1 VLAN 40 SVI | `10.20.10.194/27` | Physical gateway interface |
| DSW2 VLAN 40 SVI | `10.20.10.195/27` | Physical gateway interface |
| EXAM-WEB-1 | `10.20.10.200/27` | Primary web service node |
| EXAM-WEB-2 | `10.20.10.201/27` | Standby web service node; same test content |
| DHCP-DNS-1 | `10.20.10.202/27` | DHCP scope A and DNS |
| DHCP-DNS-2 | `10.20.10.203/27` | DHCP scope B and secondary DNS |
| NET-MON | `10.20.10.204/27` | Optional monitoring/log collector |
| EXAM service VIP | `10.20.10.210/27` | Kathará implementation: Keepalived VRRP floating service address |

For the web emulator, `exam.university.test` resolves to `10.20.10.210`. EXAM-WEB-1 owns the service VIP under normal conditions. When it fails, Keepalived transfers the VIP to EXAM-WEB-2. Both nodes serve the same stateless demonstration page/API response. This demonstrates network/service reachability failover, **not** replicated production examination transactions or database consistency.

For Packet Tracer, configure both web servers with their own static addresses and identical HTTP content. Demonstrate the primary and the manually selected backup server. Do not claim automatic application VIP failover in Packet Tracer unless it has actually been implemented and verified there. HSRP protects the gateway, not the web application process.

### 4.5 Device management addresses

Use VLAN 70 (`10.20.11.32/27`) for management. Suggested static allocations:

- Gateway VIP: `10.20.11.33`
- DSW1: `10.20.11.34`
- DSW2: `10.20.11.35`
- Access switches: `10.20.11.40–10.20.11.49`
- EDGE-R1 management/loopback: reserve `10.20.11.50`
- EDGE-R2 management/loopback: reserve `10.20.11.51`
- Remaining addresses: future infrastructure and monitoring.

If the chosen Packet Tracer model cannot assign a management SVI or loopback exactly as planned, document the adjusted address but keep it within the management subnet and update the single source of truth.

---

## 5. FLSM, VLSM, classful and classless addressing

### 5.1 Why VLSM is selected

The three student labs need larger subnets because each is planned for 40 student systems. Server, administration, faculty, management and guest networks need fewer host addresses. VLSM therefore assigns:

- `/26` to each lab: 64 total addresses, 62 usable.
- `/27` to each smaller segment: 32 total addresses, 30 usable.

Three `/26` subnets and five `/27` subnets consume 352 addresses inside the `/23` parent block and provide 336 usable addresses in total before reserving the gateway/device addresses.

### 5.2 FLSM comparison

If all eight VLANs were assigned equal `/26` subnets from the same `/23` block, FLSM would provide eight subnets of 62 usable addresses each, or 496 usable addresses. The five smaller segments would each receive 32 more usable addresses than a `/27` needs. VLSM saves 160 usable-address slots across those five smaller networks while preserving the `/26` capacity for the three labs.

The application must calculate this comparison from subnet arithmetic rather than display a fixed explanatory number.

### 5.3 Classful versus classless explanation

The educational reference panel must explain:

- Class A historical first-octet range: 1–126, default mask `/8`.
- Class B historical first-octet range: 128–191, default mask `/16`.
- Class C historical first-octet range: 192–223, default mask `/24`.
- Class D: 224–239, multicast.
- Class E: 240–255, reserved/experimental range.
- `127.0.0.0/8` is loopback and `0.0.0.0` has special meanings; do not treat them as normal assignable host ranges.
- `10.0.0.0/8` is private IPv4 space and was historically Class A.
- This project uses CIDR prefixes (`/23`, `/26`, `/27`, `/30`) and variable-sized subnets, so it is a classless design.
- **Classful/classless** describes addressing/routing conventions; **FLSM/VLSM** describes whether subnets are the same size or variable size. They are related topics but are not synonyms.

---

## 6. Point-to-point transit addressing and external test network

Use `/30` networks for point-to-point routed links because they provide two usable IPv4 addresses and are straightforward to configure in Packet Tracer.

| Link | Subnet | Side A | Side B | Network | Broadcast |
|---|---|---|---|---|---|
| DSW1–EDGE-R1 | `10.20.255.8/30` | DSW1 `10.20.255.9` | EDGE-R1 `10.20.255.10` | `.8` | `.11` |
| DSW1–EDGE-R2 | `10.20.255.12/30` | DSW1 `10.20.255.13` | EDGE-R2 `10.20.255.14` | `.12` | `.15` |
| DSW2–EDGE-R1 | `10.20.255.16/30` | DSW2 `10.20.255.17` | EDGE-R1 `10.20.255.18` | `.16` | `.19` |
| DSW2–EDGE-R2 | `10.20.255.20/30` | DSW2 `10.20.255.21` | EDGE-R2 `10.20.255.22` | `.20` | `.23` |
| EDGE-R1–ISP1 | `10.20.255.0/30` | EDGE-R1 `10.20.255.1` | ISP1 `10.20.255.2` | `.0` | `.3` |
| EDGE-R2–ISP1 | `10.20.255.4/30` | EDGE-R2 `10.20.255.5` | ISP1 `10.20.255.6` | `.4` | `.7` |

External test segment:

- Network: `198.51.100.0/24` (TEST-NET-2 documentation range; isolated simulation only, not a real public Internet address).
- ISP1 external interface: `198.51.100.1/24`.
- TEST-SERVER: `198.51.100.10/24`, default gateway `198.51.100.1`.

Both EDGE routers have a path to ISP1. They install a default route toward ISP1 and advertise the default route into OSPF only while their upstream path is valid. This permits the campus to retain external test connectivity if one EDGE router fails. ISP1 is deliberately a single upstream point in this baseline: if ISP1 itself fails, off-campus/test-network connectivity is lost, but the internal examination portal remains accessible because it is inside the campus server VLAN. This limitation must be demonstrated and documented.

---

## 7. Layer 2 and Layer 3 design

### 7.1 VLAN segmentation

Create the VLANs consistently on all required switches:

- VLAN 10 — LAB-A
- VLAN 20 — LAB-B
- VLAN 30 — LAB-C
- VLAN 40 — SERVERS
- VLAN 50 — ADMIN
- VLAN 60 — FACULTY
- VLAN 70 — NET-MGMT
- VLAN 80 — GUEST

Student, server, admin, faculty, management and guest traffic must be separated at Layer 2. Inter-VLAN communication is routed through DSW1/DSW2 and controlled with ACLs.

### 7.2 Trunks and access ports

- Student PCs and servers connect to access ports in the relevant VLAN.
- Uplinks between access switches and DSW1/DSW2 are 802.1Q trunks carrying only required VLANs.
- The DSW1–DSW2 inter-switch connection is a trunk carrying the campus VLANs.
- Use Rapid-PVST+/RSTP where supported; DSW1 is root primary for VLANs 10, 30, 50 and 70. DSW2 is root primary for VLANs 20, 40, 60 and 80. The other switch is configured as secondary.
- Align HSRP active roles with spanning-tree root roles to avoid unnecessary Layer 2/Layer 3 path asymmetry.
- If the selected Packet Tracer switch model or software does not support the exact command, use the closest supported STP/RSTP configuration and record the deviation.

### 7.3 First-hop gateway redundancy

- Packet Tracer: use HSRP on DSW1/DSW2 SVIs. HSRP is the Cisco first-hop redundancy mechanism available for this Packet Tracer design; VRRP is not assumed to be available in Packet Tracer.
- Kathará: use Keepalived VRRP on the corresponding Linux VLAN interfaces. VRRP and HSRP provide equivalent first-hop gateway redundancy roles, but they are different protocols. The UI/report must label which protocol is actually running in each implementation.
- DSW1 active for VLANs 10, 30, 50 and 70.
- DSW2 active for VLANs 20, 40, 60 and 80.
- Use higher active priority, lower standby priority and preemption. Track relevant uplinks where supported so a switch does not remain active after losing its useful upstream path.

### 7.4 Dynamic routing

- Use single-area OSPF, Area 0, between DSW1/DSW2 and EDGE-R1/EDGE-R2 over the `/30` routed links.
- Use point-to-point OSPF network type on the routed links where supported.
- OSPF must learn campus prefixes and provide alternate paths when one edge router or one routed uplink fails.
- EDGE-R1 and EDGE-R2 use a default route toward ISP1 and advertise a default into OSPF only when the upstream path is valid.
- Verify with OSPF neighbour state and routing tables, not just a green topology line.

### 7.5 ACL policy

Minimum policy:

- Student VLANs may access the examination service VIP on required application ports (HTTPS/443; HTTP/80 only if used for a controlled demo/redirect) and approved DNS/DHCP services.
- Student VLANs must not directly access network-management interfaces.
- Guest VLAN must not access internal student, server, administration, faculty or management subnets. It may use approved DNS and the simulated external network only.
- Faculty/invigilator VLAN may access the examination service and explicitly approved administrative services.
- Admin VLAN may access authorized management and examination services.
- Network-management VLAN may access device-management services such as SSH/monitoring; it should not be exposed to student/guest segments.

The same policy must be reflected in Packet Tracer ACLs and the Kathará Linux/OVS firewall rules. Show at least one allowed and one deliberately denied flow.

---

## 8. Protocols and what each demonstration proves

| Protocol/technology | Role in the project | Observable proof |
|---|---|---|
| Ethernet / IEEE 802.3 | Local frame delivery | Source/destination MAC and interface in packet capture |
| 802.1Q | VLAN tagging on trunk links | VLAN ID/tag on trunk packet or switch trunk state |
| ARP | IPv4-to-MAC resolution on local link | ARP request/reply; ARP/neighbor table |
| DHCP | Dynamic host configuration | Discover, Offer, Request, ACK (DORA), assigned address, gateway and DNS |
| DNS | Resolve `exam.university.test` | DNS query and response; resolved VIP |
| IPv4 | Logical addressing and routing | Source/destination, mask, TTL and route lookup |
| ICMP | Reachability and diagnostics | Ping echo request/reply; TTL exceeded if applicable |
| TCP | Reliable transport | SYN, SYN-ACK, ACK, sequence/acknowledgement and retransmission evidence under loss |
| HTTPS/HTTP | Examination portal request | Actual client request and server response |
| OSPF | Dynamic routing and alternate L3 paths | Neighbour state, learned routes and route change after fault |
| HSRP / VRRP | First-hop gateway redundancy | Active/standby state and gateway VIP ownership before/after fault |
| STP / RSTP | Prevent Layer 2 loops and unblock redundant paths | Root bridge, port roles/states and transition after link failure |
| ACL | Traffic policy | Allowed flow succeeds; denied flow is dropped and logged/counted where supported |
| `tc netem` | Real Linux link impairment | Actual delay/loss introduced on an interface; measured effects in packet capture |

Do not claim every protocol is implemented in both tools unless it has been tested in both. Packet Tracer models a supported subset of Cisco behaviour; Kathará runs real software stacks in containers. The report must separate what each simulator models and what is actually executed.

---

## 9. Web simulator implementation architecture

### 9.1 Components

```text
Next.js frontend
  - topology view
  - IP/subnet workbench
  - packet journey/event inspector
  - device/CLI inspector
  - fault injection controls
  - test center
  - scalability planner
  - report and viva reference
          |
          | HTTP + WebSocket/SSE for live status/events
          v
Python FastAPI simulation controller
  - validates requests against network-spec.yaml
  - starts/stops/restarts the Kathará lab
  - runs allowlisted commands inside selected devices
  - injects/restores link/node faults
  - runs ping/traceroute/DNS/HTTP tests
  - starts/stops packet captures
  - parses PCAP files and device command outputs
  - records actual result evidence
          |
          v
Kathará + Docker engine
  - OVS switch containers
  - FRRouting gateway/edge containers
  - Keepalived VRRP
  - DHCP/DNS containers
  - web service primary/standby containers
  - client endpoint containers
  - external test server
```

The application should use Next.js for the frontend and application routes only. Network orchestration and PCAP parsing belong in the Python service because Kathará has Python APIs and packet-analysis libraries are available in Python. Do not try to implement the real network stack in browser JavaScript.

### 9.2 Emulator roles

- **Switching:** Open vSwitch containers with VLAN-aware access/trunk ports and RSTP.
- **Layer 3 gateways/distribution:** Linux containers with IP forwarding, FRRouting for OSPF, and Keepalived for VRRP gateway VIPs. Where practical, combine OVS and routing services in purpose-built distribution-node images.
- **Edge routers:** FRRouting containers using OSPF and default routes to ISP1.
- **DHCP/DNS:** Two service containers with matching DNS records and non-overlapping DHCP scopes. Use DHCP relay from the VLAN gateways.
- **Web service:** Two Nginx/application containers serving identical test content; Keepalived floats `10.20.10.210` between them.
- **Clients:** Lightweight Linux endpoint containers with DHCP clients, `ping`, `traceroute`, `curl`, `dig/nslookup` and packet-capture utilities as needed.
- **External target:** A server on `198.51.100.10/24` behind ISP1.

The precise Kathará image names and package versions must be checked and pinned by the implementation. Build custom images where the built-in image does not contain the required OVS/FRR/Keepalived/DHCP tools. Do not assume that an arbitrary image supports a command without checking it.

### 9.3 Real packet evidence

- Start `tcpdump` capture on relevant client, server, gateway and/or link interfaces before a test.
- Execute actual traffic inside the simulated network: DHCP request, DNS query, ping, traceroute, `curl`/HTTPS request and (for loss) a TCP transfer/iperf test.
- Save captures as PCAP files.
- Parse PCAPs with Scapy or a verified Wireshark/tshark integration.
- Build packet event records from observed frames: capture time, source/destination MAC, source/destination IP, protocol, ports, TTL, TCP flags, sequence/ack numbers, ICMP type/code, DHCP/DNS fields and capture interface.
- Merge records by timestamp, identify duplicates caused by multi-interface capture, and preserve the source PCAP reference for inspection.
- The UI's packet animation is a presentation of these observed capture records. If capture is unavailable, show an explicit “no capture available” state; never fabricate events.

### 9.4 Actual fault operations

The simulation backend must perform real actions on the emulator, not simply toggle a frontend status flag:

- Router/node failure: stop or terminate the selected Kathará device/container.
- Link failure: bring the corresponding simulated interface down or disable the virtual link.
- Packet loss/delay: apply Linux `tc netem` to the correct egress interface. Apply at both ends when symmetric impairment is intended.
- Server failure: stop the primary web node and observe Keepalived VIP transition to the standby.
- DHCP service failure: stop one DHCP/DNS node and request a new lease from a client; the second non-overlapping pool should still work.
- ACL test: apply the configured rule and run an actual allowed/denied connectivity test.
- Restore: reverse every injected change and verify the original network state.

Each action must record its start/end time, target device/interface, command or API operation, success/failure result and post-fault verification.

### 9.5 Security and safety

- Bind the local control API to localhost by default.
- Only allow pre-defined device IDs, command templates and fault actions from the UI.
- Never expose arbitrary shell execution to an unauthenticated browser input.
- Validate node names, interface names, IPs, VLAN IDs and scenario parameters against the network specification.
- Run only the project lab; do not modify the host's real network interfaces or apply `tc` to physical host networking.
- Provide a prominent **Restore baseline** action and a backend cleanup routine.

---

## 10. Required Next.js application pages and behaviour

### 10.1 Operations overview

- Interactive topology diagram based on `network-spec.yaml` and live Kathará/OS state.
- Devices, interfaces, VLANs, links, gateway roles and route paths.
- Real live states: running/stopped, interface up/down, HSRP/VRRP active/backup, OSPF neighbour up/down, RSTP port state.
- Clearly distinguish **planned topology**, **observed live state** and **historical test state**.

### 10.2 IP addressing and subnet workbench

- Display all subnets, network address, prefix, mask, wildcard mask, broadcast, first/last usable, total/usable host count, gateway VIP and DHCP pool.
- Explain historical IPv4 classes and classful vs classless.
- Interactive CIDR/subnet calculator that computes results for arbitrary valid IPv4 prefixes.
- FLSM vs VLSM comparison calculated from the project host requirements.
- Validate that no subnet overlaps, no DHCP pool overlaps infrastructure addresses, and gateway/device addresses are inside the subnet.
- Show remaining host capacity and reserved expansion blocks.

### 10.3 Packet journey / capture inspector

- Select source endpoint, destination service and test type.
- Run actual traffic through the Kathará network.
- Capture and inspect packets, with a filter by ARP, DHCP, DNS, ICMP, TCP, UDP, OSPF/VRRP/STP where visible.
- Provide play/pause/step through the actual captured event sequence.
- Packet detail panel: frame, MACs, VLAN tag, IPs, TTL, protocol, ports, TCP flags/sequence/ACK, payload summary and capture interface.
- Show source PC → access switch → distribution/gateway → server switch → server path based on the actual observed captures and topology.
- Show route decision and ARP/DNS resolution as protocol explanations, but label inferred explanations separately from raw captured packet facts.

### 10.4 Device and command explorer

Provide an allowlisted command palette and execute commands on the actual device. Store output with timestamp and target device. Examples:

**Cisco Packet Tracer command reference (for the separate manual Cisco build):**

```text
show ip interface brief
show vlan brief
show interfaces trunk
show spanning-tree
show standby brief
show ip route
show ip ospf neighbor
show ip protocols
show mac address-table dynamic
show arp
ping <destination-ip>
traceroute <destination-ip>
```

**Kathará/Linux/FRR command reference:**

```text
ip addr
ip route
ip neigh
ping -c 4 <destination-ip>
traceroute <destination-ip>
curl -vk https://exam.university.test/
dig exam.university.test
ss -tuna
vtysh -c 'show ip route'
vtysh -c 'show ip ospf neighbor'
vtysh -c 'show ip ospf interface'
ovs-vsctl show
ovs-ofctl show <bridge>
tcpdump -ni <interface>
tc qdisc show dev <interface>
```

Commands that modify the network must be available only through safe, predefined operations rather than arbitrary free-form terminal input.

### 10.5 Fault injection and recovery lab

Provide one-click scenario controls with:

- Target failure/action.
- Expected effect.
- Actual injected action.
- Pre-fault health tests.
- Live fault status.
- Route/gateway/port changes.
- Post-fault ping/HTTP/DNS tests.
- Measured recovery time where it can be measured from actual timestamps.
- Restore action and post-restore verification.

### 10.6 Connectivity test center

Run real tests and display raw output plus a clear result:

- Same-VLAN ping.
- Cross-VLAN ping where policy allows.
- Student-to-examination-server HTTPS request.
- Faculty-to-examination-server request.
- Guest-to-internal-server denied test.
- DNS lookup.
- DHCP lease request/renewal.
- Traceroute to internal and external test servers.
- External test reachability.
- Test matrix across selected endpoint groups.

### 10.7 Scalability planner

- Add a student endpoint to a lab and validate remaining subnet capacity.
- Add a new lab using the next reserved `/26`, assign a new VLAN ID, gateway VIP and DHCP scope, add access-switch ports/uplinks and regenerate the Kathará lab configuration.
- Explain which existing interfaces/trunks/ACLs/DHCP relays/routing definitions must change.
- Prevent overlapping subnets and duplicate IPs.
- Show planned versus deployed endpoint count.
- If a change cannot be safely applied live, generate a change plan and require a controlled lab redeploy rather than pretending it has already been deployed.

### 10.8 Viva/documentation and team contribution

Include searchable explanations and a report export for:

- Why VLANs are used.
- Why VLSM rather than FLSM.
- Classful vs classless addressing.
- How to calculate network/broadcast/host range.
- DHCP DORA.
- ARP and default gateway behaviour.
- DNS resolution.
- TCP loss/retransmission vs UDP behaviour.
- OSPF convergence.
- HSRP/VRRP gateway failover.
- STP/RSTP and loop prevention.
- What happens when each device fails.
- How to add systems/labs.
- Cable types.
- Simulator limitations.
- Per-member contribution table with names/tasks left editable; do not invent teammate contributions.

---

## 11. Fault scenarios and acceptance criteria

The following are mandatory planned tests. The implementation must report **observed results**, not just expected results.

| ID | Fault/test | Injection | Expected/required observation | Recovery/limitation |
|---|---|---|---|---|
| F01 | Baseline network | No fault | DHCP/DNS/ICMP/HTTP tests pass; OSPF neighbours up; gateway roles correct | Baseline snapshot saved |
| F02 | Primary distribution switch fails | Stop DSW1 | DSW2 takes over HSRP/VRRP VIPs; RSTP reconverges; remaining student clients reach the local exam service | Verify ping/HTTP after convergence |
| F03 | Secondary distribution switch fails | Stop DSW2 | DSW1 retains gateway/routing for surviving fabric | Verify unaffected VLANs and routes |
| F04 | One access uplink fails | Disable one access-to-distribution link | RSTP forwards through the redundant path or the other independent uplink remains usable | Capture port-state change and ping |
| F05 | One access switch fails | Stop one access switch | Clients physically attached to that switch lose connectivity; clients on its paired access switch remain online | State clearly that a single-homed client cannot survive failure of its only access switch |
| F06 | EDGE-R1 fails | Stop EDGE-R1 | OSPF adjacency drops; route to external test network uses EDGE-R2 | Internal exam portal remains available; external route verified |
| F07 | One DSW-to-edge routed link fails | Bring one `/30` interface down | OSPF uses another available routed path | Verify changed route/next hop |
| F08 | Primary exam web node fails | Stop EXAM-WEB-1 | Service VIP moves to EXAM-WEB-2; DNS name remains the same; HTTP test succeeds after failover | State that demo is stateless and does not prove transactional DB replication |
| F09 | DHCP-DNS-1 fails | Stop first service node | New client can still receive a lease from DHCP-DNS-2's non-overlapping scope; DNS secondary responds | Existing leases may continue until renewal |
| F10 | Packet loss/delay | Apply `tc netem` | Actual ping loss/latency increases; TCP flow shows retransmission or reduced goodput as observed | Remove qdisc and re-run baseline test |
| F11 | ACL denies guest access | Apply guest isolation rule | Guest cannot reach internal server/management subnet; permitted DNS/external test still works | Show ACL hit/output where available |
| F12 | Add new endpoint | Deploy one additional client on an existing lab VLAN | DHCP assigns a valid non-duplicate address; ping/DNS/HTTP work | Confirm subnet headroom |
| F13 | Add future lab | Allocate next reserved `/26` and VLAN | New lab gets unique subnet, DHCP, gateway and routed access | Validate no overlap and successful end-to-end test |
| F14 | ISP1 fails | Stop ISP1 | External test network becomes unreachable | Internal exam service remains available; this is a documented upstream single point of failure in baseline v1 |

### 11.1 Important engineering boundaries

- Two distribution switches and gateway redundancy do not make a failed access switch transparent to hosts physically connected only to that switch.
- Redundant uplinks protect against link failure; they do not automatically protect against loss of both endpoints of the access segment.
- OSPF is a Layer 3 routing protocol; STP/RSTP is a Layer 2 loop-prevention protocol; HSRP/VRRP protects the first-hop gateway. They solve different problems.
- A network path becoming available again does not guarantee that every existing TCP/application session survives unchanged.
- TCP can retransmit lost segments. UDP itself does not guarantee retransmission; an application using UDP would need its own recovery logic.
- If ISP1 fails, the internal campus examination service should still work because it is hosted locally. External services will not.
- A server VIP failover proves service reachability, not database replication, transaction durability or full production application high availability.

---

## 12. Packet Tracer implementation guidance

### 12.1 Suggested Cisco device families

Use Packet Tracer device models that expose the required features:

- EDGE-R1 / EDGE-R2 / ISP1: ISR router models such as 2911/1941 where available.
- DSW1 / DSW2: Catalyst 3560 multilayer switches (or the closest available multilayer model supporting SVI routing and HSRP).
- Access switches: Catalyst 2960.
- Servers: Server-PT.
- Endpoints: PC-PT.

Before building the full topology, test one DSW pair with one VLAN and confirm the selected model supports the required HSRP, SVI, OSPF and trunk commands. Do not assume every Cisco IOS command exists in every Packet Tracer model.

### 12.2 Cable selection

| Connection | Conventional cable |
|---|---|
| PC to access switch | Copper straight-through |
| Server to access switch | Copper straight-through |
| Access switch to distribution switch | Copper crossover (or Packet Tracer automatic connection if auto-MDI/MDIX permits) |
| Distribution switch to distribution switch | Copper crossover; use multiple links/EtherChannel only if configured and tested |
| Distribution switch to edge router | Copper straight-through |
| Edge router to ISP router over Ethernet | Copper crossover (or automatic connection if supported) |
| ISP router to external test-server access switch | Copper straight-through |

No serial WAN is required in the baseline. If a serial DCE/DTE link is later selected, add compatible serial modules, configure clocking on the DCE end and update the link/IP plan.

### 12.3 Build order

1. Place and name devices.
2. Cable the DSW pair and access layer.
3. Create VLANs and trunks.
4. Configure STP/RSTP root priorities.
5. Configure DSW SVIs and HSRP gateway VIPs.
6. Configure routed DSW-to-EDGE links and OSPF.
7. Configure EDGE default routes toward ISP and advertise default into OSPF.
8. Configure server IPs, DHCP, DNS and HTTP services.
9. Configure DHCP relay on every client SVI.
10. Configure ACLs and management restrictions.
11. Assign PC addressing by DHCP and verify IP/mask/gateway/DNS.
12. Run baseline ping, DNS, HTTP and traceroute tests.
13. Use Simulation Mode with filters for ARP, DHCP, DNS, ICMP, TCP and HTTP/HTTPS to show packet movement.
14. Run controlled failure scenarios and save screenshots/CLI evidence.

### 12.4 Essential Cisco verification commands

```text
show ip interface brief
show vlan brief
show interfaces trunk
show spanning-tree
show standby brief
show ip route
show ip ospf neighbor
show ip protocols
show mac address-table dynamic
show arp
show access-lists
ping <destination-ip>
traceroute <destination-ip>
```

On PCs use `ipconfig /all`, `ping`, `tracert`, `arp -a` and DNS lookups where supported by Packet Tracer's PC command prompt.

---

## 13. Required end-to-end demonstration sequence

The final review should follow a rehearsed story, not random clicks.

1. **State the use case:** 120 planned student systems across three examination labs, isolated server/admin/faculty/management/guest segments.
2. **Show the topology:** identify ISP, edge routers, distribution pair, access switches, server pair and redundant links.
3. **Explain the IP plan:** parent block, VLANs, VLSM, classless CIDR, network/broadcast/usable range and future reservations.
4. **Show baseline state:** all required devices up, OSPF neighbours established, correct HSRP/VRRP active/backup roles and RSTP forwarding/alternate ports.
5. **Demonstrate DHCP:** a student host receives IP, mask, gateway and DNS through DORA.
6. **Demonstrate DNS and ARP:** resolve `exam.university.test`, resolve the local gateway MAC and inspect the tables.
7. **Demonstrate the application flow:** student client opens the exam service; show packet capture/Simulation Mode from client through gateway to server and the response path.
8. **Demonstrate inter-VLAN security:** allowed student-to-exam flow succeeds; guest-to-internal management/server flow is denied.
9. **Fail one distribution switch:** show gateway takeover, port/routing changes and recovery of successful tests.
10. **Fail one edge router/link:** show OSPF neighbour loss and alternate path to the external test server.
11. **Fail the primary web service:** in Kathará show the floating service VIP move to the standby and the same DNS name continue working. In Packet Tracer show the separately configured backup server and state the simulator limitation if failover is manual.
12. **Introduce packet loss:** show actual loss/latency and TCP recovery behaviour from captured traffic; restore the link.
13. **Add a host or new lab:** show address capacity, next subnet allocation, DHCP and connectivity verification.
14. **Close with limits:** what fails, what survives, what requires production-grade hardware/application clustering, and what the simulators cannot prove.

---

## 14. Limitations to disclose honestly

### Cisco Packet Tracer

- It models a subset of Cisco hardware/software behaviour; not every command, platform feature, timing behaviour or physical link characteristic is represented.
- Its Simulation Mode is an educational PDU simulation, not a wire-speed hardware capture from real equipment.
- Packet Tracer feature availability depends on the selected simulated device/model and software version.
- Packet Tracer's HSRP support is used for gateway redundancy; do not assume VRRP/GLBP support.

### Kathará-based web emulator

- It uses actual Linux network stacks and routing daemons in containers, but it is still software emulation on one host, not physical campus hardware.
- Throughput, latency, timing, interface queues and convergence measurements are influenced by the host PC, Docker and WSL2 scheduling.
- Open vSwitch/FRR/Keepalived behaviour is not identical to a Cisco Catalyst/IOS implementation. The conceptual design is equivalent, but implementation-specific commands and protocol details differ.
- The demonstration web service is stateless unless a replicated application/database layer is deliberately added. A floating VIP alone is not database high availability.
- A single ISP1 remains an external connectivity failure domain in baseline v1.
- The simulator cannot prove physical cable faults, RF/Wi-Fi coverage, hardware ASIC performance, real ISP behaviour or production exam transaction durability.

### Scope boundary

This is a robust academic prototype of campus examination network design and fault handling. It is not a production-ready university network deployment or a complete online examination product.

---

## 15. Acceptance checklist before declaring the project complete

### Network design

- [ ] All device IDs and links match the authoritative specification.
- [ ] VLAN/subnet table has been validated for overlap and correct network/broadcast ranges.
- [ ] Every client VLAN has a valid gateway VIP and DHCP scope.
- [ ] Server and management addresses are static and outside DHCP pools.
- [ ] Expansion blocks are reserved and documented.
- [ ] DSW/edge routing, HSRP/VRRP and STP/RSTP roles are documented.

### Cisco Packet Tracer

- [ ] `.pkt` opens without missing devices or broken links.
- [ ] VLANs/trunks/SVIs/HSRP/OSPF/STP are verified with CLI output.
- [ ] DHCP/DNS/HTTP and representative inter-VLAN communication work.
- [ ] Simulation Mode packet walkthrough is rehearsed.
- [ ] At least distribution-switch, edge-router and uplink failures are demonstrated.
- [ ] Packet Tracer feature limitations are stated accurately.

### Web simulator

- [ ] Kathará lab actually starts from the project files.
- [ ] FRR OSPF neighbours and routing table are queried from running devices.
- [ ] VRRP gateway VIP ownership is read from Keepalived/runtime state.
- [ ] RSTP state is read from Open vSwitch, not inferred from a static diagram.
- [ ] DHCP/DNS/HTTP/ping/traceroute use actual simulated hosts.
- [ ] Packet timeline is parsed from real PCAP captures.
- [ ] Router/link/server/packet-loss faults alter actual emulator state.
- [ ] Recovery tests are executed after each fault.
- [ ] Every test stores observed output, timestamps and pass/fail status.
- [ ] Restore-baseline works and cleanup removes the lab safely.
- [ ] The UI clearly labels actual observations versus design explanations.

### Documentation and presentation

- [ ] Final topology diagram matches both implementations.
- [ ] IP plan, FLSM/VLSM, classful/classless and host-capacity explanation are complete.
- [ ] Packet, cable and CLI evidence is collected.
- [ ] Fault/recovery test matrix contains actual results.
- [ ] Limitations and known single points of failure are disclosed.
- [ ] Team contribution section is filled by the team with actual work performed.

---

## 16. Build strategy for Antigravity

Antigravity should be instructed to build the complete Next.js + Python + Kathará project from this specification, including:

1. A polished, responsive network operations UI.
2. `network-spec.yaml` as the single source of truth.
3. A Python FastAPI control service.
4. Kathará lab generation/start/stop/cleanup code.
5. Custom Docker images/configurations for OVS, FRR, Keepalived, DHCP/DNS, web nodes and clients as required.
6. Real commands, connectivity tests, packet captures and PCAP parsing.
7. Real failure injection and restoration.
8. A generated subnet calculator and expansion validator.
9. Automated smoke tests that prove the baseline topology and each critical scenario.
10. PowerShell setup/doctor/start/stop scripts for a Windows 11 + Docker Desktop + WSL2 environment.
11. Clear README instructions, pinned dependency versions and a diagnostic screen for missing prerequisites.

Antigravity must not substitute static sample data for any feature described as live simulation. If a requested device feature is unsupported by the chosen Kathará image or host, it must report the limitation and implement a verified alternative; it must not fake a successful state.

The project should start in a safe demo profile by default, with an optional larger endpoint/load profile. The setup scripts should perform prerequisite checks and automate every action that does not require an interactive OS installation, elevated permission or user approval.

---

## 17. Source references

- Kathará official download and platform support: https://www.kathara.org/download.html
- Kathará repository and description of Docker-backed virtual devices, FRR, Open vSwitch and Python APIs: https://github.com/KatharaFramework/Kathara
- Kathará Python API documentation: https://github.com/KatharaFramework/Kathara/wiki/Kathara-API-Docs
- Docker Desktop WSL2 backend: https://docs.docker.com/desktop/features/wsl/
- FRRouting documentation in containerlab (OSPF daemon support and FRR node configuration): https://containerlab.dev/manual/kinds/frr/
- Keepalived VRRP documentation: https://www.keepalived.org/documentation/user-guide/software-design/
- Open vSwitch VLAN/trunk documentation: https://docs.openvswitch.org/en/stable/faq/vlan/
- Open vSwitch RSTP/STP configuration reference: https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.html
- Cisco HSRP configuration guide: https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/network-services/network-services/m_fhp-hsrp-0.html
- Cisco Packet Tracer HSRP-only limitation discussion: https://community.cisco.com/t5/switching-discussions/cisco-packet-tracer-%E6%A8%A1%E6%8B%9F%E5%99%A8%E6%80%8E%E6%A0%B7%E4%BD%BF%E7%94%A8-vrrp-%E5%8A%9F%E8%83%BD/m-p/4913682/highlight/true

