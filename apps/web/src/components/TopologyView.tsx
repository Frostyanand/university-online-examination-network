"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  useViewport,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Router,
  Server,
  Monitor,
  Shield,
  Cpu,
  Maximize2,
  Minimize2,
  Network,
} from "lucide-react";

// --- Node Data Interface ---
export interface NetworkDeviceData extends Record<string, unknown> {
  id: string;
  name: string;
  type: "router" | "dsw" | "asw" | "server" | "endpoint";
  model: string;
  role: string;
  ip?: string;
  vlan?: number;
  subnet?: string;
  protocol?: string;
  interfaces?: string[];
  gateway?: string;
  status?: "nominal" | "degraded" | "fault";
  isSelected?: boolean;
}

// --- Custom Network Node Component with Dynamic Level of Detail (LOD) ---
function NetworkNode({ data }: { data: NetworkDeviceData }) {
  const { zoom } = useViewport();

  // Color schemes based on device category (Clean Enterprise Light Theme)
  const categoryStyles = useMemo(() => {
    switch (data.type) {
      case "router":
        return {
          icon: <Router className="w-3.5 h-3.5 text-blue-700" />,
          badgeBg: "bg-blue-50 border-blue-200 text-blue-800",
          accentColor: "border-blue-400",
          tagBg: "bg-blue-100/70 text-blue-800",
        };
      case "dsw":
        return {
          icon: <Cpu className="w-3.5 h-3.5 text-amber-700" />,
          badgeBg: "bg-amber-50 border-amber-200 text-amber-800",
          accentColor: "border-amber-400",
          tagBg: "bg-amber-100/70 text-amber-800",
        };
      case "asw":
        return {
          icon: <Shield className="w-3.5 h-3.5 text-slate-700" />,
          badgeBg: "bg-slate-100 border-slate-200 text-slate-800",
          accentColor: "border-slate-300",
          tagBg: "bg-slate-200/60 text-slate-700",
        };
      case "server":
        return {
          icon: <Server className="w-3.5 h-3.5 text-purple-700" />,
          badgeBg: "bg-purple-50 border-purple-200 text-purple-800",
          accentColor: "border-purple-400",
          tagBg: "bg-purple-100/70 text-purple-800",
        };
      case "endpoint":
      default:
        return {
          icon: <Monitor className="w-3.5 h-3.5 text-emerald-700" />,
          badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-800",
          accentColor: "border-emerald-300",
          tagBg: "bg-emerald-100/70 text-emerald-800",
        };
    }
  }, [data.type]);

  const statusColor = data.status === "fault" ? "bg-red-500" : "bg-emerald-500";
  const isSelected = data.isSelected;

  // Render Handles for connectivity
  const renderHandles = () => (
    <>
      <Handle type="target" position={Position.Top} id="top" className="!w-2 !h-2 !bg-slate-400 !border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2 !h-2 !bg-slate-400 !border-white" />
      <Handle type="target" position={Position.Left} id="left" className="!w-2 !h-2 !bg-slate-400 !border-white" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-slate-400 !border-white" />
    </>
  );

  // LEVEL OF DETAIL 0: Overview (zoom < 0.65)
  // Shows clean, high-contrast, uncluttered compact chip
  if (zoom < 0.65) {
    return (
      <div className={`relative px-2.5 py-1.5 rounded-md bg-white border shadow-sm transition-all select-none ${
        isSelected 
          ? "border-blue-600 ring-2 ring-blue-500/30 shadow-md scale-105" 
          : "border-slate-300 hover:border-slate-400"
      }`}>
        {renderHandles()}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <div className="p-0.5 rounded bg-slate-50">{categoryStyles.icon}</div>
          <span className="font-mono text-xs font-semibold text-slate-800 tracking-tight">{data.id}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        </div>
      </div>
    );
  }

  // LEVEL OF DETAIL 1: Standard Architecture Mode (0.65 <= zoom < 1.15)
  // Clean enterprise card with ID, Name, Subtitle, and Primary IP/VLAN
  if (zoom < 1.15) {
    return (
      <div className={`relative w-[180px] p-2.5 rounded-lg bg-white border transition-all select-none shadow-sm ${
        isSelected 
          ? "border-blue-600 ring-2 ring-blue-500/20 shadow-md" 
          : "border-slate-200 hover:border-slate-300 hover:shadow"
      }`}>
        {renderHandles()}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 truncate">
            <div className={`p-1 rounded ${categoryStyles.badgeBg}`}>
              {categoryStyles.icon}
            </div>
            <span className="font-mono text-xs font-bold text-slate-900 truncate">{data.id}</span>
          </div>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
        </div>
        <div className="text-[11px] font-medium text-slate-700 truncate">{data.name}</div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-100 font-mono">
          <span className="truncate">{data.vlan ? `VLAN ${data.vlan}` : (data.ip || "Bridged L2")}</span>
          <span className="text-[9px] uppercase px-1 rounded bg-slate-100 text-slate-600 font-sans">{data.type}</span>
        </div>
      </div>
    );
  }

  // LEVEL OF DETAIL 2: Deep Diagnostic Mode (zoom >= 1.15)
  // High-fidelity engineering card with interfaces, routing protocols, VRRP & STP metrics
  return (
    <div className={`relative w-[230px] p-3 rounded-lg bg-white border transition-all select-none shadow-sm ${
      isSelected 
        ? "border-blue-600 ring-2 ring-blue-500/30 shadow-lg" 
        : "border-slate-200 hover:border-slate-400 hover:shadow-md"
    }`}>
      {renderHandles()}
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded ${categoryStyles.badgeBg}`}>
            {categoryStyles.icon}
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-slate-900 leading-tight">{data.id}</div>
            <div className="text-[9px] text-slate-400 font-mono">{data.model}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-[10px] text-slate-500 font-mono">ON</span>
        </div>
      </div>

      {/* Role & Protocol Metric */}
      <div className="mt-2 space-y-1 text-[11px]">
        <div className="font-medium text-slate-800 leading-tight">{data.role}</div>
        {data.protocol && (
          <div className="text-[10px] font-mono text-blue-700 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100 inline-block">
            {data.protocol}
          </div>
        )}
      </div>

      {/* Interfaces & Configuration Specs */}
      <div className="mt-2 pt-2 border-t border-slate-100 font-mono text-[10px] space-y-0.5 text-slate-600">
        {data.ip && (
          <div className="flex justify-between">
            <span className="text-slate-400">IP:</span>
            <span className="font-medium text-slate-800">{data.ip}</span>
          </div>
        )}
        {data.gateway && (
          <div className="flex justify-between">
            <span className="text-slate-400">GW:</span>
            <span>{data.gateway}</span>
          </div>
        )}
        {data.interfaces && data.interfaces.slice(0, 3).map((iface, idx) => (
          <div key={idx} className="flex justify-between text-[9px] text-slate-500">
            <span className="text-slate-400">port:</span>
            <span className="truncate max-w-[150px]">{iface}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes = {
  networkNode: NetworkNode,
};

// --- Initial Complete Campus Network Topography (31 Devices, 44 Links) ---
const initialNodes: Node<NetworkDeviceData>[] = [
  // --- TIER 0: WAN / ISP Layer ---
  {
    id: "ISP1",
    type: "networkNode",
    position: { x: 950, y: 50 },
    data: {
      id: "ISP1",
      name: "ISP Gateway (Simulated)",
      type: "router",
      model: "Cisco 2911",
      role: "WAN Gateway & Simulated Internet",
      ip: "198.51.100.1/24",
      protocol: "BGP / Static Route",
      interfaces: ["eth0: 198.51.100.1/24 (WAN)", "eth1: 198.51.100.2 (Transit R1)", "eth2: 198.51.100.6 (Transit R2)"],
      status: "nominal"
    }
  },
  {
    id: "TEST-SERVER",
    type: "networkNode",
    position: { x: 1350, y: 50 },
    data: {
      id: "TEST-SERVER",
      name: "External Test Server",
      type: "server",
      model: "Linux Ubuntu Web",
      role: "Simulated External Cloud Node",
      ip: "198.51.100.10/24",
      gateway: "198.51.100.1",
      interfaces: ["eth0: 198.51.100.10/24", "Port 80/443 HTTP"],
      status: "nominal"
    }
  },

  // --- TIER 1: Core Routing Layer (OSPF Area 0 Backbone) ---
  {
    id: "EDGE-R1",
    type: "networkNode",
    position: { x: 750, y: 220 },
    data: {
      id: "EDGE-R1",
      name: "Primary Edge Router",
      type: "router",
      model: "Cisco 2911 ISR",
      role: "Core Transit & OSPF Backbone",
      ip: "10.20.255.1/30",
      protocol: "OSPFv2 Area 0 (RID 10.20.255.1)",
      interfaces: ["eth0: 198.51.100.2/30 (ISP)", "eth1: 10.20.255.1/30 (Peer R2)", "eth2: 10.20.255.5/30 (DSW1)", "eth3: 10.20.255.9/30 (DSW2)"],
      status: "nominal"
    }
  },
  {
    id: "EDGE-R2",
    type: "networkNode",
    position: { x: 1450, y: 220 },
    data: {
      id: "EDGE-R2",
      name: "Secondary Edge Router",
      type: "router",
      model: "Cisco 2911 ISR",
      role: "Core Transit & OSPF Backbone",
      ip: "10.20.255.5/30",
      protocol: "OSPFv2 Area 0 (RID 10.20.255.2)",
      interfaces: ["eth0: 198.51.100.6/30 (ISP)", "eth1: 10.20.255.2/30 (Peer R1)", "eth2: 10.20.255.13/30 (DSW1)", "eth3: 10.20.255.17/30 (DSW2)"],
      status: "nominal"
    }
  },

  // --- TIER 2: Distribution MLS Layer (Inter-VLAN Routing & VRRP) ---
  {
    id: "DSW1",
    type: "networkNode",
    position: { x: 650, y: 440 },
    data: {
      id: "DSW1",
      name: "Distribution MLS 1",
      type: "dsw",
      model: "Cisco 3560-24PS",
      role: "VRRP Master (VLAN 10,30,50,70)",
      ip: "10.20.10.2/26",
      protocol: "VRRP Prio 110 | STP: 4096",
      interfaces: ["vlan10: 10.20.10.2/26", "vlan20: 10.20.10.66/26", "vlan30: 10.20.10.130/26", "vlan40: 10.20.10.194/27"],
      status: "nominal"
    }
  },
  {
    id: "DSW2",
    type: "networkNode",
    position: { x: 1550, y: 440 },
    data: {
      id: "DSW2",
      name: "Distribution MLS 2",
      type: "dsw",
      model: "Cisco 3560-24PS",
      role: "VRRP Master (VLAN 20,40,60,80)",
      ip: "10.20.10.3/26",
      protocol: "VRRP Prio 110 | STP: 8192",
      interfaces: ["vlan10: 10.20.10.3/26", "vlan20: 10.20.10.67/26", "vlan30: 10.20.10.131/26", "vlan40: 10.20.10.195/27"],
      status: "nominal"
    }
  },

  // --- TIER 3: Access Switching Layer (10 Open vSwitch Bridges) ---
  {
    id: "ASW-LA-1",
    type: "networkNode",
    position: { x: 80, y: 680 },
    data: {
      id: "ASW-LA-1",
      name: "Lab A Access 1",
      type: "asw",
      model: "Cisco 2960 / OVS",
      role: "Lab A Student Cluster",
      vlan: 10,
      ip: "10.20.10.10/26",
      protocol: "802.1w RSTP Root Cost 4",
      interfaces: ["Gi0/1 (DSW1 Trunk)", "Gi0/2 (DSW2 Trunk)", "Fa0/1-24 (Access)"],
      status: "nominal"
    }
  },
  {
    id: "ASW-LA-2",
    type: "networkNode",
    position: { x: 300, y: 680 },
    data: {
      id: "ASW-LA-2",
      name: "Lab A Access 2",
      type: "asw",
      model: "Cisco 2960 / OVS",
      role: "Lab A Student Cluster",
      vlan: 10,
      ip: "10.20.10.11/26",
      protocol: "802.1w RSTP Alternate",
      interfaces: ["Gi0/1 (DSW1 Trunk)", "Gi0/2 (DSW2 Trunk)", "Fa0/1-24 (Access)"],
      status: "nominal"
    }
  },
  {
    id: "ASW-LB-1",
    type: "networkNode",
    position: { x: 520, y: 680 },
    data: {
      id: "ASW-LB-1",
      name: "Lab B Access 1",
      type: "asw",
      model: "Cisco 2960 / OVS",
      role: "Lab B Student Cluster",
      vlan: 20,
      ip: "10.20.10.74/26",
      protocol: "802.1w RSTP Root Cost 4",
      interfaces: ["Gi0/1 (DSW1 Trunk)", "Gi0/2 (DSW2 Trunk)", "Fa0/1-24 (Access)"],
      status: "nominal"
    }
  },
  {
    id: "ASW-LB-2",
    type: "networkNode",
    position: { x: 740, y: 680 },
    data: {
      id: "ASW-LB-2",
      name: "Lab B Access 2",
      type: "asw",
      model: "Cisco 2960 / OVS",
      role: "Lab B Student Cluster",
      vlan: 20,
      ip: "10.20.10.75/26",
      protocol: "802.1w RSTP Alternate",
      interfaces: ["Gi0/1 (DSW1 Trunk)", "Gi0/2 (DSW2 Trunk)", "Fa0/1-24 (Access)"],
      status: "nominal"
    }
  },
  {
    id: "ASW-LC-1",
    type: "networkNode",
    position: { x: 960, y: 680 },
    data: {
      id: "ASW-LC-1",
      name: "Lab C Access 1",
      type: "asw",
      model: "Cisco 2960 / OVS",
      role: "Lab C Student Cluster",
      vlan: 30,
      ip: "10.20.10.138/26",
      protocol: "802.1w RSTP Root Cost 4",
      interfaces: ["Gi0/1 (DSW1 Trunk)", "Gi0/2 (DSW2 Trunk)", "Fa0/1-24 (Access)"],
      status: "nominal"
    }
  },
  {
    id: "ASW-LC-2",
    type: "networkNode",
    position: { x: 1180, y: 680 },
    data: {
      id: "ASW-LC-2",
      name: "Lab C Access 2",
      type: "asw",
      model: "Cisco 2960 / OVS",
      role: "Lab C Student Cluster",
      vlan: 30,
      ip: "10.20.10.139/26",
      protocol: "802.1w RSTP Alternate",
      interfaces: ["Gi0/1 (DSW1 Trunk)", "Gi0/2 (DSW2 Trunk)", "Fa0/1-24 (Access)"],
      status: "nominal"
    }
  },
  {
    id: "ASW-SRV-1",
    type: "networkNode",
    position: { x: 1420, y: 680 },
    data: {
      id: "ASW-SRV-1",
      name: "Server Switch 1",
      type: "asw",
      model: "Cisco 2960 / OVS",
      role: "Data Center Server Farm",
      vlan: 40,
      ip: "10.20.10.196/27",
      protocol: "802.1w RSTP Root Cost 4",
      interfaces: ["Gi0/1 (DSW1 Trunk)", "Gi0/2 (DSW2 Trunk)", "Fa0/1-4 (Server Drops)"],
      status: "nominal"
    }
  },
  {
    id: "ASW-SRV-2",
    type: "networkNode",
    position: { x: 1660, y: 680 },
    data: {
      id: "ASW-SRV-2",
      name: "Server Switch 2",
      type: "asw",
      model: "Cisco 2960 / OVS",
      role: "Data Center Server Farm",
      vlan: 40,
      ip: "10.20.10.197/27",
      protocol: "802.1w RSTP Alternate",
      interfaces: ["Gi0/1 (DSW1 Trunk)", "Gi0/2 (DSW2 Trunk)", "Fa0/1-4 (Server Drops)"],
      status: "nominal"
    }
  },
  {
    id: "ASW-ADM-1",
    type: "networkNode",
    position: { x: 1900, y: 680 },
    data: {
      id: "ASW-ADM-1",
      name: "Admin / Faculty 1",
      type: "asw",
      model: "Cisco 2960 / OVS",
      role: "Administrative VLAN 50/60",
      vlan: 50,
      ip: "10.20.10.228/27",
      protocol: "802.1w RSTP Active",
      interfaces: ["Gi0/1 (DSW1 Trunk)", "Gi0/2 (DSW2 Trunk)", "Fa0/1-8 (Admin Ports)"],
      status: "nominal"
    }
  },
  {
    id: "ASW-ADM-2",
    type: "networkNode",
    position: { x: 2120, y: 680 },
    data: {
      id: "ASW-ADM-2",
      name: "Mgmt / Guest 2",
      type: "asw",
      model: "Cisco 2960 / OVS",
      role: "NOC Mgmt VLAN 70/80",
      vlan: 70,
      ip: "10.20.11.36/28",
      protocol: "802.1w RSTP Active",
      interfaces: ["Gi0/1 (DSW1 Trunk)", "Gi0/2 (DSW2 Trunk)", "Fa0/1-8 (Mgmt Ports)"],
      status: "nominal"
    }
  },

  // --- TIER 4: Servers and Workstation Endpoints ---
  // Student PCs
  {
    id: "PC-LA-1",
    type: "networkNode",
    position: { x: 80, y: 920 },
    data: {
      id: "PC-LA-1",
      name: "Student Client LA-01",
      type: "endpoint",
      model: "Candidate Workstation",
      role: "Exam Seat Lab A-01",
      vlan: 10,
      ip: "10.20.10.15/26 (DHCP)",
      gateway: "10.20.10.1",
      status: "nominal"
    }
  },
  {
    id: "PC-LA-2",
    type: "networkNode",
    position: { x: 300, y: 920 },
    data: {
      id: "PC-LA-2",
      name: "Student Client LA-02",
      type: "endpoint",
      model: "Candidate Workstation",
      role: "Exam Seat Lab A-02",
      vlan: 10,
      ip: "10.20.10.16/26 (DHCP)",
      gateway: "10.20.10.1",
      status: "nominal"
    }
  },
  {
    id: "PC-LB-1",
    type: "networkNode",
    position: { x: 520, y: 920 },
    data: {
      id: "PC-LB-1",
      name: "Student Client LB-01",
      type: "endpoint",
      model: "Candidate Workstation",
      role: "Exam Seat Lab B-01",
      vlan: 20,
      ip: "10.20.10.80/26 (DHCP)",
      gateway: "10.20.10.65",
      status: "nominal"
    }
  },
  {
    id: "PC-LB-2",
    type: "networkNode",
    position: { x: 740, y: 920 },
    data: {
      id: "PC-LB-2",
      name: "Student Client LB-02",
      type: "endpoint",
      model: "Candidate Workstation",
      role: "Exam Seat Lab B-02",
      vlan: 20,
      ip: "10.20.10.81/26 (DHCP)",
      gateway: "10.20.10.65",
      status: "nominal"
    }
  },
  {
    id: "PC-LC-1",
    type: "networkNode",
    position: { x: 960, y: 920 },
    data: {
      id: "PC-LC-1",
      name: "Student Client LC-01",
      type: "endpoint",
      model: "Candidate Workstation",
      role: "Exam Seat Lab C-01",
      vlan: 30,
      ip: "10.20.10.145/26 (DHCP)",
      gateway: "10.20.10.129",
      status: "nominal"
    }
  },
  {
    id: "PC-LC-2",
    type: "networkNode",
    position: { x: 1180, y: 920 },
    data: {
      id: "PC-LC-2",
      name: "Student Client LC-02",
      type: "endpoint",
      model: "Candidate Workstation",
      role: "Exam Seat Lab C-02",
      vlan: 30,
      ip: "10.20.10.146/26 (DHCP)",
      gateway: "10.20.10.129",
      status: "nominal"
    }
  },

  // Servers
  {
    id: "EXAM-WEB-1",
    type: "networkNode",
    position: { x: 1360, y: 920 },
    data: {
      id: "EXAM-WEB-1",
      name: "Primary Web Portal",
      type: "server",
      model: "Linux Nginx HA",
      role: "Active Web Portal (VIP 10.20.10.210)",
      vlan: 40,
      ip: "10.20.10.200/27",
      protocol: "Keepalived Master (Prio 110)",
      gateway: "10.20.10.193",
      status: "nominal"
    }
  },
  {
    id: "EXAM-WEB-2",
    type: "networkNode",
    position: { x: 1530, y: 920 },
    data: {
      id: "EXAM-WEB-2",
      name: "Standby Web Portal",
      type: "server",
      model: "Linux Nginx HA",
      role: "Standby Web Portal (VIP 10.20.10.210)",
      vlan: 40,
      ip: "10.20.10.201/27",
      protocol: "Keepalived Standby (Prio 90)",
      gateway: "10.20.10.193",
      status: "nominal"
    }
  },
  {
    id: "DHCP-DNS-1",
    type: "networkNode",
    position: { x: 1690, y: 920 },
    data: {
      id: "DHCP-DNS-1",
      name: "Primary DHCP & DNS",
      type: "server",
      model: "ISC-DHCP + BIND9",
      role: "DNS & Relay Pool A (10.20.10.10)",
      vlan: 40,
      ip: "10.20.10.202/27",
      protocol: "Port 53 DNS / 67 DHCP",
      gateway: "10.20.10.193",
      status: "nominal"
    }
  },
  {
    id: "DHCP-DNS-2",
    type: "networkNode",
    position: { x: 1850, y: 920 },
    data: {
      id: "DHCP-DNS-2",
      name: "Secondary DHCP & DNS",
      type: "server",
      model: "ISC-DHCP + BIND9",
      role: "DNS & Relay Pool B (10.20.10.35)",
      vlan: 40,
      ip: "10.20.10.203/27",
      protocol: "Port 53 DNS / 67 DHCP",
      gateway: "10.20.10.193",
      status: "nominal"
    }
  },
  {
    id: "NET-MON",
    type: "networkNode",
    position: { x: 1500, y: 1060 },
    data: {
      id: "NET-MON",
      name: "Syslog & Monitoring",
      type: "server",
      model: "SNMPv3 / Syslog",
      role: "Central Packet Log Server",
      vlan: 40,
      ip: "10.20.10.204/27",
      gateway: "10.20.10.193",
      status: "nominal"
    }
  },

  // Admin & Management Endpoints
  {
    id: "PC-ADM-1",
    type: "networkNode",
    position: { x: 1980, y: 920 },
    data: {
      id: "PC-ADM-1",
      name: "Admin Console 01",
      type: "endpoint",
      model: "Administrator Workstation",
      role: "Exam Controller Station",
      vlan: 50,
      ip: "10.20.10.235/27",
      gateway: "10.20.10.225",
      status: "nominal"
    }
  },
  {
    id: "PC-FAC-1",
    type: "networkNode",
    position: { x: 2130, y: 920 },
    data: {
      id: "PC-FAC-1",
      name: "Faculty Station 01",
      type: "endpoint",
      model: "Faculty Workstation",
      role: "Exam Invigilator Station",
      vlan: 60,
      ip: "10.20.11.15/27",
      gateway: "10.20.11.1",
      status: "nominal"
    }
  },
  {
    id: "PC-MGMT-1",
    type: "networkNode",
    position: { x: 2030, y: 1060 },
    data: {
      id: "PC-MGMT-1",
      name: "NOC Console 01",
      type: "endpoint",
      model: "Network Engineer PC",
      role: "Out-of-Band NOC Terminal",
      vlan: 70,
      ip: "10.20.11.45/28",
      gateway: "10.20.11.33",
      status: "nominal"
    }
  },
  {
    id: "PC-GST-1",
    type: "networkNode",
    position: { x: 2180, y: 1060 },
    data: {
      id: "PC-GST-1",
      name: "Guest Terminal 01",
      type: "endpoint",
      model: "Guest Laptop",
      role: "Isolated Internet-Only Zone",
      vlan: 80,
      ip: "10.20.11.75/28",
      gateway: "10.20.11.65",
      status: "nominal"
    }
  }
];

// --- Complete 44 Redundant Links Definition ---
const initialEdges: Edge[] = [
  // WAN Links
  { id: "e-isp-r1", source: "ISP1", target: "EDGE-R1", style: { stroke: "#94a3b8", strokeWidth: 1.5, strokeDasharray: "4 4" }, animated: true },
  { id: "e-isp-r2", source: "ISP1", target: "EDGE-R2", style: { stroke: "#94a3b8", strokeWidth: 1.5, strokeDasharray: "4 4" }, animated: true },
  { id: "e-isp-srv", source: "ISP1", target: "TEST-SERVER", style: { stroke: "#cbd5e1", strokeWidth: 1.5 } },

  // Core Routing Mesh (OSPFv2 Area 0)
  { id: "e-r1-r2", source: "EDGE-R1", target: "EDGE-R2", style: { stroke: "#2563eb", strokeWidth: 2.5 }, label: "OSPF Area 0 /30" },
  { id: "e-r1-dsw1", source: "EDGE-R1", target: "DSW1", style: { stroke: "#2563eb", strokeWidth: 2.5 } },
  { id: "e-r1-dsw2", source: "EDGE-R1", target: "DSW2", style: { stroke: "#60a5fa", strokeWidth: 1.8 } },
  { id: "e-r2-dsw1", source: "EDGE-R2", target: "DSW1", style: { stroke: "#60a5fa", strokeWidth: 1.8 } },
  { id: "e-r2-dsw2", source: "EDGE-R2", target: "DSW2", style: { stroke: "#2563eb", strokeWidth: 2.5 } },

  // Distribution MLS Inter-Chassis Link (VRRP Heartbeat & RSTP)
  { id: "e-dsw1-dsw2", source: "DSW1", target: "DSW2", style: { stroke: "#d97706", strokeWidth: 2.5 }, label: "VRRP Heartbeat /30" },

  // Redundant Dual Trunks from DSW1 & DSW2 to all 10 Access Switches
  { id: "e-dsw1-asw-la1", source: "DSW1", target: "ASW-LA-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
  { id: "e-dsw2-asw-la1", source: "DSW2", target: "ASW-LA-1", style: { stroke: "#cbd5e1", strokeWidth: 1.2, strokeDasharray: "3 3" } },

  { id: "e-dsw1-asw-la2", source: "DSW1", target: "ASW-LA-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
  { id: "e-dsw2-asw-la2", source: "DSW2", target: "ASW-LA-2", style: { stroke: "#cbd5e1", strokeWidth: 1.2, strokeDasharray: "3 3" } },

  { id: "e-dsw1-asw-lb1", source: "DSW1", target: "ASW-LB-1", style: { stroke: "#cbd5e1", strokeWidth: 1.2, strokeDasharray: "3 3" } },
  { id: "e-dsw2-asw-lb1", source: "DSW2", target: "ASW-LB-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },

  { id: "e-dsw1-asw-lb2", source: "DSW1", target: "ASW-LB-2", style: { stroke: "#cbd5e1", strokeWidth: 1.2, strokeDasharray: "3 3" } },
  { id: "e-dsw2-asw-lb2", source: "DSW2", target: "ASW-LB-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },

  { id: "e-dsw1-asw-lc1", source: "DSW1", target: "ASW-LC-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
  { id: "e-dsw2-asw-lc1", source: "DSW2", target: "ASW-LC-1", style: { stroke: "#cbd5e1", strokeWidth: 1.2, strokeDasharray: "3 3" } },

  { id: "e-dsw1-asw-lc2", source: "DSW1", target: "ASW-LC-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
  { id: "e-dsw2-asw-lc2", source: "DSW2", target: "ASW-LC-2", style: { stroke: "#cbd5e1", strokeWidth: 1.2, strokeDasharray: "3 3" } },

  { id: "e-dsw1-asw-srv1", source: "DSW1", target: "ASW-SRV-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
  { id: "e-dsw2-asw-srv1", source: "DSW2", target: "ASW-SRV-1", style: { stroke: "#cbd5e1", strokeWidth: 1.2, strokeDasharray: "3 3" } },

  { id: "e-dsw1-asw-srv2", source: "DSW1", target: "ASW-SRV-2", style: { stroke: "#cbd5e1", strokeWidth: 1.2, strokeDasharray: "3 3" } },
  { id: "e-dsw2-asw-srv2", source: "DSW2", target: "ASW-SRV-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },

  { id: "e-dsw1-asw-adm1", source: "DSW1", target: "ASW-ADM-1", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },
  { id: "e-dsw2-asw-adm1", source: "DSW2", target: "ASW-ADM-1", style: { stroke: "#cbd5e1", strokeWidth: 1.2, strokeDasharray: "3 3" } },

  { id: "e-dsw1-asw-adm2", source: "DSW1", target: "ASW-ADM-2", style: { stroke: "#cbd5e1", strokeWidth: 1.2, strokeDasharray: "3 3" } },
  { id: "e-dsw2-asw-adm2", source: "DSW2", target: "ASW-ADM-2", style: { stroke: "#94a3b8", strokeWidth: 1.5 } },

  // Drops to Endpoints & Servers
  { id: "e-aswla1-pcla1", source: "ASW-LA-1", target: "PC-LA-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
  { id: "e-aswla2-pcla2", source: "ASW-LA-2", target: "PC-LA-2", style: { stroke: "#64748b", strokeWidth: 1.5 } },
  { id: "e-aswlb1-pclb1", source: "ASW-LB-1", target: "PC-LB-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
  { id: "e-aswlb2-pclb2", source: "ASW-LB-2", target: "PC-LB-2", style: { stroke: "#64748b", strokeWidth: 1.5 } },
  { id: "e-aswlc1-pclc1", source: "ASW-LC-1", target: "PC-LC-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
  { id: "e-aswlc2-pclc2", source: "ASW-LC-2", target: "PC-LC-2", style: { stroke: "#64748b", strokeWidth: 1.5 } },

  // Server cluster drops (Purple)
  { id: "e-aswsrv1-web1", source: "ASW-SRV-1", target: "EXAM-WEB-1", style: { stroke: "#9333ea", strokeWidth: 2 } },
  { id: "e-aswsrv2-web2", source: "ASW-SRV-2", target: "EXAM-WEB-2", style: { stroke: "#9333ea", strokeWidth: 2 } },
  { id: "e-aswsrv1-dhcp1", source: "ASW-SRV-1", target: "DHCP-DNS-1", style: { stroke: "#9333ea", strokeWidth: 1.8 } },
  { id: "e-aswsrv2-dhcp2", source: "ASW-SRV-2", target: "DHCP-DNS-2", style: { stroke: "#9333ea", strokeWidth: 1.8 } },
  { id: "e-aswsrv1-netmon", source: "ASW-SRV-1", target: "NET-MON", style: { stroke: "#9333ea", strokeWidth: 1.5 } },

  // Admin & Mgmt drops
  { id: "e-aswadm1-adm1", source: "ASW-ADM-1", target: "PC-ADM-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
  { id: "e-aswadm1-fac1", source: "ASW-ADM-1", target: "PC-FAC-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
  { id: "e-aswadm2-mgmt1", source: "ASW-ADM-2", target: "PC-MGMT-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
  { id: "e-aswadm2-gst1", source: "ASW-ADM-2", target: "PC-GST-1", style: { stroke: "#64748b", strokeWidth: 1.5 } },
];

// --- Internal Flow Graph Inner Component ---
function TopologyGraph({
  onSelectDevice,
  isFullscreen,
  setIsFullscreen
}: {
  onSelectDevice?: (id: string) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fn: (prev: boolean) => boolean) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const { fitView, setCenter } = useReactFlow();
  const { zoom } = useViewport();

  // Initial fit-to-view on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.15, duration: 600 });
    }, 150);
    return () => clearTimeout(timer);
  }, [fitView]);

  // Synchronize selection state with node badges
  const handleSelectNode = useCallback((id: string) => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isSelected: n.id === id,
        },
      }))
    );
    if (onSelectDevice) onSelectDevice(id);
  }, [onSelectDevice, setNodes]);

  // Preset Focus Controls
  const focusAll = () => fitView({ padding: 0.15, duration: 800 });
  const focusCore = () => setCenter(1100, 320, { zoom: 1.1, duration: 800 });
  const focusLabs = () => setCenter(650, 800, { zoom: 0.95, duration: 800 });
  const focusServers = () => setCenter(1600, 850, { zoom: 1.1, duration: 800 });
  const focusAdmin = () => setCenter(2050, 880, { zoom: 1.05, duration: 800 });

  // Get current LOD label
  const lodText = useMemo(() => {
    if (zoom < 0.65) return "Overview (LOD 0)";
    if (zoom < 1.15) return "Standard (LOD 1)";
    return "Deep Diagnostic (LOD 2)";
  }, [zoom]);

  return (
    <div className={`relative w-full ${isFullscreen ? "h-screen" : "h-[640px]"} bg-slate-50/60 rounded-lg overflow-hidden border border-slate-200 select-none flex flex-col`}>
      
      {/* Top Presentation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-slate-200 z-10">
        
        {/* Left: Title & Live Zoom/LOD status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-800">Campus Fabric Topology</span>
          </div>
          <span className="hidden sm:inline text-slate-300">|</span>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
              Zoom: {Math.round(zoom * 100)}%
            </span>
            <span className="hidden md:inline px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-sans">
              {lodText}
            </span>
          </div>
        </div>

        {/* Center: Camera Presets */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="hidden xl:inline text-[11px] text-slate-400 mr-1">Focus:</span>
          <button
            onClick={focusAll}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition text-[11px]"
            title="Fit entire campus network"
          >
            All Fabric
          </button>
          <button
            onClick={focusCore}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition text-[11px]"
            title="Focus on Core Routers & DSW MLS"
          >
            Core & MLS
          </button>
          <button
            onClick={focusLabs}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition text-[11px]"
            title="Focus on Labs A, B, and C"
          >
            Student Labs
          </button>
          <button
            onClick={focusServers}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition text-[11px]"
            title="Focus on Web, DNS, DHCP servers"
          >
            Server Farm
          </button>
          <button
            onClick={focusAdmin}
            className="hidden sm:inline px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition text-[11px]"
            title="Focus on Admin and Management"
          >
            Admin & Mgmt
          </button>
        </div>

        {/* Right: Fullscreen Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-xs font-medium text-slate-700 shadow-sm transition"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Main Interactive React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => handleSelectNode(node.id)}
          minZoom={0.25}
          maxZoom={2.2}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          snapToGrid={false}
        >
          {/* Subtle Enterprise Grid Background */}
          <Background color="#cbd5e1" gap={24} size={1} />
          
          {/* On-screen Controls */}
          <Controls showInteractive={false} position="bottom-right" className="!bg-white !border-slate-300" />
          
          {/* Architecture MiniMap */}
          <MiniMap
            position="bottom-left"
            className="!border !border-slate-200 !bg-white/95 !rounded-lg !shadow-sm"
            nodeColor={(node) => {
              switch ((node.data as NetworkDeviceData).type) {
                case "router": return "#2563eb";
                case "dsw": return "#d97706";
                case "asw": return "#64748b";
                case "server": return "#9333ea";
                case "endpoint": return "#10b981";
                default: return "#94a3b8";
              }
            }}
            maskColor="rgba(241, 245, 249, 0.7)"
          />
        </ReactFlow>
      </div>

      {/* Bottom Technical Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-white/90 backdrop-blur-sm border-t border-slate-200 text-[11px] text-slate-500 z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Core Routers (OSPF Area 0)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600" /> Distribution MLS (VRRP/HSRP)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" /> Access Switches (802.1w RSTP)
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-600" /> Cluster Servers (VIP: 10.20.10.210)
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          Scroll to zoom &bull; Click to inspect device telemetry
        </div>
      </div>

    </div>
  );
}

// --- Main Export with ReactFlowProvider & Fullscreen Modal Wrapper ---
export default function TopologyView({ onSelectDevice }: { onSelectDevice?: (id: string) => void }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close fullscreen on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm p-4 flex flex-col">
        <ReactFlowProvider>
          <TopologyGraph
            onSelectDevice={onSelectDevice}
            isFullscreen={true}
            setIsFullscreen={setIsFullscreen}
          />
        </ReactFlowProvider>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <TopologyGraph
        onSelectDevice={onSelectDevice}
        isFullscreen={false}
        setIsFullscreen={setIsFullscreen}
      />
    </ReactFlowProvider>
  );
}
