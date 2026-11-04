"use client";

import { useState } from "react";
import { 
  Network, Play, Download, Filter, ArrowRight, 
  Layers, CheckCircle2, ShieldAlert, Cpu, HardDrive 
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

  // Pre-baked packet journeys with real hop-by-hop decapsulation
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

    // Call real test runner on backend
    try {
      await runConnectivityTest({
        test_type: protocol === "HTTP" ? "http" : "ping",
        source_device: source,
        destination_ip: dest,
        capture_packets: true
      });
      setPcapAvailable(true);
    } catch {
      // Backend simulation offline - fall back to timeline playback
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
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Network className="w-6 h-6 text-accent-cyan" />
            Packet Journey Explorer
          </h1>
          <p className="text-sm text-slate-400">
            Step-by-step decapsulation, Layer 2 802.1Q tags, VRRP routing, ACL filtering, and packet captures.
          </p>
        </div>

        {pcapAvailable && (
          <a
            href="/api/captures/download/latest.pcap"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue border border-accent-blue/40 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download Raw PCAP
          </a>
        )}
      </div>

      {/* Control Panel: Source / Dest / Protocol */}
      <div className="bg-panel border border-border rounded-lg p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Source Node</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-slate-900 border border-border rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
            >
              <option value="PC-LAB-A1">PC-LAB-A1 (VLAN 20 Exam Client)</option>
              <option value="PC-LAB-B1">PC-LAB-B1 (VLAN 30 Exam Client)</option>
              <option value="PC-FAC-1">PC-FAC-1 (VLAN 50 Faculty)</option>
              <option value="PC-GUEST-1">PC-GUEST-1 (VLAN 80 Guest - ACL Test)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Destination Target</label>
            <select
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              className="w-full bg-slate-900 border border-border rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
            >
              <option value="10.20.10.210">10.20.10.210 (Exam Web VIP)</option>
              <option value="10.20.10.10">10.20.10.10 (SRV-WEB-1 Physical)</option>
              <option value="10.20.10.1">10.20.10.1 (DSW-1 Default Gateway)</option>
              <option value="10.20.10.5">10.20.10.5 (DNS / DHCP Server)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Protocol / Service</label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              className="w-full bg-slate-900 border border-border rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
            >
              <option value="HTTP">HTTP (TCP Port 80)</option>
              <option value="ICMP">ICMP Echo Request (Ping)</option>
              <option value="DNS">DNS Query (UDP Port 53)</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleSimulateJourney}
              disabled={isRunning}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs font-semibold shadow transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunning ? "Transmitting..." : "Trace Packet Journey"}
            </button>
          </div>

        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          Protocol Filter:
        </div>
        <div className="flex items-center gap-1">
          {["ALL", "ARP", "ETH", "802.1Q", "IPv4", "TCP", "ICMP"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterProto(p)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                filterProto === p 
                  ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Step-by-Step Timeline & Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {filteredSteps.map((s, idx) => {
            const isCurrent = activeStep === idx;
            const isDone = activeStep >= idx;
            return (
              <div
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`p-4 rounded-lg border transition cursor-pointer ${
                  isCurrent
                    ? "bg-slate-900 border-accent-cyan ring-1 ring-accent-cyan/50"
                    : isDone
                    ? "bg-panel border-border hover:border-slate-600"
                    : "bg-panel/50 border-border/50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                      isDone ? "bg-accent-blue text-white" : "bg-slate-800 text-slate-500"
                    }`}>
                      {s.step}
                    </span>
                    <span className="font-semibold text-sm text-white font-mono">{s.device}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-accent-cyan border border-slate-700">
                      {s.proto}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">{s.layer}</span>
                </div>

                <p className="mt-2 text-xs text-slate-300 font-sans leading-relaxed">
                  {s.summary}
                </p>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-4 text-[11px] font-mono text-slate-500">
                  <span>Src MAC: <span className="text-slate-400">{s.src_mac}</span></span>
                  <span>Dst MAC: <span className="text-slate-400">{s.dst_mac}</span></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Packet Header Dissector (1 col) */}
        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-cyan" />
              Packet Header Dissection
            </h3>

            {currentJourney[activeStep] ? (
              <div className="space-y-3 font-mono text-xs">
                
                {/* Frame Info */}
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div className="text-[11px] text-accent-blue font-bold mb-1">Ethernet II Header</div>
                  <div className="text-slate-400">Src MAC: {currentJourney[activeStep].src_mac}</div>
                  <div className="text-slate-400">Dst MAC: {currentJourney[activeStep].dst_mac}</div>
                  <div className="text-slate-400">Type: 0x0800 (IPv4) or 0x8100 (802.1Q)</div>
                </div>

                {/* Layer 3 Info */}
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div className="text-[11px] text-accent-green font-bold mb-1">IPv4 Header / Routing</div>
                  <div className="text-slate-400">Source: {source === "PC-GUEST-1" ? "10.20.80.50" : "10.20.20.10"}</div>
                  <div className="text-slate-400">Destination: {dest}</div>
                  <div className="text-slate-400">Protocol: {protocol} (TTL: 64)</div>
                </div>

                {/* Payload / Action */}
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div className="text-[11px] text-accent-cyan font-bold mb-1">Decoded Payload Context</div>
                  <p className="text-[11px] font-sans text-slate-300">
                    {currentJourney[activeStep].details}
                  </p>
                </div>

              </div>
            ) : (
              <div className="text-xs text-slate-500 py-6 text-center">
                Select a step on the left to inspect header bytes.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

