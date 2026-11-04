import yaml
from pathlib import Path

def generate_cisco_configs(spec_path: str = "network/network-spec.yaml", out_dir: str = "packet-tracer/device-configs"):
    with open(spec_path, "r", encoding="utf-8") as f:
        spec = yaml.safe_load(f)

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    vlans = spec["vlans"]
    vlan_ids = [v["id"] for v in vlans]
    vlan_str = ",".join(str(vid) for vid in vlan_ids)

    # 1. ISP1 Configuration
    isp_cfg = [
        "hostname ISP1",
        "no ip domain-lookup",
        "!",
        "interface GigabitEthernet0/0",
        " description P2P to EDGE-R1",
        " ip address 10.20.255.2 255.255.255.252",
        " no shutdown",
        "!",
        "interface GigabitEthernet0/1",
        " description P2P to EDGE-R2",
        " ip address 10.20.255.6 255.255.255.252",
        " no shutdown",
        "!",
        "interface GigabitEthernet0/2",
        " description External Test Network Segment",
        " ip address 198.51.100.1 255.255.255.0",
        " no shutdown",
        "!",
        "ip route 10.20.10.0 255.255.254.0 10.20.255.1",
        "ip route 10.20.10.0 255.255.254.0 10.20.255.5 10",
        "!",
        "line con 0",
        " logging synchronous",
        "line vty 0 4",
        " login",
        "end"
    ]
    (out / "ISP1.cfg").write_text("\n".join(isp_cfg), encoding="utf-8")

    # 2. EDGE-R1 Configuration
    edge1_cfg = [
        "hostname EDGE-R1",
        "no ip domain-lookup",
        "!",
        "interface GigabitEthernet0/0",
        " description WAN Uplink to ISP1",
        " ip address 10.20.255.1 255.255.255.252",
        " no shutdown",
        "!",
        "interface GigabitEthernet0/1",
        " description P2P Link to DSW1",
        " ip address 10.20.255.10 255.255.255.252",
        " ip ospf 1 area 0",
        " no shutdown",
        "!",
        "interface GigabitEthernet0/2",
        " description P2P Link to DSW2",
        " ip address 10.20.255.18 255.255.255.252",
        " ip ospf 1 area 0",
        " no shutdown",
        "!",
        "router ospf 1",
        " router-id 10.20.255.1",
        " default-information originate",
        "!",
        "ip route 0.0.0.0 0.0.0.0 10.20.255.2",
        "!",
        "line con 0",
        " logging synchronous",
        "line vty 0 4",
        " login",
        "end"
    ]
    (out / "EDGE-R1.cfg").write_text("\n".join(edge1_cfg), encoding="utf-8")

    # 3. EDGE-R2 Configuration
    edge2_cfg = [
        "hostname EDGE-R2",
        "no ip domain-lookup",
        "!",
        "interface GigabitEthernet0/0",
        " description WAN Uplink to ISP1",
        " ip address 10.20.255.5 255.255.255.252",
        " no shutdown",
        "!",
        "interface GigabitEthernet0/1",
        " description P2P Link to DSW1",
        " ip address 10.20.255.14 255.255.255.252",
        " ip ospf 1 area 0",
        " no shutdown",
        "!",
        "interface GigabitEthernet0/2",
        " description P2P Link to DSW2",
        " ip address 10.20.255.22 255.255.255.252",
        " ip ospf 1 area 0",
        " no shutdown",
        "!",
        "router ospf 1",
        " router-id 10.20.255.5",
        " default-information originate",
        "!",
        "ip route 0.0.0.0 0.0.0.0 10.20.255.6",
        "!",
        "line con 0",
        " logging synchronous",
        "line vty 0 4",
        " login",
        "end"
    ]
    (out / "EDGE-R2.cfg").write_text("\n".join(edge2_cfg), encoding="utf-8")

    # 4. Distribution Switches (DSW1 & DSW2)
    for dsw_name, is_dsw1 in [("DSW1", True), ("DSW2", False)]:
        cfg = [
            f"hostname {dsw_name}",
            "ip routing",
            "no ip domain-lookup",
            "spanning-tree mode rapid-pvst",
            "!",
        ]
        if is_dsw1:
            cfg.append("spanning-tree vlan 10,30,50,70 root primary")
            cfg.append("spanning-tree vlan 20,40,60,80 root secondary")
        else:
            cfg.append("spanning-tree vlan 20,40,60,80 root primary")
            cfg.append("spanning-tree vlan 10,30,50,70 root secondary")
        cfg.append("!")

        # VLAN definitions
        for v in vlans:
            cfg.extend([
                f"vlan {v['id']}",
                f" name {v['name']}",
                "!"
            ])

        # Trunk to partner DSW
        cfg.extend([
            "interface GigabitEthernet0/1",
            f" description Inter-Switch Trunk to {'DSW2' if is_dsw1 else 'DSW1'}",
            " switchport trunk encapsulation dot1q",
            " switchport mode trunk",
            f" switchport trunk allowed vlan {vlan_str}",
            " no shutdown",
            "!"
        ])

        # Routed ports to EDGE routers
        if is_dsw1:
            cfg.extend([
                "interface GigabitEthernet0/2",
                " description Routed Link to EDGE-R1",
                " no switchport",
                " ip address 10.20.255.9 255.255.255.252",
                " ip ospf 1 area 0",
                " no shutdown",
                "!",
                "interface FastEthernet0/24",
                " description Routed Link to EDGE-R2",
                " no switchport",
                " ip address 10.20.255.13 255.255.255.252",
                " ip ospf 1 area 0",
                " no shutdown",
                "!"
            ])
        else:
            cfg.extend([
                "interface GigabitEthernet0/2",
                " description Routed Link to EDGE-R1",
                " no switchport",
                " ip address 10.20.255.17 255.255.255.252",
                " ip ospf 1 area 0",
                " no shutdown",
                "!",
                "interface FastEthernet0/24",
                " description Routed Link to EDGE-R2",
                " no switchport",
                " ip address 10.20.255.21 255.255.255.252",
                " ip ospf 1 area 0",
                " no shutdown",
                "!"
            ])

        # Uplink Trunks to 10 Access Switches (FastEthernet0/1 to 0/10)
        asw_list = [
            "ASW-LA-1", "ASW-LA-2", "ASW-LB-1", "ASW-LB-2", "ASW-LC-1",
            "ASW-LC-2", "ASW-SRV-1", "ASW-SRV-2", "ASW-ADM-1", "ASW-ADM-2"
        ]
        for idx, asw_name in enumerate(asw_list, 1):
            cfg.extend([
                f"interface FastEthernet0/{idx}",
                f" description Trunk Uplink to {asw_name}",
                " switchport trunk encapsulation dot1q",
                " switchport mode trunk",
                f" switchport trunk allowed vlan {vlan_str}",
                " no shutdown",
                "!"
            ])

        # SVIs with HSRP
        for v in vlans:
            vid = v["id"]
            ip_addr = v["dsw1_ip"] if is_dsw1 else v["dsw2_ip"]
            mask = v["netmask"]
            vip = v["gateway_vip"]
            is_active = (v["primary_gateway"] == "DSW1") if is_dsw1 else (v["primary_gateway"] == "DSW2")
            priority = 110 if is_active else 90

            cfg.extend([
                f"interface Vlan{vid}",
                f" description {v['name']} Gateway SVI",
                f" ip address {ip_addr} {mask}",
                f" standby {vid} ip {vip}",
                f" standby {vid} priority {priority}",
                f" standby {vid} preempt",
            ])
            if v.get("dhcp_enabled", False):
                cfg.append(" ip helper-address 10.20.10.202")
                cfg.append(" ip helper-address 10.20.10.203")
            cfg.extend([" no shutdown", "!"])

        # OSPF Configuration
        r_id = "10.20.255.9" if is_dsw1 else "10.20.255.17"
        cfg.extend([
            "router ospf 1",
            f" router-id {r_id}",
            " network 10.20.10.0 0.0.1.255 area 0",
            " passive-interface default",
            " no passive-interface GigabitEthernet0/2",
            " no passive-interface FastEthernet0/24",
            "!"
        ])

        # Extended ACLs
        cfg.extend([
            "ip access-list extended ACL-STUDENT-ACCESS",
            " permit tcp 10.20.10.0 0.0.0.191 host 10.20.10.210 eq 443",
            " permit tcp 10.20.10.0 0.0.0.191 host 10.20.10.210 eq 80",
            " permit udp 10.20.10.0 0.0.0.191 host 10.20.10.202 eq 53",
            " permit udp 10.20.10.0 0.0.0.191 host 10.20.10.203 eq 53",
            " permit udp any eq 68 any eq 67",
            " deny ip 10.20.10.0 0.0.0.191 10.20.11.32 0.0.0.31",
            " permit icmp 10.20.10.0 0.0.0.191 10.20.10.0 0.0.1.255",
            "!",
            "ip access-list extended ACL-GUEST-ISOLATION",
            " deny ip 10.20.11.64 0.0.0.31 10.20.10.0 0.0.1.255",
            " permit udp 10.20.11.64 0.0.0.31 host 10.20.10.202 eq 53",
            " permit udp 10.20.11.64 0.0.0.31 host 10.20.10.203 eq 53",
            " permit ip 10.20.11.64 0.0.0.31 198.51.100.0 0.0.0.255",
            "!",
            "line con 0",
            " logging synchronous",
            "line vty 0 4",
            " login",
            "end"
        ])

        (out / f"{dsw_name}.cfg").write_text("\n".join(cfg), encoding="utf-8")

    # 5. 10 Access Switches
    asw_definitions = [
        ("ASW-LA-1", 10, "10.20.11.40"),
        ("ASW-LA-2", 10, "10.20.11.41"),
        ("ASW-LB-1", 20, "10.20.11.42"),
        ("ASW-LB-2", 20, "10.20.11.43"),
        ("ASW-LC-1", 30, "10.20.11.44"),
        ("ASW-LC-2", 30, "10.20.11.45"),
        ("ASW-SRV-1", 40, "10.20.11.46"),
        ("ASW-SRV-2", 40, "10.20.11.47"),
        ("ASW-ADM-1", 50, "10.20.11.48"),
        ("ASW-ADM-2", 70, "10.20.11.49"),
    ]

    for asw_name, default_vlan, mgmt_ip in asw_definitions:
        cfg = [
            f"hostname {asw_name}",
            "no ip domain-lookup",
            "spanning-tree mode rapid-pvst",
            "!",
        ]
        # Declare all VLANs
        for v in vlans:
            cfg.extend([
                f"vlan {v['id']}",
                f" name {v['name']}",
                "!"
            ])

        # Dual Trunks to DSW1 and DSW2
        cfg.extend([
            "interface GigabitEthernet0/1",
            " description Trunk Uplink to DSW1",
            " switchport mode trunk",
            f" switchport trunk allowed vlan {vlan_str}",
            " no shutdown",
            "!",
            "interface GigabitEthernet0/2",
            " description Trunk Uplink to DSW2",
            " switchport mode trunk",
            f" switchport trunk allowed vlan {vlan_str}",
            " no shutdown",
            "!"
        ])

        # Host Access Ports
        for p in range(1, 21):
            cfg.extend([
                f"interface FastEthernet0/{p}",
                f" description Access Port VLAN {default_vlan}",
                " switchport mode access",
                f" switchport access vlan {default_vlan}",
                " spanning-tree portfast",
                " no shutdown",
                "!"
            ])

        # Management SVI
        cfg.extend([
            "interface Vlan70",
            " description Management Interface",
            f" ip address {mgmt_ip} 255.255.255.224",
            " no shutdown",
            "!",
            "ip default-gateway 10.20.11.33",
            "!",
            "line con 0",
            " logging synchronous",
            "line vty 0 4",
            " login",
            "end"
        ])

        (out / f"{asw_name}.cfg").write_text("\n".join(cfg), encoding="utf-8")

    print(f"[SUCCESS] Generated 15 Cisco IOS device configurations in {out_dir}/")

if __name__ == "__main__":
    generate_cisco_configs()

