"use client";

import { useState } from "react";
import { 
  BookOpen, HelpCircle, Users, CheckCircle2, 
  Search, ChevronDown, ChevronUp 
} from "lucide-react";

export default function VivaPage() {
  const [activeTab, setActiveTab] = useState<"concepts" | "viva" | "team">("viva");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const concepts = [
    {
      title: "Ethernet Frame & IEEE 802.1Q Tagging",
      layer: "Layer 2 (Data Link)",
      summary: "Standard Ethernet II adds a 4-byte 802.1Q header containing a 12-bit VLAN ID (1-4094) and 3-bit Priority Code Point (PCP) across trunk links, allowing multiple isolated logical subnets to traverse shared physical cables.",
      keyPoints: [
        "12-bit VLAN ID allows up to 4,094 distinct broadcast domains",
        "Access switch ports strip the 802.1Q tag before delivering frames to end workstations",
        "Trunk ports preserve 802.1Q encapsulation between switches"
      ]
    },
    {
      title: "Address Resolution Protocol (ARP) & Gratuitous ARP",
      layer: "Layer 2 / 3 Resolution",
      summary: "Maps known 32-bit IPv4 addresses to 48-bit physical MAC addresses. Gratuitous ARP (GARP) is sent as an unrequested broadcast by VRRP failover routers to instantly refresh switch CAM tables without waiting for cache timeouts.",
      keyPoints: [
        "ARP Request: Layer 2 broadcast (ff:ff:ff:ff:ff:ff)",
        "ARP Reply: Unicast to original requester",
        "GARP: Essential for sub-second VRRP master gateway takeover"
      ]
    },
    {
      title: "DHCP DORA Exchange & DHCP Relay Agent",
      layer: "Application / Transport",
      summary: "Discover -> Offer -> Request -> Acknowledgment. Because DHCP Discover is a local broadcast (255.255.255.255), routers drop it by default. The Distribution switch SVI acts as a DHCP Relay Agent ('ip helper-address'), converting broadcasts into unicast UDP packets directed to the central DHCP server.",
      keyPoints: [
        "Client sends Discover on UDP port 68 -> 67",
        "Relay Agent injects GIADDR (Gateway IP Address) specifying which subnet pool to allocate from",
        "Server returns lease duration, DNS, and Default Gateway"
      ]
    },
    {
      title: "OSPFv2 Link-State Dynamic Routing",
      layer: "Layer 3 (Network)",
      summary: "Open Shortest Path First operates using Dijkstra's Shortest Path First (SPF) algorithm. Every router maintains an identical Link-State Database (LSDB) within Area 0. Routes are calculated based on inverse interface bandwidth cost.",
      keyPoints: [
        "Protocol 89 (raw IP, does not use TCP/UDP transport)",
        "Elects Designated Router (DR) and Backup DR (BDR) on multi-access segments to minimize LSA flooding",
        "Achieves sub-2-second convergence during core link failures"
      ]
    },
    {
      title: "VRRP (RFC 5798) & First-Hop Gateway Redundancy",
      layer: "Layer 3 Redundancy",
      summary: "Virtual Router Redundancy Protocol groups DSW-1 (Master, priority 110) and DSW-2 (Backup, priority 100) into a virtual gateway sharing IP 10.20.x.1 and virtual MAC 00:00:5E:00:01:{VRID}. If Master stops sending adverts for 3.5 seconds, Backup assumes the VIP.",
      keyPoints: [
        "Standardized equivalent to Cisco proprietary HSRP",
        "Clients configure only the Virtual IP as their static/DHCP default gateway",
        "Preemption ensures primary router reclaims Master state upon recovery"
      ]
    },
    {
      title: "Rapid Spanning Tree Protocol (IEEE 802.1w / RSTP)",
      layer: "Layer 2 Loop Mitigation",
      summary: "Prevents bridging loops in redundant Layer 2 meshes by electing a Root Bridge and transitioning redundant ports into Discarding state. Uses active Proposal/Agreement handshakes for sub-second convergence instead of 802.1D's 30-50 second timers.",
      keyPoints: [
        "Port roles: Root Port, Designated Port, Alternate Port, Backup Port",
        "Port states: Discarding, Learning, Forwarding",
        "Edge ports transition to Forwarding immediately without delay"
      ]
    }
  ];

  const vivaQuestions = [
    {
      q: "Why did you choose a three-tier hierarchical architecture instead of a flat collapsed-core or single switch network?",
      a: "A three-tier model (Core, Distribution, Access) provides modular scalability, deterministic traffic engineering, and fault isolation. The Core layer is optimized strictly for high-speed packet transit without packet filtering. The Distribution layer aggregates access switches, enforces access control policies (ACLs), performs inter-VLAN routing, and hosts First Hop Redundancy (VRRP). The Access layer provides port security, VLAN segmentation, and edge storm control. A failure in one lab or access switch is completely isolated and cannot bring down campus-wide examination operations."
    },
    {
      q: "Explain how Variable-Length Subnet Masking (VLSM) was used in this university exam network.",
      a: "The network allocates subnets from a contiguous 10.20.0.0/16 supernet based strictly on host population requirements plus a 30% safety margin. Exam Lab A accommodates 380 hosts using a /23 subnet (510 usable hosts). Labs B and C use /24 subnets (254 usable hosts each). Point-to-point transit links between routers use /30 subnets (2 usable hosts each), eliminating the thousands of wasted addresses that Fixed-Length Subnet Masking (FLSM) would cause."
    },
    {
      q: "What is the role of DHCP Relay and why can't DHCP broadcast packets traverse the Distribution switch?",
      a: "Routers and Layer 3 switches drop Layer 2 broadcasts (255.255.255.255) by design to prevent broadcast storms. Because student PCs in Labs A, B, and C reside in separate VLANs from the central DHCP server (VLAN 10), their DHCP Discover broadcasts cannot reach the server without assistance. The Distribution switch's SVI interfaces run DHCP Relay ('ip helper-address' in Cisco, 'dhcp-relay' in Linux), which intercepts the broadcast and forwards it as a unicast UDP packet to the central DHCP server at 10.20.10.5 with the GIADDR field set to the client's subnet gateway."
    },
    {
      q: "How does VRRP ensure seamless failover when the primary distribution switch (DSW-1) fails?",
      a: "DSW-1 is configured with VRRP priority 110 (Master) and DSW-2 with priority 100 (Backup). DSW-1 continuously multicasts VRRP advertisement packets to 224.0.0.18 every 1 second. If DSW-1 crashes, DSW-2 detects the absence of advertisements after the Master Down Timer expires (~3.6 seconds), transitions to Master, and immediately broadcasts Gratuitous ARP packets mapping the Virtual IP (10.20.x.1) to the Virtual MAC (00:00:5E:00:01:{VRID}). All access switches instantly update their CAM tables, allowing client exam traffic to resume with zero student PC reconfiguration."
    },
    {
      q: "What security measures prevent students in Lab A from attacking the exam database directly?",
      a: "Layer 3 Access Control Lists (ACLs) are deployed on the Distribution switch SVIs. Standard student workstations are permitted to access only TCP port 80/443 on the Exam Web Cluster VIP (10.20.10.210). Direct connectivity to the database server (SRV-DB at 10.20.10.15) on port 5432 is explicitly denied for all student and guest VLANs, restricting DB access strictly to backend web server IPs and authenticated administrative workstations."
    },
    {
      q: "Why use OSPF over RIP or static routing in the campus core?",
      a: "RIP has a 15-hop limit, slow convergence (up to 180 seconds on link failure), and uses hop count rather than bandwidth metrics. Static routing lacks dynamic fault recovery. OSPFv2 is an open-standard link-state protocol that uses Dijkstra's SPF algorithm with metric cost based on link bandwidth. In our dual-core triangle topology, OSPF achieves sub-2-second convergence when a core transit link fails and supports Equal-Cost Multi-Path (ECMP) load balancing."
    },
    {
      q: "What happens if a student accidentally connects an Ethernet loop in Lab C?",
      a: "The access switches run Rapid Spanning Tree Protocol (IEEE 802.1w / RSTP). When a loop is created, BPDU frames circulate and are detected by the switch. RSTP transitions one of the redundant ports into the Discarding state within milliseconds, blocking broadcast storms and preventing CAM table thrashing without disrupting legitimate exam traffic on other ports."
    }
  ];

  const teamMembers = [
    { name: "Student 1", role: "Lead Systems Architect", focus: "Core Layer 3 Routing, Dual-Core OSPF Area 0, VRRP Design", details: "Engineered dual-core triangle topology, FRRouting daemon configuration, and verified Dijkstra SPF shortest-path convergence." },
    { name: "Student 2", role: "L2 Switching & Security Specialist", focus: "Access Switching, 802.1Q VLANs, RSTP, Security ACLs", details: "Implemented Open vSwitch bridge policies, 802.1Q trunk allowed lists, RSTP loop prevention, and Guest VLAN isolation ACLs." },
    { name: "Student 3", role: "Network Services & High-Availability", focus: "VLSM Subnet Plan, DHCP Relay, Authoritative DNS, Keepalived VIP", details: "Formulated mathematical IP allocation from 10.20.0.0/16, configured multi-pool DHCP relay, and built the Nginx Keepalived web cluster." },
    { name: "Student 4", role: "Test Automation & Full-Stack Engineer", focus: "Packet Tracer Programmatic Generator, FastAPI Engine, NOC UI", details: "Created automated .pkt generator, real-time FastAPI simulation engine, and built the clean light-themed NOC operations workbench." }
  ];

  const filteredViva = vivaQuestions.filter(
    (v) => v.q.toLowerCase().includes(searchTerm.toLowerCase()) || v.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Academic Networking Principles & Viva Voce Guide
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Authoritative theoretical documentation, viva examination interview questions with answers, and project contribution logs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-md border border-border bg-white p-0.5 shadow-subtle text-xs">
          <button
            onClick={() => setActiveTab("viva")}
            className={`px-3 py-1.5 rounded font-medium transition ${
              activeTab === "viva" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            Viva Questions ({vivaQuestions.length})
          </button>
          <button
            onClick={() => setActiveTab("concepts")}
            className={`px-3 py-1.5 rounded font-medium transition ${
              activeTab === "concepts" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            Core Theory
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`px-3 py-1.5 rounded font-medium transition ${
              activeTab === "team" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            Team Contributions
          </button>
        </div>
      </div>

      {/* TAB 1: VIVA Q&A */}
      {activeTab === "viva" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-light absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter viva topics (e.g. OSPF, VRRP, VLSM, DHCP Relay, ACL, RSTP)..."
              className="w-full bg-white border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder-muted-light focus:outline-none focus:border-brand shadow-subtle"
            />
          </div>

          <div className="space-y-3">
            {filteredViva.map((v, idx) => {
              const isExpanded = expandedIndex === idx;

              return (
                <div
                  key={idx}
                  className="bg-panel border border-border rounded-lg shadow-subtle overflow-hidden transition"
                >
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-panel-subtle/50"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4 h-4 text-brand shrink-0" />
                      <span className="text-xs font-semibold text-foreground">{v.q}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-1 text-xs text-slate-700 leading-relaxed border-t border-border bg-panel-subtle/40">
                      <p className="mt-1 font-sans">{v.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CORE CONCEPTS */}
      {activeTab === "concepts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {concepts.map((c, idx) => (
            <div key={idx} className="bg-panel border border-border rounded-lg shadow-subtle p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-medium text-brand bg-brand-light px-2 py-0.5 rounded border border-brand-border">
                  {c.layer}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
              <p className="text-xs text-slate-700 leading-relaxed">{c.summary}</p>
              <div className="pt-2 border-t border-border space-y-1.5">
                {c.keyPoints.map((pt, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-2 text-xs text-muted">
                    <CheckCircle2 className="w-3.5 h-3.5 text-status-success shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: TEAM CONTRIBUTIONS */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-lg shadow-subtle p-4">
            <h3 className="text-sm font-semibold text-foreground">Project Team Contributions Roster</h3>
            <p className="text-xs text-muted mt-1">
              Structured engineering responsibilities and academic deliverable breakdown for viva grading.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map((m, idx) => (
              <div key={idx} className="bg-panel border border-border rounded-lg shadow-subtle p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground text-sm">{m.name}</h4>
                  <span className="text-xs font-mono text-brand font-medium">{m.role}</span>
                </div>
                <div className="text-xs text-muted font-medium">{m.focus}</div>
                <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-border">
                  {m.details}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
