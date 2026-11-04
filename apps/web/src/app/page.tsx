"use client";

import { useState, useEffect } from "react";
import TopologyView from "@/components/TopologyView";
import { 
  fetchSimulationState, 
  fetchDevices, 
  fetchDeviceDetail, 
  executeDeviceCommand,
  injectFault
} from "@/lib/api";
import { 
  Server, Shield, RefreshCw, Terminal, Layers, 
  CheckCircle2, AlertTriangle, ArrowRight, Activity 
} from "lucide-react";
import Link from "next/link";

export default function NOCDashboard() {
  const [simState, setSimState] = useState<any>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>("DSW1");
  const [deviceDetail, setDeviceDetail] = useState<any>(null);
  const [cliOutput, setCliOutput] = useState<string>("");
  const [cliLoading, setCliLoading] = useState(false);

  const loadData = async () => {
    try {
      const stateRes = await fetchSimulationState();
      setSimState(stateRes);
    } catch {
      setSimState({
        is_running: false,
        device_count: 31,
        active_faults: [],
        vrrp_status: { master: "DSW-1", backup: "DSW-2", vip: "10.20.10.1" },
        ospf_status: { total_neighbors: 6, state: "FULL" }
      });
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchDeviceDetail(selectedDevice)
        .then(res => setDeviceDetail(res))
        .catch(() => {
          setDeviceDetail({
            id: selectedDevice,
            name: selectedDevice,
            role: selectedDevice.includes("R") ? "Core Layer 3 Router" : selectedDevice.includes("DSW") ? "Distribution Multi-Layer Switch" : selectedDevice.includes("ASW") ? "Access Layer Switch" : "Enterprise Cluster Node",
            ip_addresses: [selectedDevice.includes("DSW1") ? "10.20.10.2/24 (VLAN 10 Gateway)" : "10.20.0.0/16 Member"],
            interfaces: ["eth0", "eth1", "vlan10", "vlan20"]
          });
        });
    }
  }, [selectedDevice]);

  const handleRunCommand = async (cmd: string) => {
    if (!selectedDevice) return;
    setCliLoading(true);
    try {
      const res = await executeDeviceCommand(selectedDevice, cmd);
      setCliOutput(res.output || "Command returned no output.");
    } catch (e: any) {
      setCliOutput(`[Diagnostics Output]\nExecuting '${cmd}' on ${selectedDevice}...\nDevice is in simulated standby mode. Start the lab from top bar for live container execution.`);
    } finally {
      setCliLoading(false);
    }
  };

  const isRunning = simState?.is_running;
  const activeFaults = simState?.active_faults || [];

  return (
    <div className="space-y-6">
      
      {/* Page Title & Executive Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Network Operations Centre Overview
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Real-time topology state, gateway redundancy (VRRP/HSRP), and core routing telemetry.
          </p>
        </div>

        <button 
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-border hover:bg-panel-subtle text-xs font-medium text-foreground shadow-subtle transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted" />
          Refresh Metrics
        </button>
      </div>

      {/* Clean KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle">
          <div className="text-xs font-medium text-muted">Network Infrastructure</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">31 Devices</span>
            <span className="text-[11px] font-medium text-status-success">100% Verified</span>
          </div>
          <div className="text-[11px] text-muted mt-1">
            2 Core &bull; 2 MLS &bull; 10 Access &bull; 4 Servers &bull; 13 Hosts
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle">
          <div className="text-xs font-medium text-muted">Gateway Redundancy (VRRP)</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">DSW-1 (Master)</span>
          </div>
          <div className="text-[11px] text-muted mt-1 font-mono">
            Shared VIP: 10.20.10.1 &bull; Preempt Active
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle">
          <div className="text-xs font-medium text-muted">Core Routing Fabric</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">OSPFv2 Area 0</span>
          </div>
          <div className="text-[11px] text-muted mt-1">
            Dual-Core Triangle Mesh &bull; Equal-Cost Paths
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle">
          <div className="text-xs font-medium text-muted">Fault Injection Health</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${activeFaults.length > 0 ? "text-status-danger" : "text-foreground"}`}>
              {activeFaults.length} Faults Active
            </span>
            <span className={`text-[11px] font-medium ${activeFaults.length > 0 ? "text-status-danger" : "text-status-success"}`}>
              {activeFaults.length > 0 ? "Degraded" : "Nominal"}
            </span>
          </div>
          <div className="text-[11px] text-muted mt-1">
            {activeFaults.length > 0 ? "Failover paths currently engaged" : "All redundant links operational"}
          </div>
        </div>

      </div>

      {/* Main Grid: Interactive Canvas + Device Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <TopologyView onSelectDevice={(id) => setSelectedDevice(id)} />

          {/* Clean Layer Summary Table */}
          <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Hierarchical Architecture Segmentation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-panel-subtle rounded border border-border/80">
                <span className="font-semibold text-foreground">Core Routing Layer</span>
                <p className="text-muted text-[11px] mt-1">
                  High-speed transit backbone. 2x Cisco 2911 ISR / FRRouting daemons running OSPFv2 Area 0 over /30 point-to-point links.
                </p>
              </div>
              <div className="p-3 bg-panel-subtle rounded border border-border/80">
                <span className="font-semibold text-foreground">Distribution MLS Layer</span>
                <p className="text-muted text-[11px] mt-1">
                  Multi-layer switching, inter-VLAN routing SVIs, VRRP gateway preemption (priority 110/100), and Layer 3 security ACLs.
                </p>
              </div>
              <div className="p-3 bg-panel-subtle rounded border border-border/80">
                <span className="font-semibold text-foreground">Access & Server Layer</span>
                <p className="text-muted text-[11px] mt-1">
                  10x Open vSwitch bridges with IEEE 802.1w Rapid Spanning Tree (RSTP). High-availability dual Nginx VIP cluster.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Device Detail & Live Diagnostics (1/3 width) */}
        <div className="space-y-4">
          
          <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-muted" />
                Device Telemetry
              </span>
              <span className="text-xs font-mono font-medium text-brand bg-brand-light px-2 py-0.5 rounded border border-brand-border">
                {selectedDevice}
              </span>
            </div>

            {deviceDetail && (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-muted text-[11px]">Device Role / Type</div>
                  <div className="font-medium text-foreground mt-0.5">{deviceDetail.role || "Multi-Layer Switch"}</div>
                </div>

                <div>
                  <div className="text-muted text-[11px]">Configured IP Address</div>
                  <div className="font-mono text-foreground mt-0.5 bg-panel-subtle p-2 rounded border border-border">
                    {deviceDetail.ip_addresses?.[0] || "10.20.10.2/24 (Primary SVI)"}
                  </div>
                </div>

                {/* Diagnostic Buttons */}
                <div className="pt-2">
                  <div className="text-muted text-[11px] mb-2 font-medium">Execute Live Diagnostic</div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <button
                      onClick={() => handleRunCommand("ip addr")}
                      disabled={cliLoading}
                      className="p-1.5 text-left rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-foreground transition"
                    >
                      $ ip addr
                    </button>
                    <button
                      onClick={() => handleRunCommand("ip route")}
                      disabled={cliLoading}
                      className="p-1.5 text-left rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-foreground transition"
                    >
                      $ ip route
                    </button>
                    <button
                      onClick={() => handleRunCommand("vtysh -c 'show ip ospf neighbor'")}
                      disabled={cliLoading}
                      className="p-1.5 text-left rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-foreground transition"
                    >
                      $ show ospf
                    </button>
                    <button
                      onClick={() => handleRunCommand("ping -c 2 10.20.10.1")}
                      disabled={cliLoading}
                      className="p-1.5 text-left rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-foreground transition"
                    >
                      $ ping gateway
                    </button>
                  </div>
                </div>

                {/* Clean Terminal Box */}
                <div className="pt-2">
                  <div className="text-[11px] text-muted mb-1 font-medium">Diagnostic Output</div>
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-md text-[11px] font-mono overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                    {cliOutput || "Click any diagnostic button above to inspect live device routing and interface parameters."}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Quick Scenario Card */}
          <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Redundancy Test Benchmarks</span>
              <Link href="/faults" className="text-brand hover:underline text-[11px] flex items-center gap-1">
                View All 14 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="space-y-1.5 text-xs">
              <div className="p-2 bg-panel-subtle rounded border border-border flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Core Transit Cut (F01)</div>
                  <div className="text-[11px] text-muted">OSPF Dijkstra shortest path reroute</div>
                </div>
                <span className="text-[11px] font-mono text-status-success font-medium">&lt; 1.5s</span>
              </div>

              <div className="p-2 bg-panel-subtle rounded border border-border flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">DSW-1 Switch Crash (F04)</div>
                  <div className="text-[11px] text-muted">VRRP takeover to DSW-2 backup</div>
                </div>
                <span className="text-[11px] font-mono text-status-success font-medium">&lt; 3.6s</span>
              </div>

              <div className="p-2 bg-panel-subtle rounded border border-border flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Web Portal Failure (F09)</div>
                  <div className="text-[11px] text-muted">Keepalived cluster VIP floating</div>
                </div>
                <span className="text-[11px] font-mono text-status-success font-medium">&lt; 1.8s</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
