# Project Team Contributions & Accountability Matrix

This document provides a detailed breakdown of individual student responsibilities, technical deliverables, and grading accountability for the university online examination network project.

---

## 1. Engineering Role Assignments

### Member 1: Lead Systems Architect
- **Specialization:** Core Layer Routing, Dynamic Protocols & First-Hop Redundancy
- **Primary Deliverables:**
  - Designed the dual-core triangle routing topology (`R-CORE-1`, `R-CORE-2`, `DSW-1`, `DSW-2`).
  - Configured FRRouting OSPFv2 Single-Area Backbone (Area 0.0.0.0) with custom auto-cost reference bandwidth.
  - Implemented VRRP (RFC 5798) with priority preemption on distribution multi-layer switches.
  - Authored `docs/ARCHITECTURE.md` and `docs/PROTOCOL_REFERENCE.md`.
- **Viva Focus Topics:** OSPF Dijkstra algorithm, LSA types, DR/BDR election, VRRP virtual MAC computation, and inter-router link budgets.

---

### Member 2: Layer 2 Switching & Security Specialist
- **Specialization:** Access Layer Switching, 802.1Q VLANs, Spanning Tree & ACL Policies
- **Primary Deliverables:**
  - Configured Open vSwitch (OVS 3.1.0) bridge topologies and 802.1Q trunk allowed lists across all 10 access switches.
  - Implemented Rapid Spanning Tree Protocol (IEEE 802.1w / RSTP) with deterministic Root Bridge priority.
  - Formulated Layer 3 Access Control Lists (ACLs) isolating Guest VLAN 80 and protecting the exam database on port 5432.
  - Validated Spanning Tree loop mitigation during broadcast storm injection.
- **Viva Focus Topics:** 802.1Q header structure, RSTP Proposal/Agreement handshake, TC (Topology Change) BPDUs, and CAM table aging.

---

### Member 3: Network Services & High-Availability Engineer
- **Specialization:** IP Addressing, DHCP Relay, Authoritative DNS & High-Availability Web Clustering
- **Primary Deliverables:**
  - Computed the VLSM IP allocation matrix from `10.20.0.0/16`, proving mathematical efficiency over FLSM.
  - Configured multi-pool `dnsmasq` DHCP server with DHCP Relay agents (`giaddr` option) on distribution SVIs.
  - Built the active/standby Nginx web server farm with Keepalived VRRP floating VIP (`10.20.10.210`).
  - Implemented local campus authoritative DNS resolution for `exam.campus.internal`.
- **Viva Focus Topics:** DHCP DORA 4-way handshake, Option 82 Relay Agent parameters, Keepalived VRRP health tracking scripts, and DNS recursive lookups.

---

### Member 4: Test Automation & Full-Stack Software Engineer
- **Specialization:** Packet Tracer Programmatic Generator, FastAPI Emulation Engine & Next.js NOC UI
- **Primary Deliverables:**
  - Created `generate_pkt.py` to programmatically build the Packet Tracer binary (`.pkt`) with zero manual placement.
  - Developed FastAPI asynchronous backend interfacing with Kathará and Docker daemon.
  - Integrated Scapy packet capture analysis and raw `.pcap` export tools.
  - Designed the 8-page Next.js NOC operations workbench with real-time telemetry and fault injection controls.
- **Viva Focus Topics:** Packet serialization, Scapy pcap dissection, Docker container networking namespaces, and Next.js / React Flow integration.

---

## 2. Shared Collaborative Deliverables
- **Engineering Design Audit:** Joint review of `NETWORK_DESIGN.md` and formulation of `docs/DESIGN_AUDIT.md`.
- **Fault Scenarios Validation:** Cooperative verification of all 14 failure and recovery benchmarks (F01–F14).
- **System Acceptance Suite:** Execution and logging of all 8 acceptance tests in `docs/TEST_RESULTS.md`.

