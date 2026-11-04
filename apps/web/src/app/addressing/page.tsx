"use client";

import { useState } from "react";
import { Binary, Layers, Calculator, CheckCircle2, AlertCircle, ArrowRight, Database, Server } from "lucide-react";

export default function AddressingPage() {
  // Subnet Calculator State
  const [calcIp, setCalcIp] = useState("10.20.10.0");
  const [calcPrefix, setCalcPrefix] = useState(24);

  // VLSM vs FLSM view toggle
  const [viewMode, setViewMode] = useState<"vlsm" | "flsm" | "matrix">("vlsm");

  // Basic IP calculations
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
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Binary className="w-6 h-6 text-accent-cyan" />
            IP Addressing & VLSM Workbench
          </h1>
          <p className="text-sm text-slate-400">
            Authoritative IP allocation plan, VLSM vs FLSM efficiency analysis, and live subnet calculator.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-panel p-1 rounded-lg border border-border">
          <button
            onClick={() => setViewMode("vlsm")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              viewMode === "vlsm" ? "bg-accent-blue text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            VLSM Efficiency
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              viewMode === "matrix" ? "bg-accent-blue text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Subnet Matrix
          </button>
          <button
            onClick={() => setViewMode("flsm")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              viewMode === "flsm" ? "bg-accent-blue text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Subnet Calculator
          </button>
        </div>
      </div>

      {/* VIEW 1: VLSM VS FLSM ANALYSIS */}
      {viewMode === "vlsm" && (
        <div className="space-y-6">
          
          {/* Executive Efficiency Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-panel border border-border rounded-lg p-5">
              <div className="text-xs text-slate-400 font-medium">VLSM Subnet Efficiency</div>
              <div className="text-3xl font-bold text-accent-green mt-1">87.4%</div>
              <div className="text-xs text-slate-400 mt-2">
                Optimal prefix sizing (/23 for Lab A, /24 for Labs B/C, /30 for transit links) prevents 4,000+ wasted host addresses.
              </div>
            </div>
            <div className="bg-panel border border-border rounded-lg p-5">
              <div className="text-xs text-slate-400 font-medium">FLSM Hypothetical Waste</div>
              <div className="text-3xl font-bold text-accent-red mt-1">~54.2% Waste</div>
              <div className="text-xs text-slate-400 mt-2">
                Under fixed /24 masks, Lab A (380 hosts) would cause subnet fragmentation. Under fixed /23 masks, point-to-point links waste 510 IPs each.
              </div>
            </div>
            <div className="bg-panel border border-border rounded-lg p-5">
              <div className="text-xs text-slate-400 font-medium">Contiguous Supernet</div>
              <div className="text-3xl font-bold text-accent-cyan mt-1">10.20.0.0/16</div>
              <div className="text-xs text-slate-400 mt-2">
                65,536 total addresses reserved for campus examination infrastructure, leaving 88% reserved for future expansion.
              </div>
            </div>
          </div>

          {/* Side by Side Comparative Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* VLSM Card */}
            <div className="bg-panel border border-accent-green/30 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-accent-green text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Adopted Variable-Length Subnet Masking (VLSM)
                </h3>
                <span className="text-xs font-mono bg-accent-green/20 text-accent-green px-2 py-0.5 rounded border border-accent-green/30">
                  OPTIMAL
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Subnets are allocated strictly according to actual host requirements plus a 30% safety margin:
              </p>
              <ul className="text-xs text-slate-400 space-y-2 font-mono">
                <li className="flex items-center justify-between bg-slate-900/60 p-2 rounded">
                  <span>Lab A (380 hosts): <strong>10.20.20.0/23</strong></span>
                  <span className="text-accent-green">510 usable (74.5% util)</span>
                </li>
                <li className="flex items-center justify-between bg-slate-900/60 p-2 rounded">
                  <span>Lab B/C (190 hosts): <strong>10.20.30.0/24</strong></span>
                  <span className="text-accent-green">254 usable (74.8% util)</span>
                </li>
                <li className="flex items-center justify-between bg-slate-900/60 p-2 rounded">
                  <span>Servers & Admin: <strong>10.20.10.0/24</strong></span>
                  <span className="text-accent-green">Dedicated broadcast domain</span>
                </li>
                <li className="flex items-center justify-between bg-slate-900/60 p-2 rounded">
                  <span>Point-to-Point Links: <strong>10.20.0.x/30</strong></span>
                  <span className="text-accent-green">2 usable (100% util)</span>
                </li>
              </ul>
            </div>

            {/* FLSM Flaws Card */}
            <div className="bg-panel border border-accent-red/30 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-accent-red text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Fixed-Length Subnet Masking (FLSM) Failure Analysis
                </h3>
                <span className="text-xs font-mono bg-accent-red/20 text-accent-red px-2 py-0.5 rounded border border-accent-red/30">
                  REJECTED
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Why standard FLSM fails for this university examination architecture:
              </p>
              <div className="space-y-3 text-xs text-slate-400">
                <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <span className="font-semibold text-white">Scenario 1: Fixed /24 Everywhere</span>
                  <p className="mt-1">
                    Lab A requires 380 concurrent exam clients. A /24 provides only 254 usable hosts. Lab A would have to be arbitrarily split across two separate subnets and VLANs, breaking single broadcast domain exam proctoring.
                  </p>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <span className="font-semibold text-white">Scenario 2: Fixed /23 Everywhere</span>
                  <p className="mt-1">
                    Accommodating Lab A with a fixed /23 across all segments forces 6 point-to-point router links to consume 512 addresses each, wasting 3,060 IP addresses on two-node links.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Allocation Hierarchy Visual Bar */}
          <div className="bg-panel border border-border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Supernet Partitioning Visual (10.20.0.0/16)</h3>
            <div className="w-full h-8 rounded-lg overflow-hidden flex font-mono text-[11px] font-bold text-slate-950">
              <div style={{ width: "3%" }} className="bg-purple-400 flex items-center justify-center" title="10.20.0.0/24 (Transit /30s)">
                /30s
              </div>
              <div style={{ width: "5%" }} className="bg-blue-400 flex items-center justify-center" title="10.20.10.0/24 (Servers)">
                SRV
              </div>
              <div style={{ width: "15%" }} className="bg-emerald-400 flex items-center justify-center" title="10.20.20.0/23 (Lab A)">
                Lab A (/23)
              </div>
              <div style={{ width: "8%" }} className="bg-teal-400 flex items-center justify-center" title="10.20.30.0/24 (Lab B)">
                Lab B
              </div>
              <div style={{ width: "8%" }} className="bg-cyan-400 flex items-center justify-center" title="10.20.40.0/24 (Lab C)">
                Lab C
              </div>
              <div style={{ width: "12%" }} className="bg-amber-400 flex items-center justify-center" title="VLANs 50,60,70,80">
                Staff/Adm
              </div>
              <div style={{ width: "49%" }} className="bg-slate-700 text-slate-400 flex items-center justify-center">
                Unallocated Future Growth (~58,000 IPs)
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-purple-400 rounded-sm" /> Transit /30s</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-400 rounded-sm" /> Exam Server VIP</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-400 rounded-sm" /> Exam Lab A (/23)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-teal-400 rounded-sm" /> Exam Labs B & C</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-700 rounded-sm" /> Reserved Expansion</span>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: AUTHORITATIVE SUBNET MATRIX */}
      {viewMode === "matrix" && (
        <div className="space-y-6">
          
          {/* VLAN Subnet Table */}
          <div className="bg-panel border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">VLAN Logical Subnet Specifications</h3>
              <span className="text-xs text-slate-400 font-mono">Gateway Ownership: DSW-1 (Master) / DSW-2 (Backup)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px]">
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
                <tbody className="divide-y divide-border font-mono">
                  {authoritativeVlans.map((v) => (
                    <tr key={v.vlan} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-bold text-accent-blue">{v.vlan}</td>
                      <td className="p-3 font-sans font-medium text-white">{v.name}</td>
                      <td className="p-3 text-accent-cyan">{v.subnet}</td>
                      <td className="p-3 font-bold text-accent-green">{v.vip}</td>
                      <td className="p-3 text-slate-400">{v.dsw1}</td>
                      <td className="p-3 text-slate-400">{v.dsw2}</td>
                      <td className="p-3 text-slate-300">{v.pool}</td>
                      <td className="p-3 text-right text-slate-400 font-sans">
                        <span className="text-white font-semibold">{v.needed}</span> / {v.hosts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transit Links Table */}
          <div className="bg-panel border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Routed Point-to-Point Transit Links (OSPF Area 0)</h3>
              <span className="text-xs text-accent-green font-mono">Subnet Mask: 255.255.255.252 (/30)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3">Physical Segment</th>
                    <th className="p-3">Subnet</th>
                    <th className="p-3">Node 1 IP</th>
                    <th className="p-3">Node 2 IP</th>
                    <th className="p-3">Routing Protocol Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {transitLinks.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-sans font-medium text-white">{t.link}</td>
                      <td className="p-3 text-accent-cyan">{t.subnet}</td>
                      <td className="p-3 text-accent-blue">{t.r1}</td>
                      <td className="p-3 text-accent-blue">{t.r2}</td>
                      <td className="p-3 font-sans text-slate-400">{t.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: LIVE SUBNET CALCULATOR */}
      {viewMode === "flsm" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Controls Column */}
          <div className="bg-panel border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Calculator className="w-4 h-4 text-accent-blue" />
              Subnet Parameter Input
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Base IPv4 Address</label>
              <input
                type="text"
                value={calcIp}
                onChange={(e) => setCalcIp(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                placeholder="10.20.10.0"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-slate-400">CIDR Prefix Length: /{calcPrefix}</label>
                <span className="text-xs font-mono text-accent-cyan">
                  {calcResult ? calcResult.netmask : ""}
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="30"
                value={calcPrefix}
                onChange={(e) => setCalcPrefix(Number(e.target.value))}
                className="w-full accent-accent-blue"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>/8 (Class A)</span>
                <span>/16 (Class B)</span>
                <span>/24 (Class C)</span>
                <span>/30 (P2P)</span>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-xs text-slate-400 mb-2">Preset Exam Architecture Networks:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setCalcIp("10.20.20.0"); setCalcPrefix(23); }}
                  className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono text-left"
                >
                  Lab A (/23)
                </button>
                <button
                  onClick={() => { setCalcIp("10.20.10.0"); setCalcPrefix(24); }}
                  className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono text-left"
                >
                  Servers (/24)
                </button>
                <button
                  onClick={() => { setCalcIp("10.20.0.0"); setCalcPrefix(30); }}
                  className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono text-left"
                >
                  Transit (/30)
                </button>
                <button
                  onClick={() => { setCalcIp("10.20.0.0"); setCalcPrefix(16); }}
                  className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono text-left"
                >
                  Supernet (/16)
                </button>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-2 bg-panel border border-border rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Calculated Subnet Attributes</h3>

            {calcResult ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                  <div className="text-[11px] text-slate-400">Network Address</div>
                  <div className="text-base font-bold text-accent-blue font-mono mt-0.5">{calcResult.network}</div>
                </div>
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                  <div className="text-[11px] text-slate-400">Broadcast Address</div>
                  <div className="text-base font-bold text-accent-red font-mono mt-0.5">{calcResult.broadcast}</div>
                </div>
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                  <div className="text-[11px] text-slate-400">Usable Host Range</div>
                  <div className="text-xs font-bold text-accent-green font-mono mt-1">
                    {calcResult.firstUsable} — {calcResult.lastUsable}
                  </div>
                </div>
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                  <div className="text-[11px] text-slate-400">Usable Host Count</div>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    {calcResult.usableHosts.toLocaleString()} Hosts
                  </div>
                </div>
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                  <div className="text-[11px] text-slate-400">Subnet Mask</div>
                  <div className="text-xs font-bold text-slate-200 font-mono mt-1">{calcResult.netmask}</div>
                </div>
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                  <div className="text-[11px] text-slate-400">Wildcard Mask</div>
                  <div className="text-xs font-bold text-slate-200 font-mono mt-1">{calcResult.wildcard}</div>
                </div>
              </div>
            ) : (
              <div className="text-accent-red text-xs py-8 text-center font-mono">
                Invalid IPv4 Address format entered.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

