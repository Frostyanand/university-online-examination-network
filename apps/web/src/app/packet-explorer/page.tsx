"use client";

import { useState } from "react";
import { 
  Network, Play, Download, Filter, ArrowRight, 
  Layers, CheckCircle2, ShieldAlert, Cpu 
} from "lucide-react";
import { runConnectivityTest } from "@/lib/api";

export default function PacketExplorerPage() {
  const [source, setSource] = useState("PC-LAB-A1");
  const [dest, setDest] = useState("10.20.10.210");
  const [protocol, setProtocol] = useState("HTTP");
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [filterProto, setFilterProto] = useState("ALL");
  const [pcapAvailable, setPcapAvailable] = useState(false);

  const journeys: Record<string, any[]> = {
    "PC-LAB-A1_to_VIP": [
      {
        step: 1,
        device: "PC-LAB-A1",
        layer: "Layer 2 / 3 (ARP Resolution)",
        proto: "ARP",
        summary: "Broadcast ARP Request: Who has default gateway 10.20.20.1? Tell 10.20.20.10",
        src_mac: "02:42:0a:14:14:0a",
        dst_mac: "ff:ff:ff:ff:ff:ff",
        details: "Ethernet II, Src: PC-LAB-A1, Dst: Broadcast. ARP opcode: request (1). Target IP: 10.20.20.1"
      },
      {
        step: 2,
        device: "DSW-1 (VRRP Master)",
        layer: "Layer 2 (ARP Reply)",
        proto: "ARP",
        summary: "Unicast ARP Reply: 10.20.20.1 is at VRRP Virtual MAC 00:00:5e:00:01:14",
        src_mac: "00:00:5e:00:01:14",
        dst_mac: "02:42:0a:14:14:0a",
        details: "VRID 20 virtual MAC returned by DSW-1. PC-LAB-A1 populates ARP cache."
      },
      {
        step: 3,
        device: "ASW-LAB-A1",
        layer: "Layer 2 (802.1Q Switching)",
        proto: "ETH",
        summary: "Untagged access port eth1 receives frame -> inserts 802.1Q tag (VLAN 20, Priority 0) -> forwards out trunk eth0",
        src_mac: "02:42:0a:14:14:0a",
        dst_mac: "00:00:5e:00:01:14",
        details: "802.1Q VLAN ID: 20, Type: IPv4 (0x0800). RSTP port state: FORWARDING."
      },
      {
        step: 4,
        device: "DSW-1",
        layer: "Layer 3 (Inter-VLAN Routing & ACL)",
        proto: "IPv4",
        summary: "SVI vlan20 strips 802.1Q tag. IP Router inspects dst IP 10.20.10.210. Evaluates ACL: PERMIT. Decrements TTL (64 -> 63).",
        src_mac: "00:00:5e:00:01:14",
        dst_mac: "02:42:0a:14:0a:d2",
        details: "Route Lookup: 10.20.10.0/24 directly connected via SVI vlan10. Next-hop MAC resolved to SRV-WEB-1."
      },
      {
        step: 5,
        device: "ASW-SRV-1",
        layer: "Layer 2 (Trunk to Access Switching)",
        proto: "802.1Q",
        summary: "Trunk eth0 receives frame on VLAN 10 -> forwards out access port eth1 with tag stripped.",
        src_mac: "00:00:5e:00:01:0a",
        dst_mac: "02:42:0a:14:0a:d2",
        details: "Destination MAC belongs to Keepalived VIP cluster on SRV-WEB-1."
      },
      {
        step: 6,
        device: "SRV-WEB-1 (VIP Owner)",
        layer: "Layer 4 / 7 (TCP / HTTP Handshake)",
        proto: "TCP",
        summary: "TCP SYN received on port 80 -> Kernel socket answers with TCP SYN-ACK (Seq=0, Ack=1)",
        src_mac: "02:42:0a:14:0a:d2",
        dst_mac: "02:42:0a:14:14:0a",
        details: "Flags: [SYN, ACK]. MSS: 1460. Nginx web server processes exam portal request."
      }
    ],
    "PC-GUEST_to_VIP_DENIED": [
      {
        step: 1,
        device: "PC-GUEST-1",
        layer: "Layer 3 (IP Packet Generation)",
        proto: "IPv4",
        summary: "Packet initiated: 10.20.80.50 -> 10.20.10.210 (HTTP port 80)",
        src_mac: "02:42:0a:14:50:32",
        dst_mac: "00:00:5e:00:01:50",
        details: "Guest VLAN 80 client attempts unauthorized access to Exam Server VIP."
      },
      {
        step: 2,
        device: "ASW-ADM-2",
        layer: "Layer 2 (VLAN 80 Trunking)",
        proto: "802.1Q",
        summary: "Access switch tags packet with VLAN 80 and forwards across trunk link to DSW-1/DSW-2.",
        src_mac: "02:42:0a:14:50:32",
        dst_mac: "00:00:5e:00:01:50",
        details: "VLAN 80 frame transmitted to Distribution layer default gateway."
      },
      {
        step: 3,
        device: "DSW-1",
        layer: "Layer 3 (ACL Enforcement)",
        proto: "ICMP",
        summary: "ACL GUEST_RESTRICTION evaluated: deny ip 10.20.80.0/24 10.20.10.0/24 -> PACKET DROPPED",
        src_mac: "00:00:5e:00:01:50",
        dst_mac: "02:42:0a:14:50:32",
        details: "DSW-1 SVI vlan80 inbound ACL blocks traffic. Generates ICMP Destination Administratively Prohibited."
      }
    ]
  };

  const currentJourney = source === "PC-GUEST-1" ? journeys["PC-GUEST_to_VIP_DENIED"] : journeys["PC-LAB-A1_to_VIP"];

  const filteredSteps = filterProto === "ALL" 
    ? currentJourney 
    : currentJourney.filter(s => s.proto.toUpperCase() === filterProto.toUpperCase());

  const handleSimulateJourney = async () => {
    setIsRunning(true);
    setActiveStep(0);

    try {
      await runConnectivityTest({
        test_type: protocol === "HTTP" ? "http" : "ping",
        source_device: source,
        destination_ip: dest,
        capture_packets: true
      });
      setPcapAvailable(true);
    } catch {
      // offline simulation mode
    }

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < currentJourney.length) {
        setActiveStep(step);
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Packet Journey & Hop-by-Hop Decapsulation
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Trace real frame transitions, 802.1Q tags, VRRP virtual MAC resolution, and Layer 3 ACL filtering.
          </p>
        </div>

        {pcapAvailable && (
          <a
            href="/api/captures/download/latest.pcap"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-border hover:bg-panel-subtle text-xs font-medium text-foreground shadow-subtle transition"
          >
            <Download className="w-3.5 h-3.5 text-muted" />
            Download Captured PCAP
          </a>
        )}
      </div>

      {/* Control Panel */}
      <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Source Workstation</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-white border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-brand"
            >
              <option value="PC-LAB-A1">PC-LAB-A1 (VLAN 20 Exam Client)</option>
              <option value="PC-LAB-B1">PC-LAB-B1 (VLAN 30 Exam Client)</option>
              <option value="PC-GUEST-1">PC-GUEST-1 (VLAN 80 Quarantined)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">Destination Target</label>
            <select
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              className="w-full bg-white border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-brand"
            >
              <option value="10.20.10.210">10.20.10.210 (Exam Web VIP)</option>
              <option value="10.20.10.10">10.20.10.10 (SRV-WEB-1 Physical)</option>
              <option value="10.20.10.1">10.20.10.1 (DSW-1 Default VIP)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">Protocol Service</label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="w-full bg-white border border-border rounded px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-brand"
            >
              <option value="HTTP">HTTP (TCP Port 80)</option>
              <option value="ICMP">ICMP Echo (Ping)</option>
              <option value="DNS">DNS Query (UDP 53)</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleSimulateJourney}
              disabled={isRunning}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-brand hover:bg-brand-hover text-white text-xs font-medium shadow-subtle transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunning ? "Tracing..." : "Trace Packet Journey"}
            </button>
          </div>

        </div>
      </div>

      {/* Main Grid: Steps on Left, Decapsulation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step-by-Step Traversal Cards (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {filteredSteps.map((s, idx) => {
            const isCurrent = activeStep === idx;
            const isDone = activeStep >= idx;

            return (
              <div
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`p-4 rounded-lg border transition cursor-pointer shadow-subtle ${
                  isCurrent
                    ? "bg-white border-brand ring-2 ring-brand/10"
                    : isDone
                    ? "bg-white border-border hover:border-slate-300"
                    : "bg-panel-subtle/60 border-border opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-semibold ${
                      isDone ? "bg-brand text-white" : "bg-slate-200 text-muted"
                    }`}>
                      {s.step}
                    </span>
                    <span className="font-semibold text-xs text-foreground font-mono">{s.device}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-panel-subtle text-foreground border border-border">
                      {s.proto}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted font-sans">{s.layer}</span>
                </div>

                <p className="mt-2 text-xs text-slate-700 leading-relaxed font-sans">
                  {s.summary}
                </p>

                <div className="mt-2 pt-2 border-t border-border flex items-center gap-4 text-[11px] font-mono text-muted">
                  <span>Src MAC: <span className="text-foreground">{s.src_mac}</span></span>
                  <span>Dst MAC: <span className="text-foreground">{s.dst_mac}</span></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Packet Header Dissection (1 col) */}
        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-lg p-4 shadow-subtle space-y-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Packet Header Inspection
            </h3>

            {currentJourney[activeStep] ? (
              <div className="space-y-3 font-mono text-xs">
                
                <div className="p-2.5 rounded bg-panel-subtle border border-border space-y-1">
                  <div className="text-[11px] font-bold text-brand font-sans">Ethernet II Header</div>
                  <div className="text-muted">Src MAC: {currentJourney[activeStep].src_mac}</div>
                  <div className="text-muted">Dst MAC: {currentJourney[activeStep].dst_mac}</div>
                  <div className="text-muted">EtherType: 0x0800 (IPv4) / 0x8100 (802.1Q)</div>
                </div>

                <div className="p-2.5 rounded bg-panel-subtle border border-border space-y-1">
                  <div className="text-[11px] font-bold text-status-success font-sans">IPv4 Network Header</div>
                  <div className="text-muted">Source IP: {source === "PC-GUEST-1" ? "10.20.80.50" : "10.20.20.10"}</div>
                  <div className="text-muted">Target IP: {dest}</div>
                  <div className="text-muted">TTL: 64 &bull; Protocol: {protocol}</div>
                </div>

                <div className="p-2.5 rounded bg-panel-subtle border border-border space-y-1">
                  <div className="text-[11px] font-bold text-foreground font-sans">Decoded Context & Action</div>
                  <p className="text-[11px] font-sans text-slate-600 leading-relaxed">
                    {currentJourney[activeStep].details}
                  </p>
                </div>

              </div>
            ) : (
              <div className="text-xs text-muted py-6 text-center">
                Select a step on the left to inspect header bytes.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
