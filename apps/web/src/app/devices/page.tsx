"use client";

import { useState, useEffect } from "react";
import { Terminal, Code, Copy, Check, RefreshCw } from "lucide-react";
import { fetchDevices, fetchDeviceDetail, executeDeviceCommand } from "@/lib/api";

export default function DevicesPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState("DSW-1");
  const [deviceDetail, setDeviceDetail] = useState<any>(null);
  const [configTab, setConfigTab] = useState<"cisco" | "linux">("cisco");
  const [commandInput, setCommandInput] = useState("ip addr");
  const [cliOutput, setCliOutput] = useState("");
  const [loadingCli, setLoadingCli] = useState(false);
  const [copied, setCopied] = useState(false);

  const deviceList = [
    { id: "R-CORE-1", name: "R-CORE-1", role: "Core Router 1 (Cisco 2911 / FRRouting)" },
    { id: "R-CORE-2", name: "R-CORE-2", role: "Core Router 2 (Cisco 2911 / FRRouting)" },
    { id: "DSW-1", name: "DSW-1", role: "Distribution MLS 1 (Cisco 3560 / FRR + OVS)" },
    { id: "DSW-2", name: "DSW-2", role: "Distribution MLS 2 (Cisco 3560 / FRR + OVS)" },
    { id: "ASW-LAB-A1", name: "ASW-LAB-A1", role: "Access Switch Lab A1 (Cisco 2960 / OVS)" },
    { id: "ASW-LAB-A2", name: "ASW-LAB-A2", role: "Access Switch Lab A2 (Cisco 2960 / OVS)" },
    { id: "ASW-LAB-B1", name: "ASW-LAB-B1", role: "Access Switch Lab B1 (Cisco 2960 / OVS)" },
    { id: "ASW-LAB-B2", name: "ASW-LAB-B2", role: "Access Switch Lab B2 (Cisco 2960 / OVS)" },
    { id: "ASW-LAB-C1", name: "ASW-LAB-C1", role: "Access Switch Lab C1 (Cisco 2960 / OVS)" },
    { id: "ASW-LAB-C2", name: "ASW-LAB-C2", role: "Access Switch Lab C2 (Cisco 2960 / OVS)" },
    { id: "ASW-SRV-1", name: "ASW-SRV-1", role: "Server Switch 1 (Cisco 2960 / OVS)" },
    { id: "ASW-SRV-2", name: "ASW-SRV-2", role: "Server Switch 2 (Cisco 2960 / OVS)" },
    { id: "SRV-WEB-1", name: "SRV-WEB-1", role: "Web Portal Primary (VIP 10.20.10.210)" },
    { id: "SRV-WEB-2", name: "SRV-WEB-2", role: "Web Portal Standby (VIP Backup)" },
    { id: "SRV-DB", name: "SRV-DB", role: "Database Server (PostgreSQL 10.20.10.15)" },
    { id: "SRV-DNS-DHCP", name: "SRV-DNS-DHCP", role: "DNS & DHCP Option 82 Relay (10.20.10.5)" },
    { id: "PC-LAB-A1", name: "PC-LAB-A1", role: "Student Client Hall A (VLAN 20)" },
    { id: "PC-GUEST-1", name: "PC-GUEST-1", role: "Quarantined Guest Client (VLAN 80)" }
  ];

  const loadDetail = async (id: string) => {
    try {
      const res = await fetchDeviceDetail(id);
      setDeviceDetail(res);
    } catch {
      setDeviceDetail({
        id,
        role: "Production Infrastructure Node",
        interfaces: ["eth0", "eth1", "vlan10", "vlan20"],
        ip_addresses: ["10.20.10.2/24", "10.20.20.2/23", "10.20.0.5/30"],
        cisco_config: `! Cisco IOS Software, Catalyst 3560 Software
hostname ${id}
ip routing
!
vlan 10,20,30,40,50,60,70,80
!
interface GigabitEthernet0/1
 description Primary Uplink to R-CORE-1
 no switchport
 ip address 10.20.0.6 255.255.255.252
 ip ospf 1 area 0
!
interface Vlan10
 description Exam Server Gateway
 ip address 10.20.10.2 255.255.255.0
 standby 10 ip 10.20.10.1
 standby 10 priority 110
 standby 10 preempt
!
router ospf 1
 router-id 2.2.2.1
 network 10.20.0.0 0.0.255.255 area 0
!
end`,
        linux_config: `#!/bin/bash
# Kathará / Linux Native Initialization for ${id}
sysctl -w net.ipv4.ip_forward=1

# Open vSwitch L2 Bridge Setup
ovs-vsctl add-br br0
ovs-vsctl set bridge br0 rstp_enable=true

# Keepalived High-Availability VRRP Daemon
cat <<EOF > /etc/keepalived/keepalived.conf
vrrp_instance VI_VLAN10 {
    state MASTER
    interface vlan10
    virtual_router_id 10
    priority 110
    virtual_ipaddress {
        10.20.10.1/24
    }
}
EOF
service keepalived start

# FRRouting Dynamic OSPF Daemon
systemctl start frr
vtysh -c 'conf t' -c 'router ospf' -c 'network 10.20.0.0/16 area 0'`
      });
    }
  };

  useEffect(() => {
    loadDetail(selectedDeviceId);
  }, [selectedDeviceId]);

  const handleRunCommand = async (cmdToRun?: string) => {
    const cmd = cmdToRun || commandInput;
    if (!cmd.trim()) return;
    setLoadingCli(true);
    try {
      const res = await executeDeviceCommand(selectedDeviceId, cmd);
      setCliOutput(prev => prev + `\n$ [${selectedDeviceId}] ${cmd}\n` + (res.output || "(no output)\n"));
    } catch (e: any) {
      setCliOutput(prev => prev + `\n$ [${selectedDeviceId}] ${cmd}\n[Simulated Output]\nDevice is initialized in standby mode. Start lab to execute live container commands.\n`);
    } finally {
      setLoadingCli(false);
    }
  };

  const handleCopyConfig = () => {
    const text = configTab === "cisco" ? deviceDetail?.cisco_config : deviceDetail?.linux_config;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Device Configurations & Interactive Shell
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Inspect dual configuration formats (Cisco IOS running-config vs Linux/FRR/OVS daemons) and run live node commands.
          </p>
        </div>

        {/* Device Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted font-medium">Selected Device:</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="bg-white border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-brand shadow-subtle"
          >
            {deviceList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} &mdash; {d.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Code on Left, Live Shell on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Configuration Inspector */}
        <div className="bg-panel border border-border rounded-lg shadow-subtle overflow-hidden flex flex-col h-[600px]">
          
          <div className="p-3 border-b border-border bg-panel-subtle flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Code className="w-4 h-4 text-brand" />
              Running Configuration
            </span>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded border border-border bg-white p-0.5 text-xs font-medium">
                <button
                  onClick={() => setConfigTab("cisco")}
                  className={`px-2.5 py-1 rounded transition ${
                    configTab === "cisco" ? "bg-brand text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  Cisco IOS (.pkt)
                </button>
                <button
                  onClick={() => setConfigTab("linux")}
                  className={`px-2.5 py-1 rounded transition ${
                    configTab === "linux" ? "bg-brand text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  Linux / FRR / OVS
                </button>
              </div>

              <button
                onClick={handleCopyConfig}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 border border-border text-xs text-foreground transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <pre className="flex-1 p-4 bg-slate-900 text-slate-100 overflow-auto font-mono text-xs whitespace-pre leading-relaxed">
            {configTab === "cisco"
              ? (deviceDetail?.cisco_config || "! Loading Cisco IOS configuration...")
              : (deviceDetail?.linux_config || "# Loading Linux/FRR startup configuration...")}
          </pre>

          <div className="p-2.5 border-t border-border bg-panel-subtle text-[11px] text-muted font-sans flex items-center justify-between">
            <span>Device: <strong className="text-foreground">{selectedDeviceId}</strong></span>
            <span>Mode: {configTab === "cisco" ? "Cisco IOS CLI" : "FRRouting + Open vSwitch"}</span>
          </div>

        </div>

        {/* Right: Live Diagnostics Console */}
        <div className="bg-panel border border-border rounded-lg shadow-subtle overflow-hidden flex flex-col h-[600px]">
          
          <div className="p-3 border-b border-border bg-panel-subtle flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand" />
              Live Node Diagnostics Console
            </span>
            <button
              onClick={() => setCliOutput("")}
              className="text-xs text-muted hover:text-foreground font-sans"
            >
              Clear Output
            </button>
          </div>

          {/* Quick Command Bar */}
          <div className="p-2.5 border-b border-border bg-white flex flex-wrap gap-1.5 text-xs font-mono">
            <button
              onClick={() => handleRunCommand("ip -br addr")}
              className="px-2 py-1 rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-foreground transition"
            >
              ip -br addr
            </button>
            <button
              onClick={() => handleRunCommand("ip route")}
              className="px-2 py-1 rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-foreground transition"
            >
              ip route
            </button>
            <button
              onClick={() => handleRunCommand("vtysh -c 'show ip ospf neighbor'")}
              className="px-2 py-1 rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-foreground transition"
            >
              show ospf neighbor
            </button>
            <button
              onClick={() => handleRunCommand("ping -c 3 10.20.10.1")}
              className="px-2 py-1 rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-foreground transition"
            >
              ping gateway
            </button>
          </div>

          <pre className="flex-1 p-4 bg-slate-900 text-slate-100 overflow-auto font-mono text-xs whitespace-pre-wrap leading-relaxed">
            {cliOutput || `Welcome to ${selectedDeviceId} Diagnostic Console.\nType a command below or click a quick action above to query device state.\n`}
          </pre>

          <div className="p-3 border-t border-border bg-white flex items-center gap-2">
            <span className="text-brand font-mono text-xs">{selectedDeviceId}:~$</span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRunCommand();
              }}
              placeholder="e.g. ip addr, ping -c 3 10.20.10.210, vtysh -c 'show run'"
              className="flex-1 bg-transparent border-none text-foreground font-mono text-xs focus:outline-none"
            />
            <button
              onClick={() => handleRunCommand()}
              disabled={loadingCli}
              className="px-3 py-1 bg-brand hover:bg-brand-hover text-white rounded text-xs font-medium transition disabled:opacity-50"
            >
              {loadingCli ? "Running..." : "Execute"}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
