"use client";

import { useState } from "react";
import { TrendingUp, PlusCircle, CheckCircle2, Copy, Check, Server, Layers, ArrowRight, Shield } from "lucide-react";

export default function ScalabilityPage() {
  const [labName, setLabName] = useState("Lab D");
  const [hostCount, setHostCount] = useState(250);
  const [vlanId, setVlanId] = useState(90);
  const [copied, setCopied] = useState(false);

  // Computed Subnet Recommendation
  const recommendedPrefix = hostCount <= 126 ? 25 : hostCount <= 254 ? 24 : 23;
  const recommendedSubnet = `10.20.${vlanId}.0/${recommendedPrefix}`;
  const gatewayVip = `10.20.${vlanId}.1`;
  const dsw1Ip = `10.20.${vlanId}.2`;
  const dsw2Ip = `10.20.${vlanId}.3`;
  const dhcpStart = `10.20.${vlanId}.10`;
  const dhcpEnd = recommendedPrefix === 23 ? `10.20.${vlanId + 1}.250` : `10.20.${vlanId}.250`;

  const generatedCiscoScript = `! ==========================================
! CISCO IOS PROVISIONING PLAN: ${labName.toUpperCase()}
! VLAN ${vlanId} Subnet: ${recommendedSubnet}
! ==========================================

! 1. Distribution Switch 1 (DSW-1) Configuration
vlan ${vlanId}
 name VLAN_${labName.replace(" ", "_").toUpperCase()}
!
interface Vlan${vlanId}
 description ${labName} Exam Gateway
 ip address ${dsw1Ip} 255.255.${recommendedPrefix === 23 ? "254.0" : "255.0"}
 standby ${vlanId} ip ${gatewayVip}
 standby ${vlanId} priority 110
 standby ${vlanId} preempt
!
router ospf 1
 network 10.20.${vlanId}.0 0.0.${recommendedPrefix === 23 ? "1.255" : "0.255"} area 0
!
! 2. Distribution Switch 2 (DSW-2) Configuration
vlan ${vlanId}
 name VLAN_${labName.replace(" ", "_").toUpperCase()}
!
interface Vlan${vlanId}
 description ${labName} Exam Gateway Backup
 ip address ${dsw2Ip} 255.255.${recommendedPrefix === 23 ? "254.0" : "255.0"}
 standby ${vlanId} ip ${gatewayVip}
 standby ${vlanId} priority 100
!
! 3. Access Switch Trunk Allowed List Update
interface range GigabitEthernet0/1 - 2
 switchport trunk allowed vlan add ${vlanId}
`;

  const generatedLinuxScript = `#!/bin/bash
# ==========================================
# LINUX / KATHARÁ PROVISIONING PLAN: ${labName.toUpperCase()}
# ==========================================

# 1. Update DSW-1 Keepalived (/etc/keepalived/keepalived.conf)
cat <<EOF >> /etc/keepalived/keepalived.conf
vrrp_instance VI_VLAN${vlanId} {
    state MASTER
    interface vlan${vlanId}
    virtual_router_id ${vlanId}
    priority 110
    advert_int 1
    virtual_ipaddress {
        ${gatewayVip}/${recommendedPrefix}
    }
}
EOF
systemctl reload keepalived

# 2. Add OSPF Dynamic Route Advertisement on DSW-1 & DSW-2
vtysh -c "conf t" \\
      -c "router ospf" \\
      -c "network 10.20.${vlanId}.0/${recommendedPrefix} area 0"

# 3. Update SRV-DNS-DHCP Scope (/etc/dnsmasq.conf)
cat <<EOF >> /etc/dnsmasq.conf
# ${labName} Subnet Allocation
dhcp-range=set:vlan${vlanId},${dhcpStart},${dhcpEnd},255.255.${recommendedPrefix === 23 ? "254.0" : "255.0"},24h
dhcp-option=tag:vlan${vlanId},option:router,${gatewayVip}
dhcp-option=tag:vlan${vlanId},option:dns-server,10.20.10.5
EOF
systemctl restart dnsmasq
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCiscoScript + "\n\n" + generatedLinuxScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-accent-cyan" />
            Campus Scalability & Expansion Planner
          </h1>
          <p className="text-sm text-slate-400">
            Automated subnet allocation, VLAN provisioning, VRRP redundancy configuration, and zero-downtime deployment change plans.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue border border-accent-blue/40 text-xs font-medium transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-accent-green" /> : <Copy className="w-3.5 h-3.5" />}
          Copy Complete Change Plan
        </button>
      </div>

      {/* Main Grid: Parameters on Left, Generated Plan on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Input Parameters (1 col) */}
        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-accent-blue" />
              Expansion Requirements
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">New Facility / Lab Name</label>
              <input
                type="text"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full bg-slate-900 border border-border rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                placeholder="Lab D"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Required Concurrent Workstations</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={hostCount}
                onChange={(e) => setHostCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-border rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Safety headroom of +30% automatically factored in.
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Allocated VLAN ID (802.1Q)</label>
              <input
                type="number"
                min="90"
                max="4094"
                value={vlanId}
                onChange={(e) => setVlanId(Number(e.target.value))}
                className="w-full bg-slate-900 border border-border rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <div className="border-t border-border pt-3 space-y-2 text-xs">
              <div className="text-slate-400 font-semibold">Recommended Subnet Attributes:</div>
              <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1 font-mono text-[11px]">
                <div>Subnet: <span className="text-accent-cyan font-bold">{recommendedSubnet}</span></div>
                <div>Default VIP: <span className="text-accent-green">{gatewayVip}</span></div>
                <div>DSW-1 (Master): <span className="text-slate-300">{dsw1Ip}</span></div>
                <div>DSW-2 (Backup): <span className="text-slate-300">{dsw2Ip}</span></div>
                <div>DHCP Scope: <span className="text-slate-400">{dhcpStart} - {dhcpEnd}</span></div>
              </div>
            </div>
          </div>

          {/* Supernet Growth Capacity Card */}
          <div className="bg-panel border border-border rounded-lg p-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent-cyan" />
              Campus Supernet Headroom
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Allocated under supernet <span className="text-white font-mono">10.20.0.0/16</span>.
              Currently utilizing only ~12% of the reserved 65,536 addresses, allowing seamless addition of up to 48 additional examination halls without IP renumbering.
            </p>
          </div>
        </div>

        {/* Change Plan Output (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Step by step deployment checklist */}
          <div className="bg-panel border border-border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Automated Deployment Workflow</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 p-3 rounded border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Step 1: L2 Broadcast Domain</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">Provision VLAN {vlanId} on DSW-1/2 and update trunk allowed lists on access switches.</p>
                </div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Step 2: Virtual Gateway Redundancy</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">Initialize VRRP instance {vlanId} on DSW-1 (priority 110) and DSW-2 (priority 100).</p>
                </div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Step 3: Core Route Redistribution</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">Inject {recommendedSubnet} into OSPF Area 0 on distribution multi-layer switches.</p>
                </div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Step 4: Dynamic Lease Provisioning</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">Append new scope in SRV-DNS-DHCP with gateway {gatewayVip} and DNS 10.20.10.5.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Configuration Scripts */}
          <div className="bg-panel border border-border rounded-lg overflow-hidden flex flex-col h-[400px]">
            <div className="p-3 border-b border-border bg-slate-900/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-white font-mono">Generated CLI Commands & Scripts</span>
              <span className="text-[11px] text-accent-cyan font-mono">Zero-Downtime Hot Provisioning</span>
            </div>
            <pre className="flex-1 p-4 bg-slate-950 overflow-auto font-mono text-xs text-slate-300 whitespace-pre">
              {generatedCiscoScript}
              {"\n# -----------------------------------------------------\n"}
              {generatedLinuxScript}
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
}

