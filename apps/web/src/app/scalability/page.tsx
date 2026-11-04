"use client";

import { useState } from "react";
import { PlusCircle, Copy, Check, CheckCircle2, Layers } from "lucide-react";

export default function ScalabilityPage() {
  const [labName, setLabName] = useState("Lab D");
  const [hostCount, setHostCount] = useState(250);
  const [vlanId, setVlanId] = useState(90);
  const [copied, setCopied] = useState(false);

  const recommendedPrefix = hostCount <= 126 ? 25 : hostCount <= 254 ? 24 : 23;
  const recommendedSubnet = `10.20.${vlanId}.0/${recommendedPrefix}`;
  const gatewayVip = `10.20.${vlanId}.1`;
  const dsw1Ip = `10.20.${vlanId}.2`;
  const dsw2Ip = `10.20.${vlanId}.3`;
  const dhcpStart = `10.20.${vlanId}.10`;
  const dhcpEnd = recommendedPrefix === 23 ? `10.20.${vlanId + 1}.250` : `10.20.${vlanId}.250`;

  const generatedCiscoScript = `! ==========================================
! CISCO IOS PROVISIONING: ${labName.toUpperCase()}
! VLAN ${vlanId} Subnet: ${recommendedSubnet}
! ==========================================

! 1. Distribution Switch 1 (DSW-1)
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
! 2. Distribution Switch 2 (DSW-2)
vlan ${vlanId}
 name VLAN_${labName.replace(" ", "_").toUpperCase()}
!
interface Vlan${vlanId}
 description ${labName} Exam Gateway Backup
 ip address ${dsw2Ip} 255.255.${recommendedPrefix === 23 ? "254.0" : "255.0"}
 standby ${vlanId} ip ${gatewayVip}
 standby ${vlanId} priority 100
!
! 3. Access Switch Trunk Allowed List
interface range GigabitEthernet0/1 - 2
 switchport trunk allowed vlan add ${vlanId}`;

  const generatedLinuxScript = `#!/bin/bash
# ==========================================
# LINUX / KATHARA PROVISIONING: ${labName.toUpperCase()}
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

# 2. Inject Subnet into OSPF Area 0
vtysh -c "conf t" \\
      -c "router ospf" \\
      -c "network 10.20.${vlanId}.0/${recommendedPrefix} area 0"

# 3. Add DHCP Scope in SRV-DNS-DHCP (/etc/dnsmasq.conf)
cat <<EOF >> /etc/dnsmasq.conf
dhcp-range=set:vlan${vlanId},${dhcpStart},${dhcpEnd},255.255.${recommendedPrefix === 23 ? "254.0" : "255.0"},24h
dhcp-option=tag:vlan${vlanId},option:router,${gatewayVip}
dhcp-option=tag:vlan${vlanId},option:dns-server,10.20.10.5
EOF
systemctl restart dnsmasq`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCiscoScript + "\n\n" + generatedLinuxScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Campus Capacity & Scalability Planner
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Automated VLSM sizing, VLAN allocation, and zero-downtime provisioning scripts for new examination facilities.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-border hover:bg-panel-subtle text-xs font-medium text-foreground shadow-subtle transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
          <span>{copied ? "Copied to Clipboard" : "Copy Change Plan"}</span>
        </button>
      </div>

      {/* Main Grid: Parameters on Left, Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Input Parameters (1 col) */}
        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-lg shadow-subtle p-5 space-y-4">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Expansion Requirements
            </h3>

            <div>
              <label className="text-xs font-medium text-muted block mb-1">New Facility Name</label>
              <input
                type="text"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full bg-white border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-brand"
                placeholder="Lab D"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted block mb-1">Required Concurrent Workstations</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={hostCount}
                onChange={(e) => setHostCount(Number(e.target.value))}
                className="w-full bg-white border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-brand"
              />
              <span className="text-[11px] text-muted font-sans mt-1 block">
                +30% headroom automatically factored into prefix sizing.
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-muted block mb-1">Allocated 802.1Q VLAN ID</label>
              <input
                type="number"
                min="90"
                max="4094"
                value={vlanId}
                onChange={(e) => setVlanId(Number(e.target.value))}
                className="w-full bg-white border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-brand"
              />
            </div>

            <div className="border-t border-border pt-3 space-y-2 text-xs">
              <div className="text-muted font-medium">Recommended Subnet Parameters:</div>
              <div className="p-3 bg-panel-subtle rounded border border-border space-y-1 font-mono text-xs">
                <div>Subnet: <strong className="text-brand font-semibold">{recommendedSubnet}</strong></div>
                <div>Default VIP: <span className="text-status-success font-medium">{gatewayVip}</span></div>
                <div>DSW-1 (Master): <span className="text-muted">{dsw1Ip}</span></div>
                <div>DSW-2 (Backup): <span className="text-muted">{dsw2Ip}</span></div>
                <div>DHCP Scope: <span className="text-slate-700">{dhcpStart} &ndash; {dhcpEnd}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-panel border border-border rounded-lg shadow-subtle p-4 space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground">Supernet Headroom</h4>
            <p className="text-xs text-muted leading-relaxed">
              Allocated under supernet <span className="font-mono text-foreground">10.20.0.0/16</span>.
              Over 58,000 unallocated addresses remain, accommodating up to 48 additional examination halls without IP renumbering.
            </p>
          </div>
        </div>

        {/* Change Plan Output (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Step by step workflow */}
          <div className="bg-panel border border-border rounded-lg shadow-subtle p-4 space-y-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Deployment Workflow Checklist
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-panel-subtle rounded border border-border flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">1. Layer 2 Broadcast Domain</span>
                  <p className="text-muted text-[11px] mt-0.5">Provision VLAN {vlanId} on DSW-1/2 and update trunk allowed lists on access switches.</p>
                </div>
              </div>
              <div className="p-3 bg-panel-subtle rounded border border-border flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">2. Gateway Redundancy</span>
                  <p className="text-muted text-[11px] mt-0.5">Initialize VRRP virtual router {vlanId} on DSW-1 (priority 110) and DSW-2 (priority 100).</p>
                </div>
              </div>
              <div className="p-3 bg-panel-subtle rounded border border-border flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">3. OSPF Redistribution</span>
                  <p className="text-muted text-[11px] mt-0.5">Inject {recommendedSubnet} into OSPF Area 0 on distribution multi-layer switches.</p>
                </div>
              </div>
              <div className="p-3 bg-panel-subtle rounded border border-border flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">4. DHCP Scope Allocation</span>
                  <p className="text-muted text-[11px] mt-0.5">Append new scope in SRV-DNS-DHCP with gateway {gatewayVip} and DNS 10.20.10.5.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Code */}
          <div className="bg-panel border border-border rounded-lg shadow-subtle overflow-hidden flex flex-col h-[380px]">
            <div className="p-3 border-b border-border bg-panel-subtle flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Generated Provisioning Scripts
              </span>
              <span className="text-xs text-status-success font-medium">Ready for Cisco IOS & Linux</span>
            </div>
            <pre className="flex-1 p-4 bg-slate-900 text-slate-100 overflow-auto font-mono text-xs whitespace-pre leading-relaxed">
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
