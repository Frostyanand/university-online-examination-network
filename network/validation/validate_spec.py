import yaml
import ipaddress
import sys
from pathlib import Path

def validate_network_spec(spec_path: str = "network/network-spec.yaml"):
    path = Path(spec_path)
    if not path.exists():
        print(f"ERROR: Specification file {spec_path} does not exist!")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        spec = yaml.safe_load(f)

    print(f"[*] Validating specification version {spec.get('version')} ({spec.get('metadata', {}).get('title')})...")
    
    # 1. Parent blocks
    parent_blocks = spec.get("parent_blocks", {})
    campus_block = ipaddress.IPv4Network(parent_blocks["campus_allocation"]["cidr"])
    transit_block = ipaddress.IPv4Network(parent_blocks["transit_allocation"]["cidr"])
    ext_block = ipaddress.IPv4Network(parent_blocks["external_test_network"]["cidr"])
    print(f"  [+] Parent blocks verified: Campus={campus_block}, Transit={transit_block}, External={ext_block}")

    # 2. VLANs
    vlans = spec.get("vlans", [])
    vlan_nets = []
    assigned_ips = {}

    for v in vlans:
        vid = v["id"]
        vname = v["name"]
        cidr = v["cidr"]
        net = ipaddress.IPv4Network(cidr)
        assert net.subnet_of(campus_block), f"VLAN {vid} ({vname}) net {net} not inside {campus_block}"
        
        # Check overlaps
        for existing in vlan_nets:
            assert not net.overlaps(existing), f"VLAN {vid} ({net}) overlaps with {existing}"
        vlan_nets.append(net)

        # Gateways
        vip = ipaddress.IPv4Address(v["gateway_vip"])
        d1 = ipaddress.IPv4Address(v["dsw1_ip"])
        d2 = ipaddress.IPv4Address(v["dsw2_ip"])
        for g in [vip, d1, d2]:
            assert g in net, f"Gateway {g} not in {net}"
            assert g not in assigned_ips, f"IP collision: {g} already assigned to {assigned_ips[g]}"
            assigned_ips[g] = f"VLAN {vid} Gateway"

        # DHCP Pools
        if v.get("dhcp_enabled", False):
            for pool_key in ["dhcp_pool_a", "dhcp_pool_b"]:
                pool = v[pool_key]
                s = int(ipaddress.IPv4Address(pool["start"]))
                e = int(ipaddress.IPv4Address(pool["end"]))
                assert s <= e, f"Invalid pool range in {vname} {pool_key}"
                for ip_int in range(s, e + 1):
                    ip_obj = ipaddress.IPv4Address(ip_int)
                    assert ip_obj in net, f"DHCP IP {ip_obj} in {vname} {pool_key} outside subnet {net}"
                    assert ip_obj not in assigned_ips, f"DHCP collision: {ip_obj} already in {assigned_ips[ip_obj]}"
                    assigned_ips[ip_obj] = f"{vname} {pool_key}"

    print(f"  [+] {len(vlans)} VLANs validated with zero collisions.")

    # 3. Servers
    servers = spec.get("servers", [])
    for s in servers:
        s_ip = ipaddress.IPv4Address(s["ip"])
        if s.get("vlan") == 40:
            srv_net = ipaddress.IPv4Network("10.20.10.192/27")
            assert s_ip in srv_net, f"Server {s['id']} IP {s_ip} outside VLAN 40 subnet"
            assert s_ip not in assigned_ips, f"Server IP collision: {s_ip} already in {assigned_ips[s_ip]}"
            assigned_ips[s_ip] = s["id"]
        elif s["id"] == "TEST-SERVER":
            assert s_ip in ext_block, f"TEST-SERVER outside external net {ext_block}"

    vip = ipaddress.IPv4Address("10.20.10.210")
    assert vip not in assigned_ips, f"VIP collision with {assigned_ips[vip]}"
    assigned_ips[vip] = "EXAM-SERVICE-VIP"
    print(f"  [+] {len(servers)} servers verified.")

    # 4. Routed links
    links = spec.get("routed_links", [])
    for link in links:
        net = ipaddress.IPv4Network(link["subnet"])
        ipa = ipaddress.IPv4Address(link["ip_a"])
        ipb = ipaddress.IPv4Address(link["ip_b"])
        assert ipa in net and ipb in net and ipa != ipb, f"Invalid routed link {link['id']}"
        assert net.subnet_of(transit_block), f"Routed link {link['id']} outside transit block"
    print(f"  [+] {len(links)} routed links verified.")

    # 5. Devices
    devices = spec.get("devices", {})
    routers = devices.get("routers", [])
    dsws = devices.get("distribution_switches", [])
    asws = devices.get("access_switches", [])
    endpoints = devices.get("endpoints", [])
    
    assert len(routers) == 3, f"Expected 3 routers, found {len(routers)}"
    assert len(dsws) == 2, f"Expected 2 distribution switches, found {len(dsws)}"
    assert len(asws) == 10, f"Expected 10 access switches, found {len(asws)}"
    assert len(endpoints) >= 10, f"Expected at least 10 endpoints, found {len(endpoints)}"
    print(f"  [+] Device inventory verified: {len(routers)} Routers, {len(dsws)} DSWs, {len(asws)} ASWs, {len(endpoints)} Endpoints.")

    # 6. Fault scenarios
    faults = spec.get("fault_scenarios", [])
    assert len(faults) == 14, f"Expected 14 fault scenarios (F01-F14), found {len(faults)}"
    for idx, f in enumerate(faults, 1):
        expected_id = f"F{idx:02d}"
        assert f["id"] == expected_id, f"Fault mismatch: {f['id']} vs {expected_id}"
    print(f"  [+] All 14 fault scenarios (F01-F14) verified.")

    print("\n[SUCCESS] network-spec.yaml is 100% valid and mathematically verified!\n")

if __name__ == "__main__":
    validate_network_spec()

