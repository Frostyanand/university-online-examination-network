import yaml
import csv
import sys
from pathlib import Path
from pkt_core.builder import Lab
from pkt_core import decode_bytes, encode_bytes
from pkt_core.models.lab import Lab as ParsedLab
from pkt_core.audit import validate_lab, sanitize_template_leftovers
import xml.etree.ElementTree as ET

def build_packet_tracer_lab(
    spec_path: str = "network/network-spec.yaml",
    cfg_dir: str = "packet-tracer/device-configs",
    out_pkt: str = "artifacts/cisco/university_online_examination_network.pkt",
    out_svg: str = "artifacts/cisco/topology.svg",
    out_inv_csv: str = "artifacts/cisco/device-inventory.csv",
    out_ip_csv: str = "artifacts/cisco/ip-addressing.csv"
):
    print(f"[*] Loading network specification from {spec_path}...")
    with open(spec_path, "r", encoding="utf-8") as f:
        spec = yaml.safe_load(f)

    cfg_path = Path(cfg_dir)
    out_pkt_path = Path(out_pkt)
    out_pkt_path.parent.mkdir(parents=True, exist_ok=True)

    print("[*] Initializing Packet Tracer builder Lab...")
    lab = Lab()
    lab.drop_initial()

    device_sids = {}

    # 1. Add Routers (ISP1, EDGE-R1, EDGE-R2)
    routers = spec["devices"]["routers"]
    for r in routers:
        rid = r["id"]
        cfg_file = cfg_path / f"{rid}.cfg"
        ios_lines = cfg_file.read_text(encoding="utf-8").splitlines() if cfg_file.exists() else None
        sid = lab.add_device(
            model=r["model"],
            name=rid,
            x=r["x"],
            y=r["y"],
            ios_config=ios_lines
        )
        device_sids[rid] = sid
        print(f"  [+] Placed router {rid} ({r['model']}) at ({r['x']}, {r['y']})")

    # 2. Add Distribution Switches (DSW1, DSW2)
    dsws = spec["devices"]["distribution_switches"]
    for dsw in dsws:
        did = dsw["id"]
        cfg_file = cfg_path / f"{did}.cfg"
        ios_lines = cfg_file.read_text(encoding="utf-8").splitlines() if cfg_file.exists() else None
        sid = lab.add_device(
            model=dsw["model"],
            name=did,
            x=dsw["x"],
            y=dsw["y"],
            ios_config=ios_lines
        )
        device_sids[did] = sid
        print(f"  [+] Placed distribution switch {did} ({dsw['model']}) at ({dsw['x']}, {dsw['y']})")

    # 3. Add 10 Access Switches
    asws = spec["devices"]["access_switches"]
    for asw in asws:
        aid = asw["id"]
        cfg_file = cfg_path / f"{aid}.cfg"
        ios_lines = cfg_file.read_text(encoding="utf-8").splitlines() if cfg_file.exists() else None
        sid = lab.add_device(
            model=asw["model"],
            name=aid,
            x=asw["x"],
            y=asw["y"],
            ios_config=ios_lines
        )
        device_sids[aid] = sid
        print(f"  [+] Placed access switch {aid} ({asw['model']}) at ({asw['x']}, {asw['y']})")

    # 4. Add Servers
    servers = spec["servers"]
    srv_coords = {
        "EXAM-WEB-1": (620, 520),
        "EXAM-WEB-2": (740, 520),
        "DHCP-DNS-1": (660, 520),
        "DHCP-DNS-2": (700, 520),
        "NET-MON": (580, 520),
        "TEST-SERVER": (700, 50),
    }
    for srv in servers:
        s_id = srv["id"]
        x, y = srv_coords.get(s_id, (600, 500))
        pc_ip_param = [srv["ip"], srv["netmask"], srv["gateway"]]
        sid = lab.add_device(
            model="Server-PT",
            name=s_id,
            x=x,
            y=y,
            pc_ip=pc_ip_param
        )
        device_sids[s_id] = sid
        print(f"  [+] Placed server {s_id} with IP {srv['ip']}")

    # 5. Add Endpoints (PCs)
    endpoints = spec["devices"]["endpoints"]
    for ep in endpoints:
        eid = ep["id"]
        fb_ip, fb_prefix = ep["fallback_ip"].split("/")
        mask_map = {"26": "255.255.255.192", "27": "255.255.255.224"}
        fb_mask = mask_map.get(fb_prefix, "255.255.255.0")
        pc_ip_param = [fb_ip, fb_mask, ep["gateway"]]
        sid = lab.add_device(
            model=ep["model"],
            name=eid,
            x=ep["x"],
            y=ep["y"],
            pc_ip=pc_ip_param
        )
        device_sids[eid] = sid
        print(f"  [+] Placed endpoint {eid} ({ep['model']})")

    print("[*] Cabling and linking devices...")

    # A. WAN / ISP Links
    lab.link(device_sids["ISP1"], "GigabitEthernet0/0", device_sids["EDGE-R1"], "GigabitEthernet0/0")
    lab.link(device_sids["ISP1"], "GigabitEthernet0/1", device_sids["EDGE-R2"], "GigabitEthernet0/0")
    lab.link(device_sids["ISP1"], "GigabitEthernet0/2", device_sids["TEST-SERVER"], "FastEthernet0")

    # B. Routed Point-to-Point Core Links
    lab.link(device_sids["DSW1"], "GigabitEthernet0/2", device_sids["EDGE-R1"], "GigabitEthernet0/1")
    lab.link(device_sids["DSW1"], "FastEthernet0/24", device_sids["EDGE-R2"], "GigabitEthernet0/1")
    lab.link(device_sids["DSW2"], "GigabitEthernet0/2", device_sids["EDGE-R1"], "GigabitEthernet0/2")
    lab.link(device_sids["DSW2"], "FastEthernet0/24", device_sids["EDGE-R2"], "GigabitEthernet0/2")

    # C. Distribution Inter-Switch Trunk
    lab.link(device_sids["DSW1"], "GigabitEthernet0/1", device_sids["DSW2"], "GigabitEthernet0/1")

    # D. Distribution to 10 Access Switch Trunks
    asw_order = [
        "ASW-LA-1", "ASW-LA-2", "ASW-LB-1", "ASW-LB-2", "ASW-LC-1",
        "ASW-LC-2", "ASW-SRV-1", "ASW-SRV-2", "ASW-ADM-1", "ASW-ADM-2"
    ]
    for idx, asw_name in enumerate(asw_order, 1):
        # DSW1 to ASW (FastEthernet0/{idx} to GigabitEthernet0/1)
        lab.link(device_sids["DSW1"], f"FastEthernet0/{idx}", device_sids[asw_name], "GigabitEthernet0/1")
        # DSW2 to ASW (FastEthernet0/{idx} to GigabitEthernet0/2)
        lab.link(device_sids["DSW2"], f"FastEthernet0/{idx}", device_sids[asw_name], "GigabitEthernet0/2")

    # E. Server Access Switch Connections
    lab.link(device_sids["ASW-SRV-1"], "FastEthernet0/1", device_sids["EXAM-WEB-1"], "FastEthernet0")
    lab.link(device_sids["ASW-SRV-1"], "FastEthernet0/2", device_sids["DHCP-DNS-1"], "FastEthernet0")
    lab.link(device_sids["ASW-SRV-1"], "FastEthernet0/3", device_sids["NET-MON"], "FastEthernet0")
    lab.link(device_sids["ASW-SRV-2"], "FastEthernet0/1", device_sids["EXAM-WEB-2"], "FastEthernet0")
    lab.link(device_sids["ASW-SRV-2"], "FastEthernet0/2", device_sids["DHCP-DNS-2"], "FastEthernet0")

    # F. Client PC Access Switch Connections
    lab.link(device_sids["ASW-LA-1"], "FastEthernet0/1", device_sids["PC-LA-1"], "FastEthernet0")
    lab.link(device_sids["ASW-LA-2"], "FastEthernet0/1", device_sids["PC-LA-2"], "FastEthernet0")
    lab.link(device_sids["ASW-LB-1"], "FastEthernet0/1", device_sids["PC-LB-1"], "FastEthernet0")
    lab.link(device_sids["ASW-LB-2"], "FastEthernet0/1", device_sids["PC-LB-2"], "FastEthernet0")
    lab.link(device_sids["ASW-LC-1"], "FastEthernet0/1", device_sids["PC-LC-1"], "FastEthernet0")
    lab.link(device_sids["ASW-LC-2"], "FastEthernet0/1", device_sids["PC-LC-2"], "FastEthernet0")
    lab.link(device_sids["ASW-ADM-1"], "FastEthernet0/1", device_sids["PC-ADM-1"], "FastEthernet0")
    lab.link(device_sids["ASW-ADM-1"], "FastEthernet0/2", device_sids["PC-FAC-1"], "FastEthernet0")
    lab.link(device_sids["ASW-ADM-2"], "FastEthernet0/1", device_sids["PC-MGMT-1"], "FastEthernet0")
    lab.link(device_sids["ASW-ADM-2"], "FastEthernet0/2", device_sids["PC-GST-1"], "FastEthernet0")

    print("[*] Sanitizing template donor leftovers...")
    raw_xml = ET.tostring(lab.base, encoding="unicode").encode("utf-8")
    initial_pkt = encode_bytes(raw_xml, "pkt")
    parsed_lab = ParsedLab.from_bytes(decode_bytes(initial_pkt, "pkt").xml)
    srep = sanitize_template_leftovers(parsed_lab)
    print(f"  [+] Removed {srep.total} leftover template records ({srep.as_dict()})")

    clean_xml_bytes = parsed_lab.to_xml()
    final_pkt_bytes = encode_bytes(clean_xml_bytes, "pkt")
    out_pkt_path.write_bytes(final_pkt_bytes)
    print(f"[SUCCESS] Saved sanitized {out_pkt} ({len(final_pkt_bytes)} bytes)")

    # 6. Audit & Validate the final saved file
    print("[*] Auditing final .pkt file with pkt_core.audit...")
    verified_parsed = ParsedLab.from_bytes(decode_bytes(final_pkt_bytes, "pkt").xml)
    rep = validate_lab(verified_parsed)
    print(f"  [+] Audit result: OK={rep.ok}, Failures={len(rep.failures)}, Warnings={len(rep.warnings)}")
    for finding in rep.findings:
        print(f"      [{finding.severity.upper()}] {finding.code}: {finding.message}")
    assert rep.ok, "Generated Packet Tracer file failed validation!"

    # 7. Generate Topology SVG
    generate_svg_topology(spec, out_svg)

    # 8. Generate Device Inventory CSV
    generate_device_inventory_csv(spec, out_inv_csv)

    # 9. Generate IP Addressing CSV
    generate_ip_addressing_csv(spec, out_ip_csv)

    print("\n[COMPLETE] Deliverable A generated and verified successfully!\n")


def generate_svg_topology(spec: dict, out_path: str):
    svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 700" width="100%" height="100%" style="background:#090d16; font-family:system-ui, sans-serif;">',
        '<defs>',
        '  <linearGradient id="bgBox" x1="0%" y1="0%" x2="100%" y2="100%">',
        '    <stop offset="0%" stop-color="#1e293b"/>',
        '    <stop offset="100%" stop-color="#0f172a"/>',
        '  </linearGradient>',
        '  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">',
        '    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#38bdf8" flood-opacity="0.3"/>',
        '  </filter>',
        '</defs>',
        '<!-- Title & Header -->',
        '<text x="40" y="40" fill="#f8fafc" font-size="20" font-weight="700">University Online Examination Network — Topology Architecture</text>',
        '<text x="40" y="65" fill="#94a3b8" font-size="12">Campus LAN: 10.20.10.0/23 | Transit: 10.20.255.0/24 | Simulated Internet: 198.51.100.0/24</text>',
        '<!-- Links Group -->',
        '<g stroke="#334155" stroke-width="2">',
        '  <!-- Core Mesh Links -->',
        '  <line x1="500" y1="110" x2="350" y2="190" stroke="#38bdf8" stroke-dasharray="4"/>',
        '  <line x1="500" y1="110" x2="650" y2="190" stroke="#38bdf8" stroke-dasharray="4"/>',
        '  <line x1="350" y1="190" x2="350" y2="290" stroke="#22c55e" stroke-width="2.5"/>',
        '  <line x1="350" y1="190" x2="650" y2="290" stroke="#22c55e"/>',
        '  <line x1="650" y1="190" x2="350" y2="290" stroke="#22c55e"/>',
        '  <line x1="650" y1="190" x2="650" y2="290" stroke="#22c55e" stroke-width="2.5"/>',
        '  <line x1="350" y1="290" x2="650" y2="290" stroke="#f59e0b" stroke-width="3"/>',
        '</g>',
        '<!-- Device Nodes -->'
    ]

    # Draw Routers
    routers = spec["devices"]["routers"]
    for r in routers:
        x, y = r["x"], r["y"] + 60
        svg.append(f'<rect x="{x-45}" y="{y-20}" width="90" height="40" rx="8" fill="url(#bgBox)" stroke="#38bdf8" stroke-width="2" filter="url(#glow)"/>')
        svg.append(f'<text x="{x}" y="{y+5}" fill="#f8fafc" font-size="12" font-weight="600" text-anchor="middle">{r["id"]}</text>')
        svg.append(f'<text x="{x}" y="{y+32}" fill="#64748b" font-size="10" text-anchor="middle">{r["model"]}</text>')

    # Draw DSWs
    dsws = spec["devices"]["distribution_switches"]
    for d in dsws:
        x, y = d["x"], d["y"] + 30
        svg.append(f'<rect x="{x-55}" y="{y-25}" width="110" height="50" rx="8" fill="url(#bgBox)" stroke="#f59e0b" stroke-width="2" filter="url(#glow)"/>')
        svg.append(f'<text x="{x}" y="{y-2}" fill="#f8fafc" font-size="12" font-weight="700" text-anchor="middle">{d["id"]}</text>')
        svg.append(f'<text x="{x}" y="{y+16}" fill="#fbbf24" font-size="10" text-anchor="middle">L3 MLS (HSRP/VRRP)</text>')

    # Draw 10 ASWs
    asws = spec["devices"]["access_switches"]
    for a in asws:
        x, y = a["x"] + 10, a["y"] + 40
        svg.append(f'<rect x="{x-30}" y="{y-18}" width="60" height="36" rx="6" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>')
        svg.append(f'<text x="{x}" y="{y+4}" fill="#e2e8f0" font-size="9" font-weight="600" text-anchor="middle">{a["id"].replace("ASW-", "")}</text>')

    # Draw Servers
    servers = spec["servers"]
    for s in servers:
        if s["id"] == "TEST-SERVER":
            continue
        x = 550 + (servers.index(s) * 85)
        y = 590
        svg.append(f'<rect x="{x-35}" y="{y-20}" width="70" height="40" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5"/>')
        svg.append(f'<text x="{x}" y="{y-2}" fill="#f1f5f9" font-size="9" font-weight="600" text-anchor="middle">{s["id"]}</text>')
        svg.append(f'<text x="{x}" y="{y+12}" fill="#c084fc" font-size="8" text-anchor="middle">{s["ip"].replace("10.20.10.", ".10.")}</text>')

    svg.append('</svg>')
    Path(out_path).write_text("\n".join(svg), encoding="utf-8")
    print(f"[+] Generated topology SVG: {out_path}")


def generate_device_inventory_csv(spec: dict, out_path: str):
    rows = [["Device ID", "Display Name", "Role", "Layer", "Hardware Model", "Kathara Image", "Management / Primary IP"]]
    
    for r in spec["devices"]["routers"]:
        rows.append([r["id"], r["name"], "Edge / Transit Router", "Layer 3", r["model"], r["kathara_image"], "10.20.255.x"])
    for d in spec["devices"]["distribution_switches"]:
        rows.append([d["id"], d["name"], "Multilayer Core Switch", "Layer 3 / L2 Gateway", d["model"], d["kathara_image"], "10.20.11.34/35"])
    for a in spec["devices"]["access_switches"]:
        rows.append([a["id"], a["name"], "Access Layer Switch", "Layer 2", a["model"], a["kathara_image"], "10.20.11.4x"])
    for s in spec["servers"]:
        rows.append([s["id"], s["name"], s["role"], "Host Service", "Server-PT", "kathara/base", s["ip"]])
    for e in spec["devices"]["endpoints"]:
        rows.append([e["id"], e["name"], "Workstation Endpoint", "Host Node", e["model"], e["kathara_image"], e["fallback_ip"]])

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(rows)
    print(f"[+] Generated device inventory CSV: {out_path}")


def generate_ip_addressing_csv(spec: dict, out_path: str):
    rows = [["VLAN", "Name", "CIDR Prefix", "Subnet Mask", "Network Address", "Gateway VIP", "DSW1 SVI", "DSW2 SVI", "DHCP Range", "Planned Hosts", "Usable Capacity"]]
    for v in spec["vlans"]:
        dhcp = f"{v['dhcp_pool_a']['start']} - {v['dhcp_pool_b']['end']}" if v.get("dhcp_enabled") else "Static"
        rows.append([
            v["id"], v["name"], v["cidr"], v["netmask"], v["network"],
            v["gateway_vip"], v["dsw1_ip"], v["dsw2_ip"], dhcp,
            v["planned_hosts"], v["usable_hosts"]
        ])

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(rows)
    print(f"[+] Generated IP addressing CSV: {out_path}")

if __name__ == "__main__":
    build_packet_tracer_lab()
