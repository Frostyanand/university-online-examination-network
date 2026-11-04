"use client";

import { useState, useEffect } from "react";
import { Terminal, Server, Code, Play, RefreshCw, Layers, Shield, Cpu, Copy, Check } from "lucide-react";
import { fetchDevices, fetchDeviceDetail, executeDeviceCommand } from "@/lib/api";

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("DSW-1");
  const [deviceDetail, setDeviceDetail] = useState<any>(null);
  const [configTab, setConfigTab] = useState<"linux" | "cisco">("linux");
  const [commandInput, setCommandInput] = useState("ip addr");
  const [cliOutput, setCliOutput] = useState("");
  const [loadingCli, setLoadingCli] = useState(false);
  const [copied, setCopied] = useState(false);

  const deviceList = [
    { id: "R-CORE-1", name: "R-CORE-1", role: "Core Router 1 (Cisco 2911 / FRR)" },
    { id: "R-CORE-2", name: "R-CORE-2", role: "Core Router 2 (Cisco 2911 / FRR)" },
    { id: "DSW-1", name: "DSW-1", role: "Distribution MLS 1 (Cisco 3560 / FRR+OVS)" },
    { id: "DSW-2", name: "DSW-2", role: "Distribution MLS 2 (Cisco 3560 / FRR+OVS)" },
    { id: "ASW-LAB-A1", name: "ASW-LAB-A1", role: "Access Switch Lab A1 (Cisco 2960 / OVS)" },
    { id: "ASW-LAB-A2", name: "ASW-LAB-A2", role: "Access Switch Lab A2 (Cisco 2960 / OVS)" },
    { id: "ASW-LAB-B1", name: "ASW-LAB-B1", role: "Access Switch Lab B1 (Cisco 2960 / OVS)" },
    { id: "ASW-LAB-B2", name: "ASW-LAB-B2", role: "Access Switch Lab B2 (Cisco 2960 / OVS)" },
    { id: "ASW-LAB-C1", name: "ASW-LAB-C1", role: "Access Switch Lab C1 (Cisco 2960 / OVS)" },
    { id: "ASW-LAB-C2", name: "ASW-LAB-C2", role: "Access Switch Lab C2 (Cisco 2960 / OVS)" },
    { id: "ASW-SRV-1", name: "ASW-SRV-1", role: "Server Access Switch 1 (Cisco 2960 / OVS)" },
    { id: "ASW-SRV-2", name: "ASW-SRV-2", role: "Server Access Switch 2 (Cisco 2960 / OVS)" },
    { id: "ASW-ADM-1", name: "ASW-ADM-1", role: "Admin Access Switch 1 (Cisco 2960 / OVS)" },
    { id: "ASW-ADM-2", name: "ASW-ADM-2", role: "Admin Access Switch 2 (Cisco 2960 / OVS)" },
    { id: "SRV-WEB-1", name: "SRV-WEB-1", role: "Primary Web Exam Portal (VIP 10.20.10.210)" },
    { id: "SRV-WEB-2", name: "SRV-WEB-2", role: "Secondary Web Exam Portal (Backup VIP)" },
    { id: "SRV-DB", name: "SRV-DB", role: "Exam Database Server (10.20.10.15)" },
    { id: "SRV-DNS-DHCP", name: "SRV-DNS-DHCP", role: "Campus DNS & DHCP Relay (10.20.10.5)" },
    { id: "PC-LAB-A1", name: "PC-LAB-A1", role: "Exam Student Station A1 (VLAN 20)" },
    { id: "PC-GUEST-1", name: "PC-GUEST-1", role: "Guest Quarantine Client (VLAN 80)" }
  ];

  const loadDetail = async (id: string) => {
    try {
      const res = await fetchDeviceDetail(id);
      setDeviceDetail(res);
    } catch {
      // Mock configuration when backend offline
      setDeviceDetail({
        id,
        role: "Production Node",
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
vtysh -c 'conf t' -c 'router ospf' -c 'network 10.20.0.0/16 area 0'
`
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
      setCliOutput(prev => prev + `\n$ [${selectedDeviceId}] ${cmd}\n[Error] ${e.message}\n(Ensure simulation lab is started)\n`);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-accent-cyan" />
            Device Configuration Explorer & Interactive CLI
          </h1>
          <p className="text-sm text-slate-400">
            Compare Cisco IOS vs Linux/FRR/OVS configs and execute live diagnostic commands on container nodes.
          </p>
        </div>

        {/* Device Select */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-mono">Target Device:</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="bg-panel border border-border rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
          >
            {deviceList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} — {d.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Dual Configuration Inspector */}
        <div className="bg-panel border border-border rounded-lg overflow-hidden flex flex-col h-[650px]">
          
          {/* Header Bar with Tabs */}
          <div className="p-3 border-b border-border flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-accent-blue" />
              <span className="text-xs font-semibold text-white">Running Configuration</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-950 p-0.5 rounded border border-border">
                <button
                  onClick={() => setConfigTab("linux")}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                    configTab === "linux" ? "bg-accent-blue text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Linux / Kathará
                </button>
                <button
                  onClick={() => setConfigTab("cisco")}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                    configTab === "cisco" ? "bg-accent-blue text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Cisco IOS (.pkt)
                </button>
              </div>

              <button
                onClick={handleCopyConfig}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-border transition text-xs"
                title="Copy Configuration"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Config Code Viewer */}
          <div className="flex-1 p-4 bg-slate-950 overflow-auto font-mono text-xs text-slate-300 whitespace-pre">
            {configTab === "cisco"
              ? (deviceDetail?.cisco_config || "! Loading Cisco IOS configuration...")
              : (deviceDetail?.linux_config || "# Loading Linux/FRR startup configuration...")}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 border-t border-border bg-slate-900/40 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Target: {selectedDeviceId}</span>
            <span>Format: {configTab === "cisco" ? "Cisco IOS CLI" : "Bash + FRR vtysh + OVS"}</span>
          </div>

        </div>

        {/* Right Column: Live Interactive Web Terminal */}
        <div className="bg-panel border border-border rounded-lg overflow-hidden flex flex-col h-[650px]">
          
          {/* Header Bar */}
          <div className="p-3 border-b border-border flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-accent-green" />
              <span className="text-xs font-semibold text-white">Live Node Shell & Diagnostics</span>
            </div>
            <button
              onClick={() => setCliOutput("")}
              className="text-[11px] text-slate-400 hover:text-white font-mono"
            >
              Clear Screen
            </button>
          </div>

          {/* Quick Command Toolbar */}
          <div className="p-2 border-b border-border bg-slate-950/60 flex flex-wrap gap-1.5">
            <button
              onClick={() => handleRunCommand("ip -br addr")}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700"
            >
              ip -br addr
            </button>
            <button
              onClick={() => handleRunCommand("ip route")}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700"
            >
              ip route
            </button>
            <button
              onClick={() => handleRunCommand("vtysh -c 'show ip ospf neighbor'")}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700"
            >
              show ospf neighbor
            </button>
            <button
              onClick={() => handleRunCommand("vtysh -c 'show ip route'")}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700"
            >
              show ip route
            </button>
            <button
              onClick={() => handleRunCommand("ovs-vsctl show")}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700"
            >
              ovs-vsctl show
            </button>
            <button
              onClick={() => handleRunCommand("ping -c 3 10.20.10.1")}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700"
            >
              ping gateway
            </button>
          </div>

          {/* Output Terminal Area */}
          <div className="flex-1 p-4 bg-slate-950 overflow-auto font-mono text-xs text-accent-green whitespace-pre-wrap">
            {cliOutput || `Welcome to ${selectedDeviceId} Live Diagnostic Terminal.\nType a command below or click a quick action above to query container state.\n`}
          </div>

          {/* Command Input Field */}
          <div className="p-3 border-t border-border bg-slate-900 flex items-center gap-2">
            <span className="text-accent-cyan font-mono text-xs">{selectedDeviceId}:~$</span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRunCommand();
              }}
              placeholder="e.g., ip addr, ping -c 3 10.20.10.210, vtysh -c 'show run'"
              className="flex-1 bg-transparent border-none text-white font-mono text-xs focus:outline-none"
            />
            <button
              onClick={() => handleRunCommand()}
              disabled={loadingCli}
              className="px-3 py-1 bg-accent-blue hover:bg-blue-600 disabled:opacity-40 text-white rounded text-xs font-mono transition"
            >
              {loadingCli ? "Running..." : "Execute"}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

