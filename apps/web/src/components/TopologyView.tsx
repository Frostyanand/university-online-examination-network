"use client";

import { useState } from "react";
import { 
  Router, Server, Monitor, Shield, Cpu, 
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, ExternalLink 
} from "lucide-react";

interface NodeProps {
  id: string;
  name: string;
  type: "router" | "dsw" | "asw" | "server" | "endpoint";
  role?: string;
  ip?: string;
  vlan?: number;
  status: "running" | "stopped" | "degraded" | "failed";
  x: number;
  y: number;
  activeRole?: string;
}

export default function TopologyView({ onSelectDevice }: { onSelectDevice?: (id: string) => void }) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const nodes: NodeProps[] = [
    // Routers
    { id: "ISP1", name: "Simulated ISP Gateway", type: "router", ip: "198.51.100.1 / 10.20.255.2", status: "running", x: 480, y: 30 },
    { id: "TEST-SERVER", name: "External Web Server", type: "server", ip: "198.51.100.10", status: "running", x: 740, y: 30 },
    { id: "EDGE-R1", name: "Campus Edge Router 1", type: "router", role: "OSPF Router-ID 10.20.255.1", ip: "10.20.255.1", status: "running", x: 320, y: 120 },
    { id: "EDGE-R2", name: "Campus Edge Router 2", type: "router", role: "OSPF Router-ID 10.20.255.5", ip: "10.20.255.5", status: "running", x: 640, y: 120 },

    // Distribution Switches
    { id: "DSW1", name: "Core MLS DSW1", type: "dsw", role: "Active VRRP for VLAN 10,30,50,70", ip: "10.20.10.2", activeRole: "VRRP Priority 110", status: "running", x: 320, y: 220 },
    { id: "DSW2", name: "Core MLS DSW2", type: "dsw", role: "Active VRRP for VLAN 20,40,60,80", ip: "10.20.10.3", activeRole: "VRRP Priority 110", status: "running", x: 640, y: 220 },

    // 10 Access Switches
    { id: "ASW-LA-1", name: "Lab A Switch 1", type: "asw", vlan: 10, ip: "10.20.11.40", status: "running", x: 60, y: 340 },
    { id: "ASW-LA-2", name: "Lab A Switch 2", type: "asw", vlan: 10, ip: "10.20.11.41", status: "running", x: 150, y: 340 },
    { id: "ASW-LB-1", name: "Lab B Switch 1", type: "asw", vlan: 20, ip: "10.20.11.42", status: "running", x: 250, y: 340 },
    { id: "ASW-LB-2", name: "Lab B Switch 2", type: "asw", vlan: 20, ip: "10.20.11.43", status: "running", x: 340, y: 340 },
    { id: "ASW-LC-1", name: "Lab C Switch 1", type: "asw", vlan: 30, ip: "10.20.11.44", status: "running", x: 440, y: 340 },
    { id: "ASW-LC-2", name: "Lab C Switch 2", type: "asw", vlan: 30, ip: "10.20.11.45", status: "running", x: 530, y: 340 },
    { id: "ASW-SRV-1", name: "Server Switch 1", type: "asw", vlan: 40, ip: "10.20.11.46", status: "running", x: 630, y: 340 },
    { id: "ASW-SRV-2", name: "Server Switch 2", type: "asw", vlan: 40, ip: "10.20.11.47", status: "running", x: 720, y: 340 },
    { id: "ASW-ADM-1", name: "Admin Switch 1", type: "asw", vlan: 50, ip: "10.20.11.48", status: "running", x: 820, y: 340 },
    { id: "ASW-ADM-2", name: "Mgmt Switch 2", type: "asw", vlan: 70, ip: "10.20.11.49", status: "running", x: 910, y: 340 },

    // Servers
    { id: "EXAM-WEB-1", name: "Primary Web Server", type: "server", role: "VIP Owner 10.20.10.210", ip: "10.20.10.200", status: "running", x: 610, y: 460 },
    { id: "EXAM-WEB-2", name: "Standby Web Server", type: "server", role: "VRRP Backup (Priority 90)", ip: "10.20.10.201", status: "running", x: 730, y: 460 },
    { id: "DHCP-DNS-1", name: "Primary DHCP/DNS", type: "server", role: "DHCP Pool A + DNS", ip: "10.20.10.202", status: "running", x: 670, y: 460 },
    { id: "DHCP-DNS-2", name: "Secondary DHCP/DNS", type: "server", role: "DHCP Pool B + DNS", ip: "10.20.10.203", status: "running", x: 790, y: 460 },

    // Endpoints
    { id: "PC-LA-1", name: "Student LA-01", type: "endpoint", vlan: 10, ip: "10.20.10.15", status: "running", x: 60, y: 460 },
    { id: "PC-LA-2", name: "Student LA-02", type: "endpoint", vlan: 10, ip: "10.20.10.16", status: "running", x: 150, y: 460 },
    { id: "PC-LB-1", name: "Student LB-01", type: "endpoint", vlan: 20, ip: "10.20.10.80", status: "running", x: 250, y: 460 },
    { id: "PC-LB-2", name: "Student LB-02", type: "endpoint", vlan: 20, ip: "10.20.10.81", status: "running", x: 340, y: 460 },
    { id: "PC-LC-1", name: "Student LC-01", type: "endpoint", vlan: 30, ip: "10.20.10.145", status: "running", x: 440, y: 460 },
    { id: "PC-LC-2", name: "Student LC-02", type: "endpoint", vlan: 30, ip: "10.20.10.146", status: "running", x: 530, y: 460 },
    { id: "PC-ADM-1", name: "Admin Client", type: "endpoint", vlan: 50, ip: "10.20.10.235", status: "running", x: 830, y: 460 },
    { id: "PC-GST-1", name: "Guest Client (Isolated)", type: "endpoint", vlan: 80, ip: "10.20.11.75", status: "running", x: 910, y: 460 },
  ];

  const handleNodeClick = (id: string) => {
    setSelectedNode(id);
    if (onSelectDevice) onSelectDevice(id);
  };

  return (
    <div className="relative w-full overflow-x-auto bg-panel rounded-xl border border-border p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            Campus Network Interactive Fabric
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
              31 Devices | 43 Links
            </span>
          </h3>
          <p className="text-xs text-slate-400">Click any router, switch, server, or client PC to inspect interfaces, routes, and run live diagnostic commands.</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-blue"></span> Routers (OSPF Area 0)</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-amber"></span> Core MLS (HSRP/VRRP)</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Access Layer (RSTP)</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-purple"></span> Servers (Service VIP)</div>
        </div>
      </div>

      {/* SVG Canvas for Links & Nodes */}
      <div className="relative w-[1000px] h-[550px] mx-auto select-none">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {/* WAN links */}
          <line x1="510" y1="50" x2="350" y2="135" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4" />
          <line x1="510" y1="50" x2="670" y2="135" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4" />
          <line x1="530" y1="50" x2="740" y2="50" stroke="#94a3b8" strokeWidth="2" />

          {/* Core Mesh: DSW1/DSW2 to EDGE-R1/R2 */}
          <line x1="350" y1="140" x2="350" y2="235" stroke="#22c55e" strokeWidth="2.5" />
          <line x1="350" y1="140" x2="670" y2="235" stroke="#22c55e" strokeWidth="1.5" />
          <line x1="670" y1="140" x2="350" y2="235" stroke="#22c55e" strokeWidth="1.5" />
          <line x1="670" y1="140" x2="670" y2="235" stroke="#22c55e" strokeWidth="2.5" />

          {/* DSW1 to DSW2 Trunk */}
          <line x1="380" y1="240" x2="640" y2="240" stroke="#f59e0b" strokeWidth="3" />

          {/* DSW uplinks to 10 ASWs */}
          {nodes.filter(n => n.type === "asw").map(asw => (
            <g key={asw.id}>
              <line x1="350" y1="250" x2={asw.x + 35} y2={asw.y} stroke="#475569" strokeWidth="1.2" />
              <line x1="670" y1="250" x2={asw.x + 35} y2={asw.y} stroke="#334155" strokeWidth="1" strokeDasharray="2" />
            </g>
          ))}

          {/* ASW to Endpoint Drops */}
          <line x1="95" y1="375" x2="95" y2="460" stroke="#64748b" strokeWidth="1.5" />
          <line x1="185" y1="375" x2="185" y2="460" stroke="#64748b" strokeWidth="1.5" />
          <line x1="285" y1="375" x2="285" y2="460" stroke="#64748b" strokeWidth="1.5" />
          <line x1="375" y1="375" x2="375" y2="460" stroke="#64748b" strokeWidth="1.5" />
          <line x1="475" y1="375" x2="475" y2="460" stroke="#64748b" strokeWidth="1.5" />
          <line x1="565" y1="375" x2="565" y2="460" stroke="#64748b" strokeWidth="1.5" />
          <line x1="665" y1="375" x2="645" y2="460" stroke="#a855f7" strokeWidth="1.5" />
          <line x1="665" y1="375" x2="705" y2="460" stroke="#a855f7" strokeWidth="1.5" />
          <line x1="755" y1="375" x2="765" y2="460" stroke="#a855f7" strokeWidth="1.5" />
          <line x1="755" y1="375" x2="825" y2="460" stroke="#a855f7" strokeWidth="1.5" />
          <line x1="855" y1="375" x2="865" y2="460" stroke="#64748b" strokeWidth="1.5" />
          <line x1="945" y1="375" x2="945" y2="460" stroke="#ef4444" strokeWidth="1.5" />
        </svg>

        {/* Render Node Badges */}
        {nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          let borderColor = "border-slate-700";
          let bgIconColor = "bg-slate-800 text-slate-300";

          if (node.type === "router") {
            borderColor = "border-accent-blue/60";
            bgIconColor = "bg-accent-blue/10 text-accent-blue";
          } else if (node.type === "dsw") {
            borderColor = "border-accent-amber/60";
            bgIconColor = "bg-accent-amber/10 text-accent-amber";
          } else if (node.type === "server") {
            borderColor = "border-accent-purple/60";
            bgIconColor = "bg-accent-purple/10 text-accent-purple";
          } else if (node.type === "endpoint") {
            borderColor = node.id === "PC-GST-1" ? "border-accent-red/60" : "border-slate-600";
            bgIconColor = node.id === "PC-GST-1" ? "bg-accent-red/10 text-accent-red" : "bg-slate-800 text-slate-300";
          }

          return (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              className={`absolute cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                isSelected ? "ring-2 ring-accent-blue shadow-lg shadow-accent-blue/20" : ""
              }`}
            >
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border ${borderColor} backdrop-blur shadow-md`}>
                <div className={`p-1 rounded ${bgIconColor}`}>
                  {node.type === "router" && <Router className="w-3.5 h-3.5" />}
                  {node.type === "dsw" && <Cpu className="w-3.5 h-3.5" />}
                  {node.type === "asw" && <Shield className="w-3.5 h-3.5" />}
                  {node.type === "server" && <Server className="w-3.5 h-3.5" />}
                  {node.type === "endpoint" && <Monitor className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="font-mono text-[11px] font-bold text-foreground leading-tight flex items-center gap-1">
                    {node.id}
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    {node.vlan ? `VLAN ${node.vlan}` : (node.ip?.split(" ")[0] || "")}
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

