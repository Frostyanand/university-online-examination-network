import ipaddress

def audit_addressing():
    print("=== 1. AUDITING SUBNETS AND ADDRESS RANGES ===")
    parent_block = ipaddress.IPv4Network("10.20.10.0/23")
    print(f"Parent block: {parent_block} (Net: {parent_block.network_address}, Bcast: {parent_block.broadcast_address}, Hosts: {parent_block.num_addresses})")
    
    subnets = {
        "VLAN 10 (LAB-A)": "10.20.10.0/26",
        "VLAN 20 (LAB-B)": "10.20.10.64/26",
        "VLAN 30 (LAB-C)": "10.20.10.128/26",
        "VLAN 40 (SERVERS)": "10.20.10.192/27",
        "VLAN 50 (ADMIN)": "10.20.10.224/27",
        "VLAN 60 (FACULTY)": "10.20.11.0/27",
        "VLAN 70 (NET-MGMT)": "10.20.11.32/27",
        "VLAN 80 (GUEST)": "10.20.11.64/27",
    }
    
    parsed = {}
    for name, cidr in subnets.items():
        net = ipaddress.IPv4Network(cidr)
        parsed[name] = net
        hosts = list(net.hosts())
        first_h = hosts[0]
        last_h = hosts[-1]
        print(f"{name}: CIDR={net}, Mask={net.netmask}, Net={net.network_address}, First={first_h}, Last={last_h}, Bcast={net.broadcast_address}, Total={net.num_addresses}, Usable={len(hosts)}")
        assert net.subnet_of(parent_block), f"{name} is not in parent block {parent_block}"
    
    print("\n=== 2. OVERLAP CHECK BETWEEN SUBNETS ===")
    net_list = list(parsed.items())
    for i in range(len(net_list)):
        for j in range(i+1, len(net_list)):
            n1_name, n1 = net_list[i]
            n2_name, n2 = net_list[j]
            overlap = n1.overlaps(n2)
            print(f"Checking {n1_name} vs {n2_name}: Overlap = {overlap}")
            assert not overlap, f"Collision between {n1_name} and {n2_name}!"
            
    print("\n=== 3. AUDITING GATEWAYS & SVIs ===")
    gateways = {
        "VLAN 10": {"vip": "10.20.10.1", "dsw1": "10.20.10.2", "dsw2": "10.20.10.3", "net": parsed["VLAN 10 (LAB-A)"]},
        "VLAN 20": {"vip": "10.20.10.65", "dsw1": "10.20.10.66", "dsw2": "10.20.10.67", "net": parsed["VLAN 20 (LAB-B)"]},
        "VLAN 30": {"vip": "10.20.10.129", "dsw1": "10.20.10.130", "dsw2": "10.20.10.131", "net": parsed["VLAN 30 (LAB-C)"]},
        "VLAN 40": {"vip": "10.20.10.193", "dsw1": "10.20.10.194", "dsw2": "10.20.10.195", "net": parsed["VLAN 40 (SERVERS)"]},
        "VLAN 50": {"vip": "10.20.10.225", "dsw1": "10.20.10.226", "dsw2": "10.20.10.227", "net": parsed["VLAN 50 (ADMIN)"]},
        "VLAN 60": {"vip": "10.20.11.1", "dsw1": "10.20.11.2", "dsw2": "10.20.11.3", "net": parsed["VLAN 60 (FACULTY)"]},
        "VLAN 70": {"vip": "10.20.11.33", "dsw1": "10.20.11.34", "dsw2": "10.20.11.35", "net": parsed["VLAN 70 (NET-MGMT)"]},
        "VLAN 80": {"vip": "10.20.11.65", "dsw1": "10.20.11.66", "dsw2": "10.20.11.67", "net": parsed["VLAN 80 (GUEST)"]},
    }
    
    for vlan, data in gateways.items():
        v = ipaddress.IPv4Address(data["vip"])
        d1 = ipaddress.IPv4Address(data["dsw1"])
        d2 = ipaddress.IPv4Address(data["dsw2"])
        net = data["net"]
        assert v in net, f"{vlan} VIP {v} not in {net}"
        assert d1 in net, f"{vlan} DSW1 {d1} not in {net}"
        assert d2 in net, f"{vlan} DSW2 {d2} not in {net}"
        assert len({v, d1, d2}) == 3, f"{vlan} duplicate addresses among VIP and SVIs!"
        print(f"{vlan} Gateways: VIP={v}, DSW1={d1}, DSW2={d2} are valid inside {net}")

    print("\n=== 4. AUDITING DHCP POOLS AND STATIC RESERVATIONS ===")
    dhcp_pools = {
        "VLAN 10 Pool A": ("10.20.10.10", "10.20.10.34", parsed["VLAN 10 (LAB-A)"]),
        "VLAN 10 Pool B": ("10.20.10.35", "10.20.10.59", parsed["VLAN 10 (LAB-A)"]),
        "VLAN 20 Pool A": ("10.20.10.74", "10.20.10.98", parsed["VLAN 20 (LAB-B)"]),
        "VLAN 20 Pool B": ("10.20.10.99", "10.20.10.123", parsed["VLAN 20 (LAB-B)"]),
        "VLAN 30 Pool A": ("10.20.10.138", "10.20.10.162", parsed["VLAN 30 (LAB-C)"]),
        "VLAN 30 Pool B": ("10.20.10.163", "10.20.10.187", parsed["VLAN 30 (LAB-C)"]),
        "VLAN 50 Pool A": ("10.20.10.230", "10.20.10.239", parsed["VLAN 50 (ADMIN)"]),
        "VLAN 50 Pool B": ("10.20.10.240", "10.20.10.249", parsed["VLAN 50 (ADMIN)"]),
        "VLAN 60 Pool A": ("10.20.11.10", "10.20.11.19", parsed["VLAN 60 (FACULTY)"]),
        "VLAN 60 Pool B": ("10.20.11.20", "10.20.11.29", parsed["VLAN 60 (FACULTY)"]),
        "VLAN 80 Pool A": ("10.20.11.70", "10.20.11.79", parsed["VLAN 80 (GUEST)"]),
        "VLAN 80 Pool B": ("10.20.11.80", "10.20.11.89", parsed["VLAN 80 (GUEST)"]),
    }
    
    assigned_ips = {}
    for pool_name, (start_str, end_str, net) in dhcp_pools.items():
        s = int(ipaddress.IPv4Address(start_str))
        e = int(ipaddress.IPv4Address(end_str))
        assert s <= e
        count = e - s + 1
        print(f"{pool_name}: {start_str} to {end_str} ({count} leases)")
        for ip_int in range(s, e + 1):
            ip_obj = ipaddress.IPv4Address(ip_int)
            assert ip_obj in net, f"{ip_obj} in {pool_name} outside {net}"
            assert ip_obj not in assigned_ips, f"Collision: {ip_obj} in {pool_name} already in {assigned_ips[ip_obj]}"
            assigned_ips[ip_obj] = pool_name
            
    print("\n=== 5. AUDITING SERVER AND INFRASTRUCTURE ADDRESSES ===")
    static_servers = {
        "DSW1 VLAN 40 SVI": "10.20.10.194",
        "DSW2 VLAN 40 SVI": "10.20.10.195",
        "EXAM-WEB-1": "10.20.10.200",
        "EXAM-WEB-2": "10.20.10.201",
        "DHCP-DNS-1": "10.20.10.202",
        "DHCP-DNS-2": "10.20.10.203",
        "NET-MON": "10.20.10.204",
        "EXAM service VIP": "10.20.10.210",
    }
    server_net = parsed["VLAN 40 (SERVERS)"]
    for s_name, s_ip_str in static_servers.items():
        ip_obj = ipaddress.IPv4Address(s_ip_str)
        assert ip_obj in server_net, f"{s_name} ({ip_obj}) outside {server_net}"
        assert ip_obj not in assigned_ips, f"{s_name} overlaps with DHCP pool!"
        assigned_ips[ip_obj] = s_name
        print(f"{s_name}: {ip_obj} verified in {server_net}")

    print("\n=== 6. AUDITING TRANSIT P2P LINKS ===")
    transit_links = {
        "EDGE-R1 - ISP1": ("10.20.255.0/30", "10.20.255.1", "10.20.255.2"),
        "EDGE-R2 - ISP1": ("10.20.255.4/30", "10.20.255.5", "10.20.255.6"),
        "DSW1 - EDGE-R1": ("10.20.255.8/30", "10.20.255.9", "10.20.255.10"),
        "DSW1 - EDGE-R2": ("10.20.255.12/30", "10.20.255.13", "10.20.255.14"),
        "DSW2 - EDGE-R1": ("10.20.255.16/30", "10.20.255.17", "10.20.255.18"),
        "DSW2 - EDGE-R2": ("10.20.255.20/30", "10.20.255.21", "10.20.255.22"),
    }
    transit_parent = ipaddress.IPv4Network("10.20.255.0/24")
    transit_subnets = []
    for l_name, (cidr, ip_a, ip_b) in transit_links.items():
        net = ipaddress.IPv4Network(cidr)
        assert net.subnet_of(transit_parent)
        ipa = ipaddress.IPv4Address(ip_a)
        ipb = ipaddress.IPv4Address(ip_b)
        assert ipa in net and ipb in net
        assert ipa != ipb
        for existing in transit_subnets:
            assert not net.overlaps(existing)
        transit_subnets.append(net)
        print(f"{l_name}: {net} ({ipa} <-> {ipb}) OK")

    print("\n=== 7. AUDITING EXTERNAL TEST NETWORK ===")
    ext_net = ipaddress.IPv4Network("198.51.100.0/24")
    isp1_ext = ipaddress.IPv4Address("198.51.100.1")
    test_srv = ipaddress.IPv4Address("198.51.100.10")
    assert isp1_ext in ext_net and test_srv in ext_net
    print(f"External network: {ext_net}, ISP1: {isp1_ext}, TEST-SERVER: {test_srv} OK")

    print("\nALL 7 ADDRESSING CHECKS PASSED PERFECTLY!")

if __name__ == "__main__":
    audit_addressing()

