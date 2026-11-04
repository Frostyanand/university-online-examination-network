"use client";

import { useState } from "react";
import { 
  Router, Server, Monitor, Shield, Cpu, 
  Layers, HardDrive, CheckCircle2 
} from "lucide-react";

interface NodeProps {
  id: string;
  name: string;
  type: "router" | "dsw" | "asw" | "server" | "endpoint";
  role?: string;
  ip?: string;
  vlan?: number;
  x: number;
  y: number;
}

export default function TopologyView({ onSelectDevice }: { onSelectDevice?: (id: string) => void }) {
  const [selectedNode, setSelectedNode] = useState<string>("DSW1");

  const nodes: NodeProps[] = [
    // WAN & Edge Routers
    { id: "ISP1", name: "ISP Gateway", type: "router", ip: "198.51.100.1", x: 440, y: 25 },
    { id: "TEST-SERVER", name: "External Web", type: "server", ip: "198.51.100.10", x: 680, y: 25 },
    { id: "EDGE-R1", name: "Core Router 1", type: "router", role: "OSPF 10.20.255.1", ip: "10.20.255.1", x: 300, y: 110 },
    { id: "EDGE-R2", name: "Core Router 2", type: "router", role: "OSPF 10.20.255.5", ip: "10.20.255.5", x: 580, y: 110 },

    // Distribution Switches
    { id: "DSW1", name: "Distribution MLS 1", type: "dsw", role: "VRRP Master", ip: "10.20.10.2", x: 300, y: 215 },
    { id: "DSW2", name: "Distribution MLS 2", type: "dsw", role: "VRRP Backup", ip: "10.20.10.3", x: 580, y: 215 },

    // 10 Access Switches
    { id: "ASW-LA-1", name: "Lab A1", type: "asw", vlan: 20, ip: "10.20.20.10", x: 30, y: 340 },
    { id: "ASW-LA-2", name: "Lab A2", type: "asw", vlan: 20, ip: "10.20.20.11", x: 125, y: 340 },
    { id: "ASW-LB-1", name: "Lab B1", type: "asw", vlan: 30, ip: "10.20.30.10", x: 220, y: 340 },
    { id: "ASW-LB-2", name: "Lab B2", type: "asw", vlan: 30, ip: "10.20.30.11", x: 315, y: 340 },
    { id: "ASW-LC-1", name: "Lab C1", type: "asw", vlan: 40, ip: "10.20.40.10", x: 410, y: 340 },
    { id: "ASW-LC-2", name: "Lab C2", type: "asw", vlan: 40, ip: "10.20.40.11", x: 505, y: 340 },
    { id: "ASW-SRV-1", name: "Servers 1", type: "asw", vlan: 10, ip: "10.20.10.10", x: 600, y: 340 },
    { id: "ASW-SRV-2", name: "Servers 2", type: "asw", vlan: 10, ip: "10.20.10.11", x: 695, y: 340 },
    { id: "ASW-ADM-1", name: "Admin", type: "asw", vlan: 60, ip: "10.20.60.10", x: 790, y: 340 },
    { id: "ASW-ADM-2", name: "Faculty", type: "asw", vlan: 50, ip: "10.20.50.10", x: 885, y: 340 },

    // Key Servers & Workstations
    { id: "EXAM-WEB-1", name: "Web Portal 1", type: "server", role: "VIP Active", ip: "10.20.10.10", x: 585, y: 460 },
    { id: "EXAM-WEB-2", name: "Web Portal 2", type: "server", role: "VIP Standby", ip: "10.20.10.11", x: 695, y: 460 },
    { id: "DHCP-DNS-1", name: "DNS & DHCP", type: "server", role: "Option 82 Relay", ip: "10.20.10.5", x: 805, y: 460 },
    { id: "PC-LA-1", name: "Student Hall A", type: "endpoint", vlan: 20, ip: "10.20.20.15", x: 75, y: 460 },
    { id: "PC-LB-1", name: "Student Hall B", type: "endpoint", vlan: 30, ip: "10.20.30.15", x: 265, y: 460 },
    { id: "PC-LC-1", name: "Student Hall C", type: "endpoint", vlan: 40, ip: "10.20.40.15", x: 455, y: 460 },
  ];

  const handleNodeClick = (id: string) => {
    setSelectedNode(id);
    if (onSelectDevice) onSelectDevice(id);
  };

  return (
    <div className="w-full bg-white rounded-lg border border-border p-4 shadow-subtle select-none">
      
      {/* Top Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-border text-xs text-muted">
        <div className="font-medium text-foreground">
          Campus Network Interactive Fabric
          <span className="ml-2 font-normal text-muted">(31 Devices, 43 Redundant Links)</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span> Core Routers</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-600"></span> Distribution MLS</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-500"></span> Access Switches</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-600"></span> Cluster Servers</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full max-w-[980px] h-[540px] mx-auto overflow-hidden">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {/* WAN links */}
          <line x1="480" y1="45" x2="340" y2="125" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
          <line x1="480" y1="45" x2="620" y2="125" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
          <line x1="510" y1="45" x2="680" y2="45" stroke="#cbd5e1" strokeWidth="1.5" />

          {/* Core Mesh (OSPF Area 0) */}
          <line x1="340" y1="130" x2="620" y2="130" stroke="#2563eb" strokeWidth="2.5" />
          <line x1="340" y1="130" x2="340" y2="235" stroke="#2563eb" strokeWidth="2" />
          <line x1="340" y1="130" x2="620" y2="235" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="620" y1="130" x2="340" y2="235" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="620" y1="130" x2="620" y2="235" stroke="#2563eb" strokeWidth="2" />

          {/* DSW1 to DSW2 Inter-Chassis Link */}
          <line x1="380" y1="235" x2="580" y2="235" stroke="#d97706" strokeWidth="2.5" />

          {/* DSW Uplinks to 10 Access Switches */}
          {nodes.filter(n => n.type === "asw").map(asw => (
            <g key={asw.id}>
              <line x1="340" y1="245" x2={asw.x + 35} y2={asw.y} stroke="#cbd5e1" strokeWidth="1.2" />
              <line x1="620" y1="245" x2={asw.x + 35} y2={asw.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
            </g>
          ))}

          {/* End Host Drops */}
          <line x1="110" y1="375" x2="110" y2="460" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="300" y1="375" x2="300" y2="460" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="490" y1="375" x2="490" y2="460" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="635" y1="375" x2="620" y2="460" stroke="#a855f7" strokeWidth="1.5" />
          <line x1="730" y1="375" x2="730" y2="460" stroke="#a855f7" strokeWidth="1.5" />
          <line x1="825" y1="375" x2="840" y2="460" stroke="#a855f7" strokeWidth="1.5" />
        </svg>

        {/* Node Badges */}
        {nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          
          let iconBg = "bg-slate-100 text-slate-700";
          let activeBorder = "border-slate-300";

          if (node.type === "router") {
            iconBg = "bg-blue-50 text-blue-700";
            activeBorder = "border-blue-300";
          } else if (node.type === "dsw") {
            iconBg = "bg-amber-50 text-amber-700";
            activeBorder = "border-amber-300";
          } else if (node.type === "server") {
            iconBg = "bg-purple-50 text-purple-700";
            activeBorder = "border-purple-300";
          } else if (node.type === "asw") {
            iconBg = "bg-slate-100 text-slate-600";
            activeBorder = "border-slate-300";
          }

          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              className={`absolute cursor-pointer transition-all duration-150 ${
                isSelected ? "scale-105 z-20" : "hover:scale-102 z-10"
              }`}
            >
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white border ${
                isSelected ? "border-brand ring-2 ring-brand/20 shadow-md" : `${activeBorder} shadow-subtle hover:border-slate-400`
              }`}>
                <div className={`p-1 rounded ${iconBg}`}>
                  {node.type === "router" && <Router className="w-3.5 h-3.5" />}
                  {node.type === "dsw" && <Cpu className="w-3.5 h-3.5" />}
                  {node.type === "asw" && <Shield className="w-3.5 h-3.5" />}
                  {node.type === "server" && <Server className="w-3.5 h-3.5" />}
                  {node.type === "endpoint" && <Monitor className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="font-mono text-[11px] font-semibold text-foreground leading-tight flex items-center gap-1.5">
                    {node.id}
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                  </div>
                  <div className="text-[10px] text-muted font-sans leading-tight">
                    {node.vlan ? `VLAN ${node.vlan}` : (node.ip || "")}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
