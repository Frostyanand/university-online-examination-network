"use client";

import { useState } from "react";
import { 
  Binary, Calculator, CheckCircle2, AlertCircle, 
  ArrowRight, Layers, Table as TableIcon 
} from "lucide-react";

export default function AddressingPage() {
  const [calcIp, setCalcIp] = useState("10.20.10.0");
  const [calcPrefix, setCalcPrefix] = useState(24);
  const [viewMode, setViewMode] = useState<"vlsm" | "matrix" | "calculator">("vlsm");

  const calculateSubnet = (ipStr: string, prefix: number) => {
    try {
      const parts = ipStr.split(".").map(Number);
      if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        return null;
      }
      const ipNum = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      const netNum = (ipNum & mask) >>> 0;
      const bcastNum = (netNum | (~mask >>> 0)) >>> 0;

      const numToIp = (num: number) => [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255
      ].join(".");

      const totalHosts = Math.pow(2, 32 - prefix);
      const usableHosts = prefix >= 31 ? (prefix === 31 ? 2 : 1) : Math.max(0, totalHosts - 2);

      return {
        network: numToIp(netNum),
        broadcast: numToIp(bcastNum),
        firstUsable: numToIp(netNum + 1),
        lastUsable: numToIp(bcastNum - 1),
        netmask: numToIp(mask),
        wildcard: numToIp((~mask >>> 0)),
        totalHosts,
        usableHosts
      };
    } catch {
      return null;
    }
  };

  const calcResult = calculateSubnet(calcIp, calcPrefix);

  const authoritativeVlans = [
    { vlan: 10, name: "VLAN_EXAM_SRV", subnet: "10.20.10.0/24", vip: "10.20.10.1", dsw1: "10.20.10.2", dsw2: "10.20.10.3", pool: "10.20.10.100 - .200", hosts: 254, needed: 15, role: "Primary & Secondary Exam Servers" },
    { vlan: 20, name: "VLAN_LAB_A", subnet: "10.20.20.0/23", vip: "10.20.20.1", dsw1: "10.20.20.2", dsw2: "10.20.20.3", pool: "10.20.20.10 - 10.20.21.250", hosts: 510, needed: 380, role: "Exam Hall A (Large Capacity)" },
    { vlan: 30, name: "VLAN_LAB_B", subnet: "10.20.30.0/24", vip: "10.20.30.1", dsw1: "10.20.30.2", dsw2: "10.20.30.3", pool: "10.20.30.10 - .250", hosts: 254, needed: 190, role: "Exam Hall B (Standard Lab)" },
    { vlan: 40, name: "VLAN_LAB_C", subnet: "10.20.40.0/24", vip: "10.20.40.1", dsw1: "10.20.40.2", dsw2: "10.20.40.3", pool: "10.20.40.10 - .250", hosts: 254, needed: 190, role: "Exam Hall C (Standard Lab)" },
    { vlan: 50, name: "VLAN_FACULTY", subnet: "10.20.50.0/24", vip: "10.20.50.1", dsw1: "10.20.50.2", dsw2: "10.20.50.3", pool: "10.20.50.10 - .250", hosts: 254, needed: 60, role: "Faculty / Invigilator Laptops" },
    { vlan: 60, name: "VLAN_ADMIN", subnet: "10.20.60.0/24", vip: "10.20.60.1", dsw1: "10.20.60.2", dsw2: "10.20.60.3", pool: "10.20.60.10 - .250", hosts: 254, needed: 45, role: "Examination Controller Office" },
    { vlan: 70, name: "VLAN_MGMT", subnet: "10.20.70.0/24", vip: "10.20.70.1", dsw1: "10.20.70.2", dsw2: "10.20.70.3", pool: "Static / Reserved", hosts: 254, needed: 25, role: "Network OOB Management" },
    { vlan: 80, name: "VLAN_GUEST", subnet: "10.20.80.0/24", vip: "10.20.80.1", dsw1: "10.20.80.2", dsw2: "10.20.80.3", pool: "10.20.80.10 - .250", hosts: 254, needed: 100, role: "Guest / External Monitors" }
  ];

  const transitLinks = [
    { link: "R-CORE-1 <-> R-CORE-2", subnet: "10.20.0.0/30", r1: "10.20.0.1", r2: "10.20.0.2", purpose: "Core Inter-Router Crosslink (OSPF Area 0)" },
    { link: "R-CORE-1 <-> DSW-1", subnet: "10.20.0.4/30", r1: "10.20.0.5", r2: "10.20.0.6", purpose: "Core 1 to Distribution 1 Primary Uplink" },
    { link: "R-CORE-1 <-> DSW-2", subnet: "10.20.0.8/30", r1: "10.20.0.9", r2: "10.20.0.10", purpose: "Core 1 to Distribution 2 Redundant Crosslink" },
    { link: "R-CORE-2 <-> DSW-1", subnet: "10.20.0.12/30", r1: "10.20.0.13", r2: "10.20.0.14", purpose: "Core 2 to Distribution 1 Redundant Crosslink" },
    { link: "R-CORE-2 <-> DSW-2", subnet: "10.20.0.16/30", r1: "10.20.0.17", r2: "10.20.0.18", purpose: "Core 2 to Distribution 2 Primary Uplink" },
    { link: "DSW-1 <-> DSW-2", subnet: "10.20.0.20/30", r1: "10.20.0.21", r2: "10.20.0.22", purpose: "Distribution Routed Inter-Chassis Link" }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title & View Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            IP Addressing & VLSM Architecture
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Hierarchical supernet allocation (10.20.0.0/16), VLSM vs FLSM efficiency audit, and CIDR subnet math.
          </p>
        </div>

        {/* View Switcher */}
        <div className="inline-flex rounded-md border border-border bg-white p-0.5 shadow-subtle text-xs">
          <button
            onClick={() => setViewMode("vlsm")}
            className={`px-3 py-1.5 rounded font-medium transition ${
              viewMode === "vlsm" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            VLSM Efficiency
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={`px-3 py-1.5 rounded font-medium transition ${
              viewMode === "matrix" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            Subnet Allocation Matrix
          </button>
          <button
            onClick={() => setViewMode("calculator")}
            className={`px-3 py-1.5 rounded font-medium transition ${
              viewMode === "calculator" ? "bg-brand text-white shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            Subnet Calculator
          </button>
        </div>
      </div>

      {/* VIEW 1: VLSM VS FLSM ANALYSIS */}
      {viewMode === "vlsm" && (
        <div className="space-y-6">
          
          {/* 3 Executive Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle">
              <div className="text-xs font-medium text-muted">VLSM Address Efficiency</div>
              <div className="text-2xl font-bold text-status-success mt-1">87.4% Utilized</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Right-sized subnets (/23 for 380 hosts in Lab A, /24 for Labs B/C, /30 for transit links) prevent over 4,000 wasted host addresses.
              </p>
            </div>

            <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle">
              <div className="text-xs font-medium text-muted">FLSM Hypothetical Waste</div>
              <div className="text-2xl font-bold text-status-danger mt-1">54.2% Waste</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Under fixed /24 masks, Lab A would be split across 2 subnets. Under fixed /23 masks, point-to-point links waste 510 IPs each.
              </p>
            </div>

            <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle">
              <div className="text-xs font-medium text-muted">Campus Supernet Scope</div>
              <div className="text-2xl font-bold text-foreground mt-1">10.20.0.0/16</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                65,536 total addresses reserved for university examination infrastructure, leaving 88% reserved for multi-year campus expansion.
              </p>
            </div>
          </div>

          {/* Structured Comparative Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-panel border border-status-successBorder rounded-lg p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2 text-status-success font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Variable-Length Subnet Masking (VLSM) &bull; Adopted
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Subnets are dynamically calculated based strictly on actual host populations plus a 30% expansion margin:
              </p>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 bg-panel-subtle rounded border border-border flex items-center justify-between">
                  <span>Lab A (380 Hosts): <strong>10.20.20.0/23</strong></span>
                  <span className="text-status-success font-sans">510 usable (74.5% util)</span>
                </div>
                <div className="p-2.5 bg-panel-subtle rounded border border-border flex items-center justify-between">
                  <span>Labs B & C (190 Hosts): <strong>10.20.30.0/24</strong></span>
                  <span className="text-status-success font-sans">254 usable (74.8% util)</span>
                </div>
                <div className="p-2.5 bg-panel-subtle rounded border border-border flex items-center justify-between">
                  <span>Servers & Admin: <strong>10.20.10.0/24</strong></span>
                  <span className="text-status-success font-sans">Dedicated broadcast domain</span>
                </div>
                <div className="p-2.5 bg-panel-subtle rounded border border-border flex items-center justify-between">
                  <span>Point-to-Point Links: <strong>10.20.0.x/30</strong></span>
                  <span className="text-status-success font-sans">2 usable (100% util)</span>
                </div>
              </div>
            </div>

            <div className="bg-panel border border-status-dangerBorder rounded-lg p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2 text-status-danger font-semibold text-sm">
                <AlertCircle className="w-4 h-4" />
                Fixed-Length Subnet Masking (FLSM) &bull; Rejected
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Why standard Fixed-Length Subnet Masking is technically unacceptable for this architecture:
              </p>
              <div className="space-y-2.5 text-xs text-muted">
                <div className="p-2.5 bg-panel-subtle rounded border border-border">
                  <span className="font-semibold text-foreground">Deficiency 1: Fixed /24 Everywhere</span>
                  <p className="mt-1">
                    Lab A requires 380 workstations. A /24 provides only 254 usable hosts. Lab A would be split across two separate VLANs, breaking local exam proctoring discovery.
                  </p>
                </div>
                <div className="p-2.5 bg-panel-subtle rounded border border-border">
                  <span className="font-semibold text-foreground">Deficiency 2: Fixed /23 Everywhere</span>
                  <p className="mt-1">
                    Accommodating Lab A with a fixed /23 across all segments forces 6 point-to-point router links to consume 512 addresses each, wasting 3,060 IP addresses on two-node links.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Clean Visual Allocation Bar */}
          <div className="bg-panel border border-border rounded-lg p-5 shadow-subtle space-y-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Supernet Address Partitioning (10.20.0.0/16)
            </h3>
            <div className="w-full h-7 rounded overflow-hidden flex font-mono text-[10px] font-semibold text-slate-800">
              <div style={{ width: "3%" }} className="bg-purple-300 flex items-center justify-center" title="Transit /30s">/30</div>
              <div style={{ width: "5%" }} className="bg-blue-300 flex items-center justify-center" title="Server Farm">SRV</div>
              <div style={{ width: "16%" }} className="bg-emerald-300 flex items-center justify-center" title="Exam Hall A (/23)">Lab A (/23)</div>
              <div style={{ width: "8%" }} className="bg-teal-300 flex items-center justify-center" title="Exam Hall B">Lab B</div>
              <div style={{ width: "8%" }} className="bg-cyan-300 flex items-center justify-center" title="Exam Hall C">Lab C</div>
              <div style={{ width: "12%" }} className="bg-amber-300 flex items-center justify-center" title="Staff & Admin">Staff</div>
              <div style={{ width: "48%" }} className="bg-slate-200 text-slate-600 flex items-center justify-center">
                Unallocated Future Growth (~58,000 Free Addresses)
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-purple-300 rounded-sm" /> Transit /30s</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-300 rounded-sm" /> Server Farm VIP</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-300 rounded-sm" /> Exam Hall A (/23)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-teal-300 rounded-sm" /> Exam Halls B & C</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-200 rounded-sm" /> Reserved Expansion</span>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: SUBENT MATRIX */}
      {viewMode === "matrix" && (
        <div className="space-y-6">
          
          {/* VLAN Matrix */}
          <div className="bg-panel border border-border rounded-lg shadow-subtle overflow-hidden">
            <div className="p-3.5 border-b border-border bg-panel-subtle flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                VLAN Logical Subnet Specifications
              </span>
              <span className="text-xs text-muted font-mono">Gateway Ownership: DSW-1 (Master) / DSW-2 (Backup)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-panel-subtle/60 text-muted uppercase font-mono text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">VLAN</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Subnet / CIDR</th>
                    <th className="p-3">Default VIP</th>
                    <th className="p-3">DSW-1 IP</th>
                    <th className="p-3">DSW-2 IP</th>
                    <th className="p-3">DHCP Scope</th>
                    <th className="p-3 text-right">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-foreground">
                  {authoritativeVlans.map((v) => (
                    <tr key={v.vlan} className="hover:bg-panel-subtle/50 transition">
                      <td className="p-3 font-bold text-brand">{v.vlan}</td>
                      <td className="p-3 font-sans font-medium">{v.name}</td>
                      <td className="p-3 font-semibold text-blue-900">{v.subnet}</td>
                      <td className="p-3 font-bold text-status-success">{v.vip}</td>
                      <td className="p-3 text-muted">{v.dsw1}</td>
                      <td className="p-3 text-muted">{v.dsw2}</td>
                      <td className="p-3 text-slate-700">{v.pool}</td>
                      <td className="p-3 text-right font-sans">
                        <span className="font-semibold text-foreground">{v.needed}</span> / {v.hosts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transit Links */}
          <div className="bg-panel border border-border rounded-lg shadow-subtle overflow-hidden">
            <div className="p-3.5 border-b border-border bg-panel-subtle flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Routed Point-to-Point Transit Links (OSPF Area 0)
              </span>
              <span className="text-xs text-status-success font-mono font-medium">Subnet Mask: 255.255.255.252 (/30)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-panel-subtle/60 text-muted uppercase font-mono text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">Segment</th>
                    <th className="p-3">Subnet</th>
                    <th className="p-3">Node 1 IP</th>
                    <th className="p-3">Node 2 IP</th>
                    <th className="p-3">Routing Protocol Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-foreground">
                  {transitLinks.map((t, idx) => (
                    <tr key={idx} className="hover:bg-panel-subtle/50 transition">
                      <td className="p-3 font-sans font-medium">{t.link}</td>
                      <td className="p-3 font-semibold text-blue-900">{t.subnet}</td>
                      <td className="p-3 text-brand">{t.r1}</td>
                      <td className="p-3 text-brand">{t.r2}</td>
                      <td className="p-3 font-sans text-muted">{t.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: SUBNET CALCULATOR */}
      {viewMode === "calculator" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-panel border border-border rounded-lg p-5 shadow-subtle space-y-4">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Subnet Parameter Input
            </h3>

            <div>
              <label className="text-xs text-muted block mb-1">Base IPv4 Address</label>
              <input
                type="text"
                value={calcIp}
                onChange={(e) => setCalcIp(e.target.value)}
                className="w-full bg-white border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-brand"
                placeholder="10.20.10.0"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-muted">CIDR Prefix Length: /{calcPrefix}</span>
                <span className="font-mono text-brand font-medium">
                  {calcResult ? calcResult.netmask : ""}
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="30"
                value={calcPrefix}
                onChange={(e) => setCalcPrefix(Number(e.target.value))}
                className="w-full accent-brand"
              />
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-xs text-muted mb-2 font-medium">Preset Architecture Blocks:</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  onClick={() => { setCalcIp("10.20.20.0"); setCalcPrefix(23); }}
                  className="px-2 py-1.5 rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-left"
                >
                  Lab A (/23)
                </button>
                <button
                  onClick={() => { setCalcIp("10.20.10.0"); setCalcPrefix(24); }}
                  className="px-2 py-1.5 rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-left"
                >
                  Servers (/24)
                </button>
                <button
                  onClick={() => { setCalcIp("10.20.0.0"); setCalcPrefix(30); }}
                  className="px-2 py-1.5 rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-left"
                >
                  Transit (/30)
                </button>
                <button
                  onClick={() => { setCalcIp("10.20.0.0"); setCalcPrefix(16); }}
                  className="px-2 py-1.5 rounded bg-panel-subtle hover:bg-slate-200/60 border border-border text-left"
                >
                  Supernet (/16)
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-panel border border-border rounded-lg p-5 shadow-subtle space-y-4">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Calculated Subnet Attributes
            </h3>

            {calcResult ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-panel-subtle border border-border">
                  <div className="text-muted text-[11px]">Network Address</div>
                  <div className="text-base font-bold text-brand font-mono mt-0.5">{calcResult.network}</div>
                </div>
                <div className="p-3 rounded bg-panel-subtle border border-border">
                  <div className="text-muted text-[11px]">Broadcast Address</div>
                  <div className="text-base font-bold text-status-danger font-mono mt-0.5">{calcResult.broadcast}</div>
                </div>
                <div className="p-3 rounded bg-panel-subtle border border-border">
                  <div className="text-muted text-[11px]">Usable Host Range</div>
                  <div className="text-xs font-bold text-status-success font-mono mt-1">
                    {calcResult.firstUsable} &mdash; {calcResult.lastUsable}
                  </div>
                </div>
                <div className="p-3 rounded bg-panel-subtle border border-border">
                  <div className="text-muted text-[11px]">Usable Host Count</div>
                  <div className="text-base font-bold text-foreground font-mono mt-0.5">
                    {calcResult.usableHosts.toLocaleString()} Hosts
                  </div>
                </div>
                <div className="p-3 rounded bg-panel-subtle border border-border">
                  <div className="text-muted text-[11px]">Subnet Mask</div>
                  <div className="text-xs font-mono font-semibold text-foreground mt-1">{calcResult.netmask}</div>
                </div>
                <div className="p-3 rounded bg-panel-subtle border border-border">
                  <div className="text-muted text-[11px]">Wildcard Mask</div>
                  <div className="text-xs font-mono font-semibold text-foreground mt-1">{calcResult.wildcard}</div>
                </div>
              </div>
            ) : (
              <div className="text-status-danger text-xs py-8 text-center font-mono">
                Invalid IPv4 address format entered.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
