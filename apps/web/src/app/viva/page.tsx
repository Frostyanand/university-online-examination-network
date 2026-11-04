"use client";

import { useState } from "react";
import { BookOpen, HelpCircle, Users, CheckCircle2, Search, ChevronDown, ChevronUp, Layers, Award } from "lucide-react";

export default function VivaPage() {
  const [activeTab, setActiveTab] = useState<"concepts" | "viva" | "team">("concepts");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const concepts = [
    {
      title: "Ethernet Frame & IEEE 802.1Q Tagging",
      layer: "Layer 2 (Data Link)",
      summary: "Standard Ethernet II adds a 4-byte 802.1Q header containing a 12-bit VLAN ID (1-4094) and 3-bit Priority Code Point (PCP) across trunk ports between switches, allowing multiple logical subnets to share physical links.",
      keyPoints: ["12-bit VLAN ID allows up to 4,094 distinct broadcast domains", "Access ports strip the 802.1Q tag before delivering frames to end PCs", "Trunk ports preserve tags across switch-to-switch links"]
    },
    {
      title: "Address Resolution Protocol (ARP) & Gratuitous ARP",
      layer: "Layer 2 / 3",
      summary: "Maps known 32-bit IPv4 addresses to 48-bit physical MAC addresses. Gratuitous ARP (GARP) is sent as an unrequested broadcast by VRRP/HSRP failover routers to instantly refresh switch CAM tables without waiting for cache timeouts.",
      keyPoints: ["ARP Request: Broadcast (ff:ff:ff:ff:ff:ff)", "ARP Reply: Unicast to original requester", "GARP: Crucial for sub-second VRRP master gateway takeover"]
    },
    {
      title: "DHCP DORA Exchange & DHCP Relay Agent",
      layer: "Layer 7 / Application",
      summary: "Discover -> Offer -> Request -> Acknowledgment. Because DHCP Discover is a local broadcast (255.255.255.255), routers drop it by default. The DSW switch SVI acts as a DHCP Relay Agent (`ip helper-address`), converting broadcasts into unicast UDP packets sent to the central DHCP server.",
      keyPoints: ["Client sends Discover on UDP 67/68", "Relay Agent injects GIADDR (Gateway IP Address) indicating which subnet pool to allocate from", "Server responds with lease duration, DNS, and Default Gateway"]
    },
    {
      title: "OSPFv2 Link-State Dynamic Routing",
      layer: "Layer 3 (Network)",
      summary: "Open Shortest Path First operates using Dijkstra's Shortest Path First (SPF) algorithm. Every router maintains an identical Link-State Database (LSDB) within Area 0. Routes are calculated based on inverse interface bandwidth cost.",
      keyPoints: ["Protocol 89 (raw IP, does not use TCP/UDP)", "Elects Designated Router (DR) and Backup DR (BDR) on multi-access links to minimize LSA flooding", "Fast convergence with sub-2-second hello/dead detection"]
    },
    {
      title: "VRRP (RFC 5798) & First Hop Redundancy",
      layer: "Layer 3 Redundancy",
      summary: "Virtual Router Redundancy Protocol groups DSW-1 (Master, priority 110) and DSW-2 (Backup, priority 100) into a virtual gateway sharing IP 10.20.x.1 and virtual MAC 00:00:5E:00:01:{VRID}. If Master stops sending adverts for 3 seconds, Backup assumes the VIP.",
      keyPoints: ["Standardized equivalent to Cisco proprietary HSRP", "Clients configure only the Virtual IP as their static/DHCP default gateway", "Preemption ensures primary router reclaims Master state upon recovery"]
    },
    {
      title: "RSTP (IEEE 802.1w) Spanning Tree",
      layer: "Layer 2 Loop Prevention",
      summary: "Prevents bridging loops in redundant Layer 2 meshes by electing a Root Bridge and transitioning redundant ports into Discarding state. Uses rapid Proposal/Agreement handshakes for sub-second convergence instead of 802.1D's 30-50 second timers.",
      keyPoints: ["Port roles: Root Port, Designated Port, Alternate Port, Backup Port", "Port states: Discarding, Learning, Forwarding", "Edge ports (PortFast) transition to Forwarding immediately"]
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
    { name: "Student 1 (Lead Systems Architect)", role: "Core & Distribution Routing, OSPF Area 0, VRRP Gateway Design", tasks: "Configured FRRouting and Cisco IOS core topologies; verified OSPF shortest-path convergence and VRRP preemption timers." },
    { name: "Student 2 (L2 Switching & Security Specialist)", role: "Access Switching, 802.1Q VLANs, RSTP, Security ACLs", tasks: "Implemented Open vSwitch bridge policies, 802.1Q trunk allowed lists, RSTP loop prevention, and Guest VLAN isolation ACLs." },
    { name: "Student 3 (Network Services & High-Availability)", role: "DHCP Relay, Authoritative DNS, Keepalived Web Cluster VIP", tasks: "Built Nginx exam cluster with Keepalived VRRP floating VIP, multi-pool dnsmasq DHCP server, and local campus DNS resolution." },
    { name: "Student 4 (Test Automation & Full-Stack Engineer)", role: "FastAPI Simulation Engine, Scapy PCAP Analysis, Next.js NOC UI", tasks: "Created Packet Tracer generator, automated fault injection lab (F01-F14), and developed full-stack NOC operations workbench." }
  ];

  const filteredViva = vivaQuestions.filter(
    (v) => v.q.toLowerCase().includes(searchTerm.toLowerCase()) || v.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-accent-cyan" />
            Networking Theory, Viva Examination Guide & Team Roster
          </h1>
          <p className="text-sm text-slate-400">
            Authoritative theoretical references, protocol deep-dives, viva defense answers, and individual project contribution logs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-panel p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab("concepts")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              activeTab === "concepts" ? "bg-accent-blue text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Core Concepts
          </button>
          <button
            onClick={() => setActiveTab("viva")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              activeTab === "viva" ? "bg-accent-blue text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Viva Q&A ({vivaQuestions.length})
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              activeTab === "team" ? "bg-accent-blue text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Team Contributions
          </button>
        </div>
      </div>

      {/* TAB 1: CORE CONCEPTS */}
      {activeTab === "concepts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {concepts.map((c, idx) => (
            <div key={idx} className="bg-panel border border-border rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-accent-cyan border border-slate-700">
                  {c.layer}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">{c.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{c.summary}</p>
              <div className="pt-2 border-t border-border space-y-1">
                {c.keyPoints.map((pt, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-2 text-[11px] text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-green shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: VIVA Q&A */}
      {activeTab === "viva" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search viva questions by topic (e.g., OSPF, VRRP, Subnetting, ACL, DHCP)..."
              className="w-full bg-panel border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div className="space-y-3">
            {filteredViva.map((v, idx) => {
              const isExpanded = expandedIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-panel border border-border rounded-lg overflow-hidden transition"
                >
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4 h-4 text-accent-blue shrink-0" />
                      <span className="text-sm font-semibold text-white">{v.q}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="p-4 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 bg-slate-900/30">
                      <div className="mt-2 text-slate-200 font-sans">{v.a}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TEAM CONTRIBUTIONS */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-accent-cyan" />
              <h3 className="text-base font-semibold text-white">Project Engineering Team Roster</h3>
            </div>
            <p className="text-xs text-slate-400">
              Clear breakdown of individual engineering contributions, ensuring full accountability for academic evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map((m, idx) => (
              <div key={idx} className="bg-panel border border-border rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{m.name}</h4>
                  <Award className="w-4 h-4 text-accent-yellow" />
                </div>
                <div className="text-xs font-mono text-accent-cyan">{m.role}</div>
                <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-border">
                  {m.tasks}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

