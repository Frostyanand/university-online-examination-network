"use client";

import { useState, useEffect } from "react";
import TopologyView from "@/components/TopologyView";
import { 
  fetchSimulationState, 
  fetchDevices, 
  fetchDeviceDetail, 
  executeDeviceCommand,
  injectFault,
  restoreFault
} from "@/lib/api";
import { 
  Server, Shield, Activity, AlertOctagon, CheckCircle2, 
  Clock, Zap, RefreshCw, Terminal, Layers, ArrowUpRight 
} from "lucide-react";

export default function NOCDashboard() {
  const [simState, setSimState] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>("DSW-1");
  const [deviceDetail, setDeviceDetail] = useState<any>(null);
  const [cliOutput, setCliOutput] = useState<string>("");
  const [cliLoading, setCliLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [stateRes, devRes] = await Promise.all([
        fetchSimulationState(),
        fetchDevices()
      ]);
      setSimState(stateRes);
      setDevices(devRes);
    } catch {
      // Use fallback/offline data when backend is not actively running
      setSimState({
        is_running: false,
        device_count: 31,
        active_faults: [],
        vrrp_status: { master: "DSW-1", backup: "DSW-2", vip: "10.20.10.1" },
        ospf_status: { total_neighbors: 6, state: "FULL" }
      });
    } finally {
      setLoading(false);
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
          // Mock details if backend not ready
          setDeviceDetail({
            id: selectedDevice,
            name: selectedDevice,
            role: selectedDevice.startsWith("R-") ? "Core Router" : selectedDevice.startsWith("DSW-") ? "Distribution MLS" : selectedDevice.startsWith("ASW-") ? "Access Switch" : "End Host / Server",
            ip_addresses: ["10.20.0.0/24 subnet member"],
            interfaces: ["eth0", "eth1"],
            status: simState?.is_running ? "RUNNING" : "STOPPED"
          });
        });
    }
  }, [selectedDevice, simState?.is_running]);

  const handleRunCommand = async (cmd: string) => {
    if (!selectedDevice) return;
    setCliLoading(true);
    try {
      const res = await executeDeviceCommand(selectedDevice, cmd);
      setCliOutput(res.output || "(Command returned no output)");
    } catch (e: any) {
      setCliOutput(`[Error executing '${cmd}']\nEnsure simulation lab is running: ${e.message}`);
    } finally {
      setCliLoading(false);
    }
  };

  const isRunning = simState?.is_running;
  const activeFaults = simState?.active_faults || [];

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-accent-blue" />
            NOC Operations Centre
          </h1>
          <p className="text-sm text-slate-400">
            Real-time telemetry, live topology status, VRRP gateway health, and device diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-border transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Infrastructure State */}
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Network Devices</span>
            <Server className="w-4 h-4 text-accent-blue" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {isRunning ? "31 / 31" : "31 (Planned)"}
            </span>
            <span className={`text-xs font-mono font-medium ${isRunning ? "text-accent-green" : "text-slate-400"}`}>
              {isRunning ? "ONLINE" : "STANDBY"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span>2 Core • 2 DSW • 10 ASW • 4 Servers • 13 Clients</span>
          </div>
        </div>

        {/* Card 2: Gateway Redundancy (VRRP) */}
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Gateway Redundancy (VRRP)</span>
            <Shield className="w-4 h-4 text-accent-cyan" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-accent-cyan">
              {activeFaults.some((f: any) => f.id === "F01") ? "DSW-2 (FAILOVER)" : "DSW-1 (MASTER)"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-mono">
            <span>VIP: 10.20.10.1 (VLAN 10) • Active Virtual Router</span>
          </div>
        </div>

        {/* Card 3: Dynamic Routing (OSPF Area 0) */}
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Core Routing (OSPFv2)</span>
            <Layers className="w-4 h-4 text-accent-green" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">Area 0.0.0.0</span>
            <span className="text-xs font-mono text-accent-green font-medium">FULL MESH</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            <span>Dual-Core Triangle Topology • Equal-Cost Multipath</span>
          </div>
        </div>

        {/* Card 4: Active Network Faults */}
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Fault Injection State</span>
            <AlertOctagon className={`w-4 h-4 ${activeFaults.length > 0 ? "text-accent-red animate-pulse" : "text-slate-400"}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${activeFaults.length > 0 ? "text-accent-red" : "text-white"}`}>
              {activeFaults.length} Active
            </span>
            <span className={`text-xs font-mono ${activeFaults.length > 0 ? "text-accent-red" : "text-accent-green"}`}>
              {activeFaults.length > 0 ? "DEGRADED" : "HEALTHY"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {activeFaults.length > 0 ? activeFaults.map((f: any) => f.name).join(", ") : "All redundant links operational"}
          </div>
        </div>

      </div>

      {/* Main Content Area: Interactive Topology + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Topology View (2 cols wide) */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-blue" />
              Hierarchical Network Fabric
            </h2>
            <span className="text-xs text-slate-400">Click any node to inspect interfaces & run diagnostics</span>
          </div>
          <div className="h-[620px] rounded-lg border border-border bg-slate-950 overflow-hidden shadow-2xl relative">
            <TopologyView onSelectDevice={(id) => setSelectedDevice(id)} />
          </div>
        </div>

        {/* Device Detail & Quick Diagnostics Inspector (1 col wide) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-accent-cyan" />
              Device Inspector
            </h2>
            {selectedDevice && (
              <span className="text-xs font-mono bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded border border-accent-blue/30">
                {selectedDevice}
              </span>
            )}
          </div>

          <div className="bg-panel border border-border rounded-lg p-4 space-y-4">
            {deviceDetail ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-400">Device ID / Hostname</div>
                  <div className="text-lg font-bold text-white font-mono">{deviceDetail.id || selectedDevice}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{deviceDetail.role || "Network Node"}</div>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="text-xs font-semibold text-slate-300 mb-1">Configured IP Addresses</div>
                  <div className="space-y-1">
                    {deviceDetail.ip_addresses && deviceDetail.ip_addresses.length > 0 ? (
                      deviceDetail.ip_addresses.map((ip: string, idx: number) => (
                        <div key={idx} className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-300 border border-slate-800">
                          {ip}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 font-mono">DHCP / Bridged L2 Only</div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="text-xs font-semibold text-slate-300 mb-2">Live Diagnostic Actions</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleRunCommand("ip addr")}
                      disabled={cliLoading || !isRunning}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-mono text-slate-200 rounded border border-border transition text-left"
                    >
                      $ ip addr
                    </button>
                    <button
                      onClick={() => handleRunCommand("ip route")}
                      disabled={cliLoading || !isRunning}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-mono text-slate-200 rounded border border-border transition text-left"
                    >
                      $ ip route
                    </button>
                    <button
                      onClick={() => handleRunCommand(selectedDevice?.startsWith("R-") || selectedDevice?.startsWith("DSW-") ? "vtysh -c 'show ip ospf neighbor'" : "ping -c 2 10.20.10.1")}
                      disabled={cliLoading || !isRunning}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-mono text-slate-200 rounded border border-border transition text-left"
                    >
                      {selectedDevice?.startsWith("R-") || selectedDevice?.startsWith("DSW-") ? "$ show ospf" : "$ ping gateway"}
                    </button>
                    <button
                      onClick={() => handleRunCommand(selectedDevice?.startsWith("ASW-") || selectedDevice?.startsWith("DSW-") ? "ovs-vsctl show" : "curl -I -s http://10.20.10.210")}
                      disabled={cliLoading || !isRunning}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-mono text-slate-200 rounded border border-border transition text-left"
                    >
                      {selectedDevice?.startsWith("ASW-") || selectedDevice?.startsWith("DSW-") ? "$ ovs-vsctl" : "$ curl VIP"}
                    </button>
                  </div>
                </div>

                {/* Output Console */}
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono text-slate-400">Terminal Output</span>
                    {cliLoading && <span className="text-xs text-accent-cyan animate-pulse font-mono">Executing...</span>}
                  </div>
                  <pre className="bg-slate-950 border border-slate-800 rounded p-3 text-[11px] font-mono text-accent-green overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {cliOutput || (!isRunning ? "[Emulator is stopped. Start the lab from the top bar to run real Linux commands.]" : "Click a diagnostic button above to inspect live device state.")}
                  </pre>
                </div>

              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-12">
                Select a device node from the topology diagram to view its interfaces and live routes.
              </div>
            )}
          </div>

          {/* Quick Scenario Triggers */}
          <div className="bg-panel border border-border rounded-lg p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Quick Failover Tests</span>
              <Zap className="w-3.5 h-3.5 text-accent-yellow" />
            </div>
            <div className="space-y-2">
              <button
                onClick={() => injectFault("F01")}
                className="w-full text-left px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-border text-xs flex items-center justify-between text-slate-300 hover:text-white transition"
              >
                <span>F01: Core Link Failure (R1-R2)</span>
                <span className="text-accent-red font-mono text-[10px]">Test OSPF</span>
              </button>
              <button
                onClick={() => injectFault("F04")}
                className="w-full text-left px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-border text-xs flex items-center justify-between text-slate-300 hover:text-white transition"
              >
                <span>F04: Primary DSW-1 Crash</span>
                <span className="text-accent-yellow font-mono text-[10px]">Test VRRP</span>
              </button>
              <button
                onClick={() => injectFault("F09")}
                className="w-full text-left px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-border text-xs flex items-center justify-between text-slate-300 hover:text-white transition"
              >
                <span>F09: Primary Web Server Outage</span>
                <span className="text-accent-cyan font-mono text-[10px]">Test Web VIP</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

