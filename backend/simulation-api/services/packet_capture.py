import time
import uuid
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from config import PCAPS_DIR
from database import get_db

try:
    from scapy.all import rdpcap, Ether, IP, TCP, UDP, ICMP, ARP, Dot1Q, DNS, DHCP
    SCAPY_AVAILABLE = True
except Exception:
    SCAPY_AVAILABLE = False

class PacketCaptureService:
    def __init__(self, kathara_service):
        self.ks = kathara_service
        self.active_captures = {}

    def start_capture(self, device_id: str, interface: str = "eth0", filter_expr: str = None) -> Dict[str, Any]:
        capture_id = f"cap_{uuid.uuid4().hex[:8]}"
        pcap_remote = f"/tmp/{capture_id}.pcap"

        filter_cmd = f" '{filter_expr}'" if filter_expr else ""
        cmd = f"tcpdump -i {interface} -s 0 -U -w {pcap_remote}{filter_cmd} > /dev/null 2>&1 &"

        res = self.ks.exec_command(device_id, cmd)
        self.active_captures[capture_id] = {
            "id": capture_id,
            "device_id": device_id,
            "interface": interface,
            "pcap_remote": pcap_remote,
            "filter_expr": filter_expr,
            "start_time": time.time()
        }

        # Store in db
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO packet_captures (id, device_id, interface_name, filter_expr, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (capture_id, device_id, interface, filter_expr or "", str(PCAPS_DIR / f"{capture_id}.pcap"), datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()

        return {"capture_id": capture_id, "device_id": device_id, "interface": interface, "status": "capturing"}

    def stop_capture(self, capture_id: str) -> Dict[str, Any]:
        info = self.active_captures.get(capture_id)
        if not info:
            return {"error": f"Active capture {capture_id} not found."}

        device_id = info["device_id"]
        pcap_remote = info["pcap_remote"]
        pcap_local = PCAPS_DIR / f"{capture_id}.pcap"

        # Stop tcpdump process
        self.ks.exec_command(device_id, "killall -2 tcpdump")
        time.sleep(0.5)

        # Retrieve file from container
        try:
            k = self.ks
            # Base64 encode and read out
            read_res = k.exec_command(device_id, f"base64 -w 0 {pcap_remote}")
            if read_res["success"] and read_res["output"]:
                import base64
                data = base64.b64decode(read_res["output"].strip())
                pcap_local.write_bytes(data)
                del self.active_captures[capture_id]
                return {
                    "capture_id": capture_id,
                    "file_path": str(pcap_local),
                    "file_size": len(data),
                    "status": "stopped"
                }
        except Exception as e:
            return {"error": f"Failed to retrieve pcap: {str(e)}"}

        del self.active_captures[capture_id]
        return {"capture_id": capture_id, "status": "stopped", "file_path": str(pcap_local)}

    def parse_pcap(self, capture_id: str) -> List[Dict[str, Any]]:
        pcap_file = PCAPS_DIR / f"{capture_id}.pcap"
        if not pcap_file.exists():
            return []

        if not SCAPY_AVAILABLE:
            return [{"id": 1, "summary": "Scapy not installed for parsing", "protocol": "RAW"}]

        packets = []
        try:
            scapy_packets = rdpcap(str(pcap_file))
            for idx, p in enumerate(scapy_packets, 1):
                ts = float(p.time)
                time_str = datetime.utcfromtimestamp(ts).strftime("%H:%M:%S.%f")[:-3]
                
                src_mac = p[Ether].src if Ether in p else None
                dst_mac = p[Ether].dst if Ether in p else None
                vlan_id = p[Dot1Q].vlan if Dot1Q in p else None

                src_ip = None
                dst_ip = None
                ttl = None
                protocol = "ETHER"

                if IP in p:
                    src_ip = p[IP].src
                    dst_ip = p[IP].dst
                    ttl = p[IP].ttl
                    protocol = "IP"

                src_port = None
                dst_port = None
                tcp_flags = None
                seq = None
                ack = None

                if TCP in p:
                    protocol = "TCP"
                    src_port = p[TCP].sport
                    dst_port = p[TCP].dport
                    tcp_flags = str(p[TCP].flags)
                    seq = p[TCP].seq
                    ack = p[TCP].ack
                elif UDP in p:
                    protocol = "UDP"
                    src_port = p[UDP].sport
                    dst_port = p[UDP].dport
                    if DNS in p:
                        protocol = "DNS"
                    elif DHCP in p:
                        protocol = "DHCP"
                elif ICMP in p:
                    protocol = "ICMP"
                elif ARP in p:
                    protocol = "ARP"
                    src_ip = p[ARP].psrc
                    dst_ip = p[ARP].pdst

                summary = p.summary()

                packets.append({
                    "id": idx,
                    "timestamp": ts,
                    "time_str": time_str,
                    "device": "CapturedNode",
                    "interface": "eth0",
                    "src_mac": src_mac,
                    "dst_mac": dst_mac,
                    "vlan_id": vlan_id,
                    "src_ip": src_ip,
                    "dst_ip": dst_ip,
                    "ttl": ttl,
                    "protocol": protocol,
                    "src_port": src_port,
                    "dst_port": dst_port,
                    "tcp_flags": tcp_flags,
                    "seq": seq,
                    "ack": ack,
                    "summary": summary
                })
        except Exception as e:
            print(f"[!] Error parsing PCAP {capture_id}: {e}")

        return packets

