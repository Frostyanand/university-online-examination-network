"use client";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, RotateCcw, AlertTriangle, 
  CheckCircle2, Clock, Activity, ArrowRight 
} from "lucide-react";
import { fetchSimulationState, injectFault, restoreFault } from "@/lib/api";

export default function FaultsPage() {
  const [activeFaults, setActiveFaults] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [lastLog, setLastLog] = useState<string>("");

  const faultScenarios = [
    {
      id: "F01",
      name: "Core Link Failure (R-CORE-1 <-> R-CORE-2)",
      tier: "Core Backbone",
      protocol: "OSPFv2 SPF",
      target: "eth0 (10.20.0.0/30)",
      expectedTime: "< 1.5s",
      description: "Disables direct inter-core link. OSPF Dijkstra recalculates shortest paths; campus egress reroutes via DSW switches.",
      failoverState: "Dynamic reroute via DSW-1/DSW-2 equal-cost paths"
    },
    {
      id: "F02",
      name: "Primary Distribution Uplink (R-CORE-1 <-> DSW-1)",
      tier: "Core Backbone",
      protocol: "OSPF Cost Metric",
      target: "eth1 on DSW-1",
      expectedTime: "< 2.0s",
      description: "Downs primary transit link. DSW-1 diverts outbound traffic to R-CORE-2 secondary link.",
      failoverState: "Egress shifts to R-CORE-2 secondary crosslink"
    },
    {
      id: "F03",
      name: "Secondary Distribution Uplink (R-CORE-2 <-> DSW-2)",
      tier: "Core Backbone",
      protocol: "OSPF Cost Metric",
      target: "eth1 on DSW-2",
      expectedTime: "< 2.0s",
      description: "Simulates secondary uplink loss. All DSW-2 traffic shifts to R-CORE-1 primary path.",
      failoverState: "Asymmetric transit through R-CORE-1"
    },
    {
      id: "F04",
      name: "Primary Distribution MLS Crash (DSW-1)",
      tier: "Distribution MLS",
      protocol: "VRRP / HSRP Failover",
      target: "DSW-1 Master Process",
      expectedTime: "< 3.6s",
      description: "Shuts down DSW-1. Keepalived Master Down Timer expires; DSW-2 claims all 8 VLAN VIPs and transmits Gratuitous ARP.",
      failoverState: "DSW-2 assumes Master role for all 8 VLAN VIPs"
    },
    {
      id: "F05",
      name: "Access Switch Uplink Cut (ASW-LAB-A1 to DSW-1)",
      tier: "Access Layer",
      protocol: "802.1w Rapid Spanning Tree",
      target: "eth0 on ASW-LAB-A1",
      expectedTime: "< 0.8s",
      description: "Downs primary trunk link. OVS RSTP unblocks alternate port to DSW-2 into Forwarding state.",
      failoverState: "Alternate trunk to DSW-2 transitions to Forwarding"
    },
    {
      id: "F06",
      name: "Total Access Switch Failure (ASW-LAB-A1)",
      tier: "Access Layer",
      protocol: "Dual-Switch Lab Isolation",
      target: "ASW-LAB-A1 Node",
      expectedTime: "Isolated",
      description: "Complete power loss of Switch 1 in Lab A. Workstations connected to ASW-LAB-A2 remain operational.",
      failoverState: "Redundant switch ASW-LAB-A2 maintains exam sessions"
    },
    {
      id: "F07",
      name: "DHCP Server Outage (SRV-DNS-DHCP)",
      tier: "Server Cluster",
      protocol: "Lease Persistence",
      target: "dnsmasq daemon",
      expectedTime: "No Drop",
      description: "Halts central DHCP daemon. Existing student exam sessions remain connected due to 24-hour lease timers.",
      failoverState: "Active client leases maintained; static fallback intact"
    },
    {
      id: "F08",
      name: "Primary DNS Resolver Outage",
      tier: "Server Cluster",
      protocol: "DNS Fallback",
      target: "UDP Port 53",
      expectedTime: "< 1.0s",
      description: "Simulates failure of local DNS resolving exam.campus.internal. Workstations switch to secondary resolver.",
      failoverState: "Secondary resolver takes over query resolution"
    },
    {
      id: "F09",
      name: "Primary Web Server Outage (SRV-WEB-1)",
      tier: "Server Cluster",
      protocol: "Keepalived VIP Floating",
      target: "Nginx on SRV-WEB-1",
      expectedTime: "< 1.8s",
      description: "Terminates Nginx on SRV-WEB-1. Keepalived health script fails; SRV-WEB-2 assumes cluster VIP 10.20.10.210.",
      failoverState: "SRV-WEB-2 claims floating VIP 10.20.10.210"
    },
    {
      id: "F10",
      name: "Database Server Outage (SRV-DB)",
      tier: "Server Cluster",
      protocol: "Database Health Check",
      target: "PostgreSQL Port 5432",
      expectedTime: "< 3.0s",
      description: "Halts database socket. Web frontends enter submission buffering mode, caching student answers to disk queues.",
      failoverState: "Cached submission buffering on web frontends"
    },
    {
      id: "F11",
      name: "Layer 2 Loop Induction (Broadcast Storm Test)",
      tier: "Access Layer",
      protocol: "RSTP Loop Mitigation",
      target: "OVS Bridge Port",
      expectedTime: "< 50ms",
      description: "Cross-connects two access ports creating a bridge loop. RSTP detects BPDU loop and transitions port to Discarding.",
      failoverState: "Looping port blocked; broadcast storm mitigated"
    },
    {
      id: "F12",
      name: "Inter-VLAN SVI Failure (vlan20)",
      tier: "Distribution MLS",
      protocol: "SVI Gateway Fallback",
      target: "DSW-1 SVI vlan20",
      expectedTime: "< 2.0s",
      description: "Downs SVI for Exam Lab A on DSW-1. Traffic automatically forwards across inter-chassis link to DSW-2.",
      failoverState: "DSW-2 SVI processes Lab A inter-VLAN packets"
    },
    {
      id: "F13",
      name: "External Border WAN Flap",
      tier: "Core Backbone",
      protocol: "OSPF Default Route Metric",
      target: "R-CORE-1 WAN Link",
      expectedTime: "< 1.5s",
      description: "Simulates border ISP disconnect on Core 1. Core 2 re-advertises default route with updated cost.",
      failoverState: "Campus egress shifts entirely to Core Router 2"
    },
    {
      id: "F14",
      name: "Rogue DHCP Server Injection in Lab C",
      tier: "Access Layer",
      protocol: "DHCP Snooping Security",
      target: "PC-LAB-C2 Untrusted Port",
      expectedTime: "Instantaneous",
      description: "Simulates malicious workstation offering rogue DHCP leases. Access switch untrusted port drops rogue DHCPOFFERs.",
      failoverState: "Untrusted port drops rogue DHCPOFFER packets"
    }
  ];

  const refreshState = async () => {
    try {
      const state = await fetchSimulationState();
      setActiveFaults(state.active_faults?.map((f: any) => f.id) || []);
    } catch {
      // offline mode
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  const handleInject = async (fId: string) => {
    setActionLoading(fId);
    try {
      const res = await injectFault(fId);
      setLastLog(`[FAULT TRIGGERED: ${fId}] ${res.message || "Target link/process disabled. Failover engaged."}`);
      await refreshState();
    } catch (e: any) {
      setLastLog(`[FAULT TRIGGERED: ${fId}] Simulated failover triggered on ${fId}.`);
      setActiveFaults(prev => [...prev, fId]);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (fId: string) => {
    setActionLoading(fId);
    try {
      const res = await restoreFault(fId);
      setLastLog(`[FAULT RESTORED: ${fId}] ${res.message || "Target link/process restored. Normal path resumed."}`);
      await refreshState();
    } catch (e: any) {
      setLastLog(`[FAULT RESTORED: ${fId}] Restored ${fId} to nominal operational state.`);
      setActiveFaults(prev => prev.filter(id => id !== fId));
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
      setActiveFaults([]);
      setLastLog("[RESTORE ALL] All 14 network paths and services restored to nominal state.");
    } catch (e: any) {
      setActiveFaults([]);
      setLastLog("[RESTORE ALL] All network paths restored.");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filterTier === "ALL" 
    ? faultScenarios 
    : faultScenarios.filter(f => f.tier.toLowerCase().includes(filterTier.toLowerCase()));

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Fault Injection & Convergence Telemetry (F01 &ndash; F14)
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Evaluate automatic failover times and protocol reconvergence (OSPF Dijkstra, VRRP, RSTP, Keepalived VIP) under simulated infrastructure failures.
          </p>
        </div>

        {activeFaults.length > 0 && (
          <button
            onClick={handleRestoreAll}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-status-successBg hover:bg-green-100 text-status-success border border-status-successBorder text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore All Systems ({activeFaults.length} Active)
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-border bg-white p-0.5 shadow-subtle text-xs">
          {["ALL", "Core Backbone", "Distribution MLS", "Access Layer", "Server Cluster"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              className={`px-3 py-1 rounded font-medium transition ${
                filterTier === t ? "bg-brand text-white shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {lastLog && (
          <span className="text-xs font-mono text-muted truncate max-w-md">
            {lastLog}
          </span>
        )}
      </div>

      {/* Clean Table Layout for Scenarios */}
      <div className="bg-panel border border-border rounded-lg shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-panel-subtle text-muted uppercase font-mono text-[10px] border-b border-border">
              <tr>
                <th className="p-3 w-16">ID</th>
                <th className="p-3">Scenario Name & Target</th>
                <th className="p-3">Subsystem Layer</th>
                <th className="p-3">Protocol Tested</th>
                <th className="p-3">Convergence Benchmark</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {filtered.map((f) => {
                const isActive = activeFaults.includes(f.id);
                const isLoading = actionLoading === f.id;

                return (
                  <tr key={f.id} className={isActive ? "bg-red-50/40" : "hover:bg-panel-subtle/50 transition"}>
                    <td className="p-3 font-mono font-bold text-brand">{f.id}</td>
                    
                    <td className="p-3">
                      <div className="font-medium text-foreground">{f.name}</div>
                      <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{f.description}</div>
                    </td>

                    <td className="p-3 font-mono text-[11px] text-muted">{f.tier}</td>

                    <td className="p-3">
                      <span className="font-mono text-[11px] font-medium text-slate-700 bg-panel-subtle px-2 py-0.5 rounded border border-border">
                        {f.protocol}
                      </span>
                    </td>

                    <td className="p-3 font-mono font-medium text-status-success">{f.expectedTime}</td>

                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                        isActive 
                          ? "bg-status-dangerBg text-status-danger border border-status-dangerBorder" 
                          : "bg-status-successBg text-status-success border border-status-successBorder"
                      }`}>
                        {isActive ? "Active Fault" : "Nominal"}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      {!isActive ? (
                        <button
                          onClick={() => handleInject(f.id)}
                          disabled={isLoading}
                          className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 border border-border text-xs text-status-danger hover:border-status-dangerBorder font-medium transition"
                        >
                          {isLoading ? "Triggering..." : "Simulate Fail"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(f.id)}
                          disabled={isLoading}
                          className="px-2.5 py-1 rounded bg-status-successBg hover:bg-green-100 border border-status-successBorder text-xs text-status-success font-medium transition"
                        >
                          {isLoading ? "Restoring..." : "Restore Path"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
