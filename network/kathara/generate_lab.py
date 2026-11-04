import yaml
from pathlib import Path
import os

def generate_kathara_lab(spec_path: str = "network/network-spec.yaml", out_dir: str = "network/kathara/lab"):
    with open(spec_path, "r", encoding="utf-8") as f:
        spec = yaml.safe_load(f)

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    lab_conf_lines = [
        "# ==================================================================",
        "# University Online Examination Network Simulation System",
        "# Authoritative Kathara Lab Configuration",
        "# Generated automatically from network/network-spec.yaml",
        "# ==================================================================",
        "",
        "LAB_DESCRIPTION=\"University Online Examination Network Simulation\"",
        "LAB_VERSION=\"1.0\"",
        "LAB_AUTHOR=\"Senior Network Systems Engineering Team\"",
        ""
    ]

    # Device images
    # Routers
    for r in spec["devices"]["routers"]:
        rid = r["id"]
        img = "kathara/frr"
        lab_conf_lines.append(f"{rid}[image]=\"{img}\"")

    # DSWs
    for dsw in spec["devices"]["distribution_switches"]:
        did = dsw["id"]
        lab_conf_lines.append(f"{did}[image]=\"exam-net/frr-dsw\"")

    # Access Switches
    for asw in spec["devices"]["access_switches"]:
        aid = asw["id"]
        lab_conf_lines.append(f"{aid}[image]=\"kathara/openvswitch\"")

    # Servers
    for s in spec["servers"]:
        sid = s["id"]
        if "WEB" in sid:
            lab_conf_lines.append(f"{sid}[image]=\"exam-net/web\"")
        else:
            lab_conf_lines.append(f"{sid}[image]=\"kathara/base\"")

    # Endpoints
    for ep in spec["devices"]["endpoints"]:
        eid = ep["id"]
        lab_conf_lines.append(f"{eid}[image]=\"kathara/base\"")

    lab_conf_lines.append("")
    lab_conf_lines.append("# --- Inter-Device Network Link Connections ---")

    # WAN & External links
    lab_conf_lines.extend([
        "ISP1[0]=\"WAN_R1\"",
        "EDGE-R1[0]=\"WAN_R1\"",
        "",
        "ISP1[1]=\"WAN_R2\"",
        "EDGE-R2[0]=\"WAN_R2\"",
        "",
        "ISP1[2]=\"EXT_NET\"",
        "TEST-SERVER[0]=\"EXT_NET\"",
        ""
    ])

    # Core Routed Links
    lab_conf_lines.extend([
        "DSW1[1]=\"P2P_D1_R1\"",
        "EDGE-R1[1]=\"P2P_D1_R1\"",
        "",
        "DSW1[2]=\"P2P_D1_R2\"",
        "EDGE-R2[1]=\"P2P_D1_R2\"",
        "",
        "DSW2[1]=\"P2P_D2_R1\"",
        "EDGE-R1[2]=\"P2P_D2_R1\"",
        "",
        "DSW2[2]=\"P2P_D2_R2\"",
        "EDGE-R2[2]=\"P2P_D2_R2\"",
        "",
        "DSW1[0]=\"DSW_TRUNK\"",
        "DSW2[0]=\"DSW_TRUNK\"",
        ""
    ])

    # 10 Access Switches to DSW1 (eth3..12) and DSW2 (eth3..12)
    asw_order = [
        "ASW-LA-1", "ASW-LA-2", "ASW-LB-1", "ASW-LB-2", "ASW-LC-1",
        "ASW-LC-2", "ASW-SRV-1", "ASW-SRV-2", "ASW-ADM-1", "ASW-ADM-2"
    ]
    for idx, asw_name in enumerate(asw_order, 3):
        cd_d1 = f"TRUNK_D1_{asw_name.replace('-', '')}"
        cd_d2 = f"TRUNK_D2_{asw_name.replace('-', '')}"
        lab_conf_lines.extend([
            f"DSW1[{idx}]=\"{cd_d1}\"",
            f"{asw_name}[0]=\"{cd_d1}\"",
            f"DSW2[{idx}]=\"{cd_d2}\"",
            f"{asw_name}[1]=\"{cd_d2}\"",
            ""
        ])

    # Servers on ASW-SRV-1 and ASW-SRV-2
    lab_conf_lines.extend([
        "ASW-SRV-1[2]=\"SRV_WEB1\"",
        "EXAM-WEB-1[0]=\"SRV_WEB1\"",
        "ASW-SRV-1[3]=\"SRV_DHCP1\"",
        "DHCP-DNS-1[0]=\"SRV_DHCP1\"",
        "ASW-SRV-1[4]=\"SRV_MON\"",
        "NET-MON[0]=\"SRV_MON\"",
        "",
        "ASW-SRV-2[2]=\"SRV_WEB2\"",
        "EXAM-WEB-2[0]=\"SRV_WEB2\"",
        "ASW-SRV-2[3]=\"SRV_DHCP2\"",
        "DHCP-DNS-2[0]=\"SRV_DHCP2\"",
        ""
    ])

    # Representative PCs on Access Switches
    lab_conf_lines.extend([
        "ASW-LA-1[2]=\"ACC_LA1\"",
        "PC-LA-1[0]=\"ACC_LA1\"",
        "ASW-LA-2[2]=\"ACC_LA2\"",
        "PC-LA-2[0]=\"ACC_LA2\"",
        "",
        "ASW-LB-1[2]=\"ACC_LB1\"",
        "PC-LB-1[0]=\"ACC_LB1\"",
        "ASW-LB-2[2]=\"ACC_LB2\"",
        "PC-LB-2[0]=\"ACC_LB2\"",
        "",
        "ASW-LC-1[2]=\"ACC_LC1\"",
        "PC-LC-1[0]=\"ACC_LC1\"",
        "ASW-LC-2[2]=\"ACC_LC2\"",
        "PC-LC-2[0]=\"ACC_LC2\"",
        "",
        "ASW-ADM-1[2]=\"ACC_ADM1\"",
        "PC-ADM-1[0]=\"ACC_ADM1\"",
        "ASW-ADM-1[3]=\"ACC_FAC1\"",
        "PC-FAC-1[0]=\"ACC_FAC1\"",
        "",
        "ASW-ADM-2[2]=\"ACC_MGMT1\"",
        "PC-MGMT-1[0]=\"ACC_MGMT1\"",
        "ASW-ADM-2[3]=\"ACC_GST1\"",
        "PC-GST-1[0]=\"ACC_GST1\"",
        ""
    ])

    (out / "lab.conf").write_text("\n".join(lab_conf_lines), encoding="utf-8")
    print(f"[+] Wrote {out / 'lab.conf'}")

    # ==================================================================
    # Generate Device Configs & Startup Scripts
    # ==================================================================

    # 1. ISP1 (FRR)
    create_dir(out / "ISP1" / "etc" / "frr")
    (out / "ISP1" / "etc" / "frr" / "daemons").write_text("zebra=yes\nospfd=no\n", encoding="utf-8")
    isp1_frr = (
        "hostname ISP1\n"
        "!\n"
        "ip route 10.20.10.0/23 10.20.255.1\n"
        "ip route 10.20.10.0/23 10.20.255.5 10\n"
        "!\n"
    )
    (out / "ISP1" / "etc" / "frr" / "frr.conf").write_text(isp1_frr, encoding="utf-8")
    (out / "ISP1.startup").write_text(
        "ip addr add 10.20.255.2/30 dev eth0\n"
        "ip link set eth0 up\n"
        "ip addr add 10.20.255.6/30 dev eth1\n"
        "ip link set eth1 up\n"
        "ip addr add 198.51.100.1/24 dev eth2\n"
        "ip link set eth2 up\n"
        "/usr/lib/frr/frrinit.sh start\n",
        encoding="utf-8"
    )

    # 2. EDGE-R1 (FRR)
    create_dir(out / "EDGE-R1" / "etc" / "frr")
    (out / "EDGE-R1" / "etc" / "frr" / "daemons").write_text("zebra=yes\nospfd=yes\n", encoding="utf-8")
    edge1_frr = (
        "hostname EDGE-R1\n"
        "!\n"
        "router ospf\n"
        " ospf router-id 10.20.255.1\n"
        " network 10.20.255.8/30 area 0.0.0.0\n"
        " network 10.20.255.16/30 area 0.0.0.0\n"
        " default-information originate always metric 10\n"
        "!\n"
        "ip route 0.0.0.0/0 10.20.255.2\n"
        "!\n"
    )
    (out / "EDGE-R1" / "etc" / "frr" / "frr.conf").write_text(edge1_frr, encoding="utf-8")
    (out / "EDGE-R1.startup").write_text(
        "ip addr add 10.20.255.1/30 dev eth0\n"
        "ip link set eth0 up\n"
        "ip addr add 10.20.255.10/30 dev eth1\n"
        "ip link set eth1 up\n"
        "ip addr add 10.20.255.18/30 dev eth2\n"
        "ip link set eth2 up\n"
        "/usr/lib/frr/frrinit.sh start\n",
        encoding="utf-8"
    )

    # 3. EDGE-R2 (FRR)
    create_dir(out / "EDGE-R2" / "etc" / "frr")
    (out / "EDGE-R2" / "etc" / "frr" / "daemons").write_text("zebra=yes\nospfd=yes\n", encoding="utf-8")
    edge2_frr = (
        "hostname EDGE-R2\n"
        "!\n"
        "router ospf\n"
        " ospf router-id 10.20.255.5\n"
        " network 10.20.255.12/30 area 0.0.0.0\n"
        " network 10.20.255.20/30 area 0.0.0.0\n"
        " default-information originate always metric 10\n"
        "!\n"
        "ip route 0.0.0.0/0 10.20.255.6\n"
        "!\n"
    )
    (out / "EDGE-R2" / "etc" / "frr" / "frr.conf").write_text(edge2_frr, encoding="utf-8")
    (out / "EDGE-R2.startup").write_text(
        "ip addr add 10.20.255.5/30 dev eth0\n"
        "ip link set eth0 up\n"
        "ip addr add 10.20.255.14/30 dev eth1\n"
        "ip link set eth1 up\n"
        "ip addr add 10.20.255.22/30 dev eth2\n"
        "ip link set eth2 up\n"
        "/usr/lib/frr/frrinit.sh start\n",
        encoding="utf-8"
    )

    # 4. Distribution Switches (DSW1 & DSW2)
    vlans = spec["vlans"]
    for dsw_name, is_dsw1 in [("DSW1", True), ("DSW2", False)]:
        dsw_dir = out / dsw_name
        create_dir(dsw_dir / "etc" / "frr")
        create_dir(dsw_dir / "etc" / "keepalived")

        (dsw_dir / "etc" / "frr" / "daemons").write_text("zebra=yes\nospfd=yes\n", encoding="utf-8")
        
        r_id = "10.20.255.9" if is_dsw1 else "10.20.255.17"
        p2p_net1 = "10.20.255.8/30" if is_dsw1 else "10.20.255.16/30"
        p2p_net2 = "10.20.255.12/30" if is_dsw1 else "10.20.255.20/30"
        
        dsw_frr = (
            f"hostname {dsw_name}\n"
            "!\n"
            "router ospf\n"
            f" ospf router-id {r_id}\n"
            f" network {p2p_net1} area 0.0.0.0\n"
            f" network {p2p_net2} area 0.0.0.0\n"
            " network 10.20.10.0/23 area 0.0.0.0\n"
            " passive-interface default\n"
            " no passive-interface eth1\n"
            " no passive-interface eth2\n"
            "!\n"
        )
        (dsw_dir / "etc" / "frr" / "frr.conf").write_text(dsw_frr, encoding="utf-8")

        # Keepalived Config
        keepalived_lines = [
            "global_defs {",
            f"    router_id {dsw_name}",
            "    enable_script_security",
            "}",
            ""
        ]

        for v in vlans:
            vid = v["id"]
            is_active = (v["primary_gateway"] == "DSW1") if is_dsw1 else (v["primary_gateway"] == "DSW2")
            priority = 110 if is_active else 90
            state = "MASTER" if is_active else "BACKUP"
            vip = v["gateway_vip"]
            cidr_prefix = v["cidr"].split("/")[1]

            keepalived_lines.extend([
                f"vrrp_instance VI_{vid} {{",
                f"    state {state}",
                f"    interface vlan{vid}",
                f"    virtual_router_id {vid}",
                f"    priority {priority}",
                "    advert_int 1",
                "    virtual_ipaddress {",
                f"        {vip}/{cidr_prefix}",
                "    }",
                "}",
                ""
            ])
        (dsw_dir / "etc" / "keepalived" / "keepalived.conf").write_text("\n".join(keepalived_lines), encoding="utf-8")

        # DSW Startup script
        p2p_ip1 = "10.20.255.9/30" if is_dsw1 else "10.20.255.17/30"
        p2p_ip2 = "10.20.255.13/30" if is_dsw1 else "10.20.255.21/30"

        dsw_startup = [
            "#!/bin/bash",
            "ip link set eth0 up",
            f"ip addr add {p2p_ip1} dev eth1",
            "ip link set eth1 up",
            f"ip addr add {p2p_ip2} dev eth2",
            "ip link set eth2 up",
            "",
            "# Create VLAN-aware Linux bridge",
            "ip link add name br-lan type bridge vlan_filtering 1",
            "ip link set dev br-lan up",
            "",
            "# Add trunk to peer DSW",
            "ip link set dev eth0 master br-lan",
            "bridge vlan add dev eth0 vid 10-80",
            ""
        ]

        # Add access switch trunk interfaces (eth3 to eth12)
        for i in range(3, 13):
            dsw_startup.extend([
                f"ip link set dev eth{i} master br-lan",
                f"bridge vlan add dev eth{i} vid 10-80",
                f"ip link set dev eth{i} up"
            ])

        # Add VLAN sub-interfaces on br-lan as SVIs
        for v in vlans:
            vid = v["id"]
            ip_addr = v["dsw1_ip"] if is_dsw1 else v["dsw2_ip"]
            prefix = v["cidr"].split("/")[1]
            dsw_startup.extend([
                f"ip link add link br-lan name vlan{vid} type vlan id {vid}",
                f"ip addr add {ip_addr}/{prefix} dev vlan{vid}",
                f"ip link set dev vlan{vid} up"
            ])

        # Enable IP forwarding, start FRR and Keepalived
        dsw_startup.extend([
            "",
            "sysctl -w net.ipv4.ip_forward=1",
            "/usr/lib/frr/frrinit.sh start",
            "sleep 1",
            "service keepalived start",
            "",
            "# Setup ACLs using iptables",
            "# Allow established",
            "iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT",
            "# Block Guest VLAN 80 to internal campus",
            "iptables -A FORWARD -s 10.20.11.64/27 -d 10.20.10.0/23 -j DROP",
            "# Block Student VLANs to Net Mgmt VLAN 70",
            "iptables -A FORWARD -s 10.20.10.0/24 -d 10.20.11.32/27 -j DROP",
            "# Allow Student VLANs to Exam Service VIP (80/443)",
            "iptables -A FORWARD -s 10.20.10.0/24 -d 10.20.10.210 -p tcp --dport 80 -j ACCEPT",
            "iptables -A FORWARD -s 10.20.10.0/24 -d 10.20.10.210 -p tcp --dport 443 -j ACCEPT",
            "iptables -A FORWARD -s 10.20.10.0/24 -d 10.20.10.202 -p udp --dport 53 -j ACCEPT",
            "iptables -A FORWARD -s 10.20.10.0/24 -d 10.20.10.203 -p udp --dport 53 -j ACCEPT",
            "iptables -A FORWARD -p icmp -j ACCEPT",
            ""
        ])
        (out / f"{dsw_name}.startup").write_text("\n".join(dsw_startup), encoding="utf-8")

    # 5. Access Switches (OVS)
    asw_info = [
        ("ASW-LA-1", 10), ("ASW-LA-2", 10),
        ("ASW-LB-1", 20), ("ASW-LB-2", 20),
        ("ASW-LC-1", 30), ("ASW-LC-2", 30),
        ("ASW-SRV-1", 40), ("ASW-SRV-2", 40),
        ("ASW-ADM-1", 50), ("ASW-ADM-2", 70),
    ]

    for asw_name, default_vlan in asw_info:
        ovs_startup = [
            "#!/bin/bash",
            "service openvswitch-switch start",
            "ovs-vsctl add-br br0 -- set bridge br0 datapath_type=netdev",
            "ovs-vsctl set Bridge br0 rstp_enable=true",
            "ip link set br0 up",
            "",
            "# Trunk ports to DSW1 and DSW2",
            "ip link set eth0 up",
            "ip link set eth1 up",
            "ovs-vsctl add-port br0 eth0 trunks=10,20,30,40,50,60,70,80",
            "ovs-vsctl add-port br0 eth1 trunks=10,20,30,40,50,60,70,80",
            ""
        ]

        if asw_name == "ASW-SRV-1":
            ovs_startup.extend([
                "ip link set eth2 up && ovs-vsctl add-port br0 eth2 tag=40 # EXAM-WEB-1",
                "ip link set eth3 up && ovs-vsctl add-port br0 eth3 tag=40 # DHCP-DNS-1",
                "ip link set eth4 up && ovs-vsctl add-port br0 eth4 tag=40 # NET-MON"
            ])
        elif asw_name == "ASW-SRV-2":
            ovs_startup.extend([
                "ip link set eth2 up && ovs-vsctl add-port br0 eth2 tag=40 # EXAM-WEB-2",
                "ip link set eth3 up && ovs-vsctl add-port br0 eth3 tag=40 # DHCP-DNS-2"
            ])
        elif asw_name == "ASW-ADM-1":
            ovs_startup.extend([
                "ip link set eth2 up && ovs-vsctl add-port br0 eth2 tag=50 # PC-ADM-1",
                "ip link set eth3 up && ovs-vsctl add-port br0 eth3 tag=60 # PC-FAC-1"
            ])
        elif asw_name == "ASW-ADM-2":
            ovs_startup.extend([
                "ip link set eth2 up && ovs-vsctl add-port br0 eth2 tag=70 # PC-MGMT-1",
                "ip link set eth3 up && ovs-vsctl add-port br0 eth3 tag=80 # PC-GST-1"
            ])
        else:
            ovs_startup.append(f"ip link set eth2 up && ovs-vsctl add-port br0 eth2 tag={default_vlan}")

        (out / f"{asw_name}.startup").write_text("\n".join(ovs_startup), encoding="utf-8")

    # 6. Examination Web Servers (EXAM-WEB-1 and EXAM-WEB-2)
    for w_name, is_w1 in [("EXAM-WEB-1", True), ("EXAM-WEB-2", False)]:
        w_dir = out / w_name
        create_dir(w_dir / "etc" / "keepalived")
        create_dir(w_dir / "var" / "www" / "html")

        # VRRP Config
        prio = 110 if is_w1 else 90
        state = "MASTER" if is_w1 else "BACKUP"
        kv_cfg = (
            "global_defs {\n"
            f"    router_id {w_name}\n"
            "    enable_script_security\n"
            "}\n"
            "vrrp_instance VI_EXAM_SERVICE {\n"
            f"    state {state}\n"
            "    interface eth0\n"
            "    virtual_router_id 40\n"
            f"    priority {prio}\n"
            "    advert_int 1\n"
            "    virtual_ipaddress {\n"
            "        10.20.10.210/27\n"
            "    }\n"
            "}\n"
        )
        (w_dir / "etc" / "keepalived" / "keepalived.conf").write_text(kv_cfg, encoding="utf-8")

        # HTML demonstration page
        html_content = (
            f"<!DOCTYPE html><html><head><title>University Online Examination Portal</title></head>\n"
            f"<body style='font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:40px;'>\n"
            f"<h1>University Online Examination System</h1>\n"
            f"<p>Connected to Server Node: <strong>{w_name}</strong></p>\n"
            f"<p>Service Virtual IP: <strong>10.20.10.210</strong></p>\n"
            f"<p>Status: <strong>Active Online Exam Session Verified</strong></p>\n"
            f"</body></html>\n"
        )
        (w_dir / "var" / "www" / "html" / "index.html").write_text(html_content, encoding="utf-8")

        ip_addr = "10.20.10.200" if is_w1 else "10.20.10.201"
        (out / f"{w_name}.startup").write_text(
            f"ip addr add {ip_addr}/27 dev eth0\n"
            "ip link set eth0 up\n"
            "ip route add default via 10.20.10.193\n"
            "service nginx start\n"
            "sleep 1\n"
            "service keepalived start\n",
            encoding="utf-8"
        )

    # 7. DHCP & DNS Servers (DHCP-DNS-1 & DHCP-DNS-2)
    for d_name, is_d1 in [("DHCP-DNS-1", True), ("DHCP-DNS-2", False)]:
        d_dir = out / d_name
        create_dir(d_dir / "etc")

        # dnsmasq config with non-overlapping scopes
        dns_lines = [
            "port=53",
            "domain=university.test",
            "address=/exam.university.test/10.20.10.210",
            "address=/ns1.university.test/10.20.10.202",
            "address=/ns2.university.test/10.20.10.203",
            ""
        ]
        
        # Scopes: Pool A on Server 1, Pool B on Server 2
        for v in vlans:
            if v.get("dhcp_enabled"):
                pool = v["dhcp_pool_a"] if is_d1 else v["dhcp_pool_b"]
                netmask = v["netmask"]
                gateway = v["gateway_vip"]
                dns_lines.append(f"dhcp-range=set:vlan{v['id']},{pool['start']},{pool['end']},{netmask},12h")
                dns_lines.append(f"dhcp-option=tag:vlan{v['id']},option:router,{gateway}")
                dns_lines.append(f"dhcp-option=tag:vlan{v['id']},option:dns-server,10.20.10.202,10.20.10.203")

        (d_dir / "etc" / "dnsmasq.conf").write_text("\n".join(dns_lines), encoding="utf-8")

        ip_addr = "10.20.10.202" if is_d1 else "10.20.10.203"
        (out / f"{d_name}.startup").write_text(
            f"ip addr add {ip_addr}/27 dev eth0\n"
            "ip link set eth0 up\n"
            "ip route add default via 10.20.10.193\n"
            "dnsmasq -C /etc/dnsmasq.conf\n",
            encoding="utf-8"
        )

    # 8. External TEST-SERVER
    create_dir(out / "TEST-SERVER" / "var" / "www" / "html")
    (out / "TEST-SERVER" / "var" / "www" / "html" / "index.html").write_text(
        "<html><body><h1>Simulated External Internet Server (198.51.100.10)</h1></body></html>\n",
        encoding="utf-8"
    )
    (out / "TEST-SERVER.startup").write_text(
        "ip addr add 198.51.100.10/24 dev eth0\n"
        "ip link set eth0 up\n"
        "ip route add default via 198.51.100.1\n"
        "python3 -m http.server 80 -d /var/www/html &\n",
        encoding="utf-8"
    )

    # 9. NET-MON
    (out / "NET-MON.startup").write_text(
        "ip addr add 10.20.10.204/27 dev eth0\n"
        "ip link set eth0 up\n"
        "ip route add default via 10.20.10.193\n",
        encoding="utf-8"
    )

    # 10. Workstation Endpoints (Static/Fallback initialization)
    for ep in spec["devices"]["endpoints"]:
        eid = ep["id"]
        ip_with_prefix = ep["fallback_ip"]
        gw = ep["gateway"]
        (out / f"{eid}.startup").write_text(
            f"ip addr add {ip_with_prefix} dev eth0\n"
            "ip link set eth0 up\n"
            f"ip route add default via {gw}\n"
            "echo 'nameserver 10.20.10.202' > /etc/resolv.conf\n"
            "echo 'nameserver 10.20.10.203' >> /etc/resolv.conf\n",
            encoding="utf-8"
        )

    print(f"[SUCCESS] Complete Kathara Lab generated in {out_dir}/")

def create_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)

if __name__ == "__main__":
    generate_kathara_lab()

