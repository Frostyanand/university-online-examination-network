# Project Limitations & Future Engineering Roadmap

## 1. Overview

This document provides transparent technical disclosure regarding the operational boundaries, tool constraints, and simulation limits of both Deliverable A (Cisco Packet Tracer) and Deliverable B (Kathará / Docker Emulator).

---

## 2. Deliverable A: Cisco Packet Tracer Limitations

1. **Closed Proprietary Simulator:**
   Cisco Packet Tracer is a discrete-event educational simulation engine, not a real operating system emulator. It models Cisco IOS behavior through software abstractions rather than running real Cisco IOS binary images (like Dynamips or Cisco IOL).
2. **Limited Protocol Command Set:**
   Advanced Linux networking daemons (such as Keepalived VRRP health tracking scripts, Nginx reverse proxy load-balancing directives, or custom iptables packet mangling) cannot run inside Packet Tracer. HSRP is used to model First-Hop Redundancy instead of VRRPv3.
3. **Template Residuals in Automated PKT Generation:**
   Donor templates extracted from Packet Tracer device seeds contain residual AAA user records and default DHCP pools. Our Python builder integrates `pkt_core.audit.sanitize_template_leftovers` to scrub these 42 leftover artifacts before final binary compression.

---

## 3. Deliverable B: Kathará / Docker Network Emulator Limitations

1. **Host Resource Utilization:**
   Running 31 active Linux containers with Open vSwitch bridges, FRRouting daemons, and Nginx processes consumes approximately:
   - RAM: ~2.5 GB of system memory.
   - CPU: Minimal during steady state (< 5%), peaking to ~25% during Dijkstra SPF recalculations and full convergence benchmarking.
2. **Windows WSL2 Kernel Capabilities:**
   On Windows hosts using Docker Desktop with WSL2, containers execute under user namespaces where Docker's `privileged=True` requires specific host configuration. The simulation solves this by leveraging Kathará's fine-grained Linux capabilities (`NET_ADMIN`, `NET_RAW`, `NET_BROADCAST`, `SYS_ADMIN`) without requiring root-level Docker daemon bypasses.
3. **Software Virtual Switching vs Hardware ASICs:**
   Open vSwitch utilizes the Linux kernel flow table and user-space OpenFlow daemon. While providing full IEEE 802.1Q and RSTP compliance, forwarding throughput is bound by host kernel context switching rather than hardware ASIC line rates (10 Gbps / 40 Gbps).

---

## 4. Future Engineering Roadmap

1. **IPv6 Dual-Stack Implementation:**
   Extend all VLAN subnets and OSPFv2 instances to OSPFv3 (`IPv6 Area 0`) using global unicast prefixes (`2001:db8:acad::/48`).
2. **EVPN-VXLAN Campus Fabric:**
   Transition the campus core from routed point-to-point links to a modern Leaf-Spine data center fabric utilizing BGP EVPN and VXLAN encapsulation for distributed Layer 2 overlay extensions.
3. **RADIUS / 802.1X Port Authentication:**
   Integrate a FreeRADIUS container to enforce IEEE 802.1X Extensible Authentication Protocol (EAP-TLS) on access switch ports before granting VLAN admission to student laptops.
4. **Automated CI/CD Integration:**
   Package the validation suite (`validate_spec.py`, `validate_pkt.py`, and test runner) into a GitHub Actions workflow to verify network topology changes automatically on pull requests.

