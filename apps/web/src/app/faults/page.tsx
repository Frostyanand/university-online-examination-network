"use client";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, Zap, RotateCcw, AlertTriangle, 
  CheckCircle2, Clock, Activity, ArrowRight, Layers, Flame 
} from "lucide-react";
import { fetchSimulationState, injectFault, restoreFault } from "@/lib/api";

export default function FaultsPage() {
  const [activeFaults, setActiveFaults] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastLog, setLastLog] = useState<string>("");

  const faultScenarios = [
    {
      id: "F01",
      name: "Core Link Failure (R-CORE-1 <-> R-CORE-2)",
      tier: "Core Layer",
      protocol: "OSPFv2",
      target: "eth0 on R-CORE-1 / R-CORE-2",
      expectedTime: "< 1.5s (Dead Interval)",
      description: "Disables the direct 10.20.0.0/30 link between core routers. OSPF immediately recalculates Dijkstra shortest path and re-routes inter-core traffic via DSW-1/DSW-2 equal-cost paths.",
      normalState: "Direct cross-link forwarding",
      failoverState: "Re-routed through distribution switches (DSW-1/DSW-2)"
    },
    {
      id: "F02",
      name: "Primary Distribution Uplink Failure (R-CORE-1 <-> DSW-1)",
      tier: "Distribution Layer",
      protocol: "OSPF Cost Path",
      target: "eth1 on DSW-1",
      expectedTime: "< 2.0s",
      description: "Severs the primary 10.20.0.4/30 transit link. DSW-1 diverts all northbound campus egress traffic through its secondary link to R-CORE-2 (10.20.0.12/30).",
      normalState: "Traffic egresses via R-CORE-1",
      failoverState: "Traffic seamlessly egresses via R-CORE-2"
    },
    {
      id: "F03",
      name: "Secondary Distribution Uplink Failure (R-CORE-2 <-> DSW-2)",
      tier: "Distribution Layer",
      protocol: "OSPF Cost Path",
      target: "eth1 on DSW-2",
      expectedTime: "< 2.0s",
      description: "Simulates failure on DSW-2 primary uplink. All traffic from DSW-2 shifts to R-CORE-1 redundant uplink.",
      normalState: "Balanced core egress",
      failoverState: "Asymmetric transit through R-CORE-1"
    },
    {
      id: "F04",
      name: "Primary Distribution MLS Crash (DSW-1)",
      tier: "Distribution Layer",
      protocol: "VRRP / HSRP Failover",
      target: "DSW-1 Container Process",
      expectedTime: "< 3.0s (3 x 1s Advertisements)",
      description: "Shuts down DSW-1. Keepalived / HSRP timers on DSW-2 expire without advertisements; DSW-2 transitions from BACKUP to MASTER across all 8 VLAN VIPs.",
      normalState: "DSW-1 holds all Virtual IP Gateways (10.20.x.1)",
      failoverState: "DSW-2 claims VIP ownership, sends Gratuitous ARP"
    },
    {
      id: "F05",
      name: "Access Switch Uplink Failure (ASW-LAB-A1 to DSW-1)",
      tier: "Access Layer",
      protocol: "802.1w Rapid Spanning Tree",
      target: "eth0 on ASW-LAB-A1",
      expectedTime: "< 1.0s (RSTP Proposal/Agreement)",
      description: "Downs the primary trunk link between Lab A1 access switch and DSW-1. OVS RSTP unblocks the alternate port to DSW-2, transitioning immediately to FORWARDING.",
      normalState: "Trunk to DSW-1 Forwarding, DSW-2 Alternate Discarding",
      failoverState: "Alternate trunk to DSW-2 unblocked to Forwarding"
    },
    {
      id: "F06",
      name: "Access Switch Total Failure (ASW-LAB-A1)",
      tier: "Access Layer",
      protocol: "Hardware Isolation",
      target: "ASW-LAB-A1 Process",
      expectedTime: "N/A (Isolated to single rack)",
      description: "Simulates complete power loss of Access Switch 1 in Exam Lab A. Workstations connected to ASW-LAB-A2 remain 100% operational due to redundant dual-switch lab design.",
      normalState: "Both Lab A access switches load-sharing students",
      failoverState: "ASW-LAB-A2 continues serving its half of the examination hall"
    },
    {
      id: "F07",
      name: "DHCP Relay / Server Outage (SRV-DNS-DHCP)",
      tier: "Services Layer",
      protocol: "DHCP Lease Persistence",
      target: "SRV-DNS-DHCP dnsmasq",
      expectedTime: "No immediate impact (Lease T1 timer)",
      description: "Halts the campus DHCP daemon. Existing student exam sessions remain fully connected due to 24-hour lease timers. No new leases can be acquired until restoration.",
      normalState: "Active IP allocation and DORA handshakes",
      failoverState: "Active leases maintained; static Fallback addresses available"
    },
    {
      id: "F08",
      name: "Primary DNS Resolver Outage",
      tier: "Services Layer",
      protocol: "DNS Fallback",
      target: "SRV-DNS-DHCP Port 53",
      expectedTime: "< 1.0s (Secondary Resolver)",
      description: "Simulates failure of local authoritative DNS resolving 'exam.campus.internal'. Workstations switch queries to secondary configured DNS or cached hosts.",
      normalState: "Local resolution: exam.campus.internal -> 10.20.10.210",
      failoverState: "Secondary resolver takes over query resolution"
    },
    {
      id: "F09",
      name: "Primary Exam Web Portal Outage (SRV-WEB-1)",
      tier: "Application Layer",
      protocol: "Keepalived VIP Floating",
      target: "SRV-WEB-1 nginx",
      expectedTime: "< 2.0s",
      description: "Terminates Nginx on SRV-WEB-1. Keepalived health-check script fails; SRV-WEB-2 assumes the floating cluster VIP 10.20.10.210 and services student exam submissions.",
      normalState: "SRV-WEB-1 hosts VIP 10.20.10.210",
      failoverState: "SRV-WEB-2 takes over VIP 10.20.10.210 with zero downtime"
    },
    {
      id: "F10",
      name: "Exam Database Server Outage (SRV-DB)",
      tier: "Services Layer",
      protocol: "Database Health Check",
      target: "SRV-DB Port 5432",
      expectedTime: "< 3.0s",
      description: "Halts PostgreSQL/database backend. Web cluster enters read-only cached caching mode and queues student answers in local disk queues.",
      normalState: "Live transactional student answer commits",
      failoverState: "Cached submission buffering on web frontends"
    },
    {
      id: "F11",
      name: "L2 Broadcast Storm / Loop Induction",
      tier: "Access Layer",
      protocol: "RSTP Loop Prevention (802.1w)",
      target: "OVS Bridge Port",
      expectedTime: "< 50ms",
      description: "Attempts to cross-connect two access switches creating a physical loop. RSTP detects BPDU loops and places redundant port in DISCARDING state within milliseconds.",
      normalState: "Spanning Tree topology tree calculated",
      failoverState: "Looping port blocked; broadcast storm mitigated"
    },
    {
      id: "F12",
      name: "Inter-VLAN SVI Routing Engine Down",
      tier: "Distribution Layer",
      protocol: "Static / SVI Fallback",
      target: "DSW-1 SVI vlan20",
      expectedTime: "< 2.0s",
      description: "Downs SVI interface for Exam Lab A on DSW-1. Traffic automatically routes across inter-chassis trunk to DSW-2 SVI vlan20.",
      normalState: "DSW-1 routes Lab A inter-VLAN packets",
      failoverState: "DSW-2 SVI processes all Lab A inter-VLAN packets"
    },
    {
      id: "F13",
      name: "External WAN Uplink Flap",
      tier: "Core Layer",
      protocol: "OSPF Default Route Metric",
      target: "R-CORE-1 WAN Interface",
      expectedTime: "< 1.5s",
      description: "Flaps simulated ISP uplink on Core 1. Core 2 withdraws/re-advertises default route (0.0.0.0/0) via OSPF Type-5 LSA with adjusted metric.",
      normalState: "Egress load-balanced across dual border links",
      failoverState: "All outbound Internet traffic shifts to Core 2"
    },
    {
      id: "F14",
      name: "Rogue DHCP Server Injection in Lab C",
      tier: "Access Layer",
      protocol: "DHCP Snooping Security",
      target: "PC-LAB-C2 Rogue Daemon",
      expectedTime: "Instantaneous Drop",
      description: "Simulates an infected machine in Lab C attempting to broadcast rogue DHCP Offer packets. Access switch untrusted port drops rogue DHCP server responses.",
      normalState: "Legitimate DHCP offers accepted from trunk ports only",
      failoverState: "Untrusted access port drops rogue DHCPOFFER packets"
    }
  ];

  const refreshState = async () => {
    try {
      const state = await fetchSimulationState();
      setActiveFaults(state.active_faults?.map((f: any) => f.id) || []);
    } catch {
      // offline
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  const handleInject = async (fId: string) => {
    setActionLoading(fId);
    try {
      const res = await injectFault(fId);
      setLastLog(`[FAULT INJECTED: ${fId}]\n${res.message || "Target link/process disabled. Failover triggered."}`);
      await refreshState();
    } catch (e: any) {
      setLastLog(`[ERROR INJECTING ${fId}]\n${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (fId: string) => {
    setActionLoading(fId);
    try {
      const res = await restoreFault(fId);
      setLastLog(`[FAULT RESTORED: ${fId}]\n${res.message || "Target link/process restored. Normal forwarding resumed."}`);
      await refreshState();
    } catch (e: any) {
      setLastLog(`[ERROR RESTORING ${fId}]\n${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreAll = async () => {
    setActionLoading("ALL");
    try {
      for (const f of activeFaults) {
        await restoreFault(f);
      }
      setLastLog("[ALL FAULTS RESTORED] Entire network infrastructure back to nominal state.");
      await refreshState();
    } catch (e: any) {
      setLastLog(`[ERROR] ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-accent-red" />
            Fault Injection & Convergence Lab
          </h1>
          <p className="text-sm text-slate-400">
            Real-time link cutting, process termination, OSPF/VRRP/RSTP failover benchmarking across 14 failure scenarios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeFaults.length > 0 && (
            <button
              onClick={handleRestoreAll}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/40 text-xs font-medium transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore All ({activeFaults.length})
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Log Console */}
      {lastLog && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs flex items-start justify-between">
          <pre className="text-accent-cyan whitespace-pre-wrap">{lastLog}</pre>
          <button onClick={() => setLastLog("")} className="text-slate-500 hover:text-white ml-4">
            ×
          </button>
        </div>
      )}

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {faultScenarios.map((f) => {
          const isActive = activeFaults.includes(f.id);
          const isLoading = actionLoading === f.id;

          return (
            <div
              key={f.id}
              className={`p-4 rounded-lg border transition space-y-3 ${
                isActive
                  ? "bg-accent-red/10 border-accent-red/50 shadow-lg shadow-red-950/20"
                  : "bg-panel border-border hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-accent-blue text-sm">{f.id}</span>
                    <h3 className="font-semibold text-sm text-white">{f.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {f.tier}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-accent-cyan font-mono">
                      {f.protocol}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isActive ? "bg-accent-red animate-ping" : "bg-accent-green"}`} />
                  <span className={`text-[11px] font-mono font-semibold ${isActive ? "text-accent-red" : "text-accent-green"}`}>
                    {isActive ? "ACTIVE FAULT" : "NORMAL"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {f.description}
              </p>

              {/* Behavior Metrics */}
              <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800/80 text-[11px] font-mono space-y-1">
                <div className="text-slate-400">
                  Target Component: <span className="text-slate-200">{f.target}</span>
                </div>
                <div className="text-slate-400 flex items-center justify-between">
                  <span>Recovery Benchmark:</span>
                  <span className="text-accent-yellow font-semibold">{f.expectedTime}</span>
                </div>
                <div className="text-slate-500 text-[10px] pt-1 border-t border-slate-800">
                  <span className="text-accent-green">Normal:</span> {f.normalState}
                  <br />
                  <span className="text-accent-red">Failover:</span> {f.failoverState}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {!isActive ? (
                  <button
                    onClick={() => handleInject(f.id)}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/40 text-xs font-semibold transition"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    {isLoading ? "Injecting..." : "Inject Fault"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleRestore(f.id)}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/40 text-xs font-semibold transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isLoading ? "Restoring..." : "Restore Normal Link"}
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

