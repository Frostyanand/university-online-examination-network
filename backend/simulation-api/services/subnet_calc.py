import ipaddress
from typing import Dict, Any, List

def calculate_subnet(ip_str: str, prefix: int) -> Dict[str, Any]:
    try:
        net = ipaddress.IPv4Network(f"{ip_str}/{prefix}", strict=False)
        first_octet = int(ip_str.split(".")[0])

        # IPv4 Class calculation
        if 1 <= first_octet <= 126:
            ip_class = "A"
            classful_mask = "255.0.0.0 (/8)"
        elif 128 <= first_octet <= 191:
            ip_class = "B"
            classful_mask = "255.255.0.0 (/16)"
        elif 192 <= first_octet <= 223:
            ip_class = "C"
            classful_mask = "255.255.255.0 (/24)"
        elif 224 <= first_octet <= 239:
            ip_class = "D (Multicast)"
            classful_mask = "N/A"
        else:
            ip_class = "E (Experimental)"
            classful_mask = "N/A"

        # Wildcard mask calculation
        wildcard_int = int(net.hostmask)
        wildcard_str = str(ipaddress.IPv4Address(wildcard_int))

        hosts = list(net.hosts())
        first_h = str(hosts[0]) if hosts else str(net.network_address)
        last_h = str(hosts[-1]) if hosts else str(net.broadcast_address)
        usable_count = len(hosts)

        # Binary netmask
        binary_mask = "".join(f"{int(o):08b}." for o in str(net.netmask).split(".")).rstrip(".")

        return {
            "ip_address": ip_str,
            "prefix_length": prefix,
            "netmask": str(net.netmask),
            "wildcard_mask": wildcard_str,
            "network_address": str(net.network_address),
            "broadcast_address": str(net.broadcast_address),
            "first_usable": first_h,
            "last_usable": last_h,
            "total_addresses": net.num_addresses,
            "usable_hosts": usable_count,
            "ipv4_class": ip_class,
            "classful_mask": classful_mask,
            "is_private": net.is_private,
            "binary_netmask": binary_mask
        }
    except Exception as e:
        return {"error": f"Invalid subnet parameter: {str(e)}"}

def calculate_vlsm_vs_flsm_comparison() -> Dict[str, Any]:
    parent_block = ipaddress.IPv4Network("10.20.10.0/23")
    total_parent_addresses = parent_block.num_addresses  # 512

    # VLSM Allocation in current project:
    # 3 x /26 (Labs A, B, C) = 3 * 64 = 192 addresses
    # 5 x /27 (Servers, Admin, Faculty, Mgmt, Guest) = 5 * 32 = 160 addresses
    # Total VLSM consumed: 352 addresses
    vlsm_consumed = 352
    vlsm_usable = (3 * 62) + (5 * 30)  # 186 + 150 = 336 usable host addresses
    vlsm_unallocated = total_parent_addresses - vlsm_consumed  # 160 addresses free for future expansion

    # FLSM Allocation (Fixed Subnetting for 8 VLANs):
    # If all 8 segments were allocated equal /26 subnets:
    # 8 * 64 = 512 addresses (100% of the /23 block consumed immediately!)
    flsm_consumed = 512
    flsm_usable = 8 * 62  # 496 usable
    flsm_unallocated = 0  # Zero addresses left for future growth!

    # Wastage calculation for the 5 smaller segments under FLSM:
    # Each smaller segment only needs ~15 hosts. A /26 gives 62 usable, wasting ~45 addresses per segment!
    # Under VLSM, each smaller segment gets /27 (30 usable), saving 32 addresses per smaller segment (160 addresses total).
    addresses_saved_by_vlsm = 160

    return {
        "parent_block": "10.20.10.0/23 (512 total addresses)",
        "vlsm": {
            "subnets_allocated": 8,
            "sizes": "3x /26 (64 addrs each), 5x /27 (32 addrs each)",
            "total_consumed": vlsm_consumed,
            "usable_host_capacity": vlsm_usable,
            "unallocated_headroom": vlsm_unallocated,
            "utilization_pct": round((vlsm_consumed / total_parent_addresses) * 100, 1),
            "expansion_blocks": "10.20.11.96/27, 10.20.11.128/26, 10.20.12.0/22"
        },
        "flsm": {
            "subnets_allocated": 8,
            "sizes": "8x /26 (64 addresses each)",
            "total_consumed": flsm_consumed,
            "usable_host_capacity": flsm_usable,
            "unallocated_headroom": flsm_unallocated,
            "utilization_pct": 100.0,
            "expansion_blocks": "None remaining inside parent /23"
        },
        "savings": {
            "addresses_preserved": addresses_saved_by_vlsm,
            "analysis": "VLSM preserves 160 contiguous host addresses (31.25% of parent block) for future examination labs while fully accommodating all current host requirements without artificial subnet exhaustion."
        }
    }

def plan_scaling(action_type: str, lab_id: str = None, vlan_id: int = None, host_count: int = None) -> Dict[str, Any]:
    if action_type == "add_host":
        # Check capacity in existing lab
        lab_capacities = {
            "LAB-A": {"planned": 40, "usable": 59, "remaining": 19},
            "LAB-B": {"planned": 40, "usable": 59, "remaining": 19},
            "LAB-C": {"planned": 40, "usable": 59, "remaining": 19},
        }
        info = lab_capacities.get(lab_id or "LAB-A", {"planned": 40, "usable": 59, "remaining": 19})
        req_count = host_count or 1
        if req_count <= info["remaining"]:
            return {
                "action_type": "add_host",
                "is_valid": True,
                "message": f"Successfully planned addition of {req_count} host(s) to {lab_id}. Remaining headroom: {info['remaining'] - req_count}.",
                "remaining_capacity": info["remaining"] - req_count,
                "required_changes": [
                    f"Connect host(s) to access switch ASW-{lab_id.replace('LAB-', 'L')}-1 or -2",
                    "Configure DHCP lease or assign static IP in range",
                    "No VLAN or routing redeployment required"
                ]
            }
        else:
            return {
                "action_type": "add_host",
                "is_valid": False,
                "message": f"Requested {req_count} hosts exceeds remaining capacity ({info['remaining']}) in {lab_id} /26 subnet.",
                "remaining_capacity": info["remaining"],
                "required_changes": []
            }

    elif action_type == "add_lab":
        # Next contiguous unallocated /26 in 10.20.10.0/23 is 10.20.11.128/26 (or 10.20.11.96 for /27)
        # 10.20.11.96 to 10.20.11.127 is 32 addresses (/27)
        # 10.20.11.128 to 10.20.11.191 is 64 addresses (/26)
        new_cidr = "10.20.11.128/26"
        new_vlan = vlan_id or 90
        net = ipaddress.IPv4Network(new_cidr)
        hosts = list(net.hosts())

        return {
            "action_type": "add_lab",
            "is_valid": True,
            "message": f"Successfully planned Lab D expansion into reserved parent block.",
            "allocated_cidr": new_cidr,
            "allocated_ips": [
                f"Gateway VIP: {hosts[0]}",
                f"DSW1 SVI: {hosts[1]}",
                f"DSW2 SVI: {hosts[2]}",
                f"DHCP Pool A: {hosts[9]} - {hosts[33]} (25 leases)",
                f"DHCP Pool B: {hosts[34]} - {hosts[58]} (25 leases)"
            ],
            "remaining_capacity": 64,  # 10.20.11.192/26 still remains in parent block!
            "required_changes": [
                f"1. Create VLAN {new_vlan} on DSW1 and DSW2",
                f"2. Add SVI Vlan{new_vlan} with HSRP/VRRP VIP {hosts[0]}",
                f"3. Provision paired access switches ASW-LD-1 and ASW-LD-2",
                f"4. Add trunk uplinks to DSW1 and DSW2 allowing VLAN {new_vlan}",
                f"5. Configure DHCP relays forwarding to 10.20.10.202 and 10.20.10.203",
                f"6. OSPF Area 0 automatically covers new subnet under 10.20.10.0/23 summary"
            ]
        }

    return {"is_valid": False, "message": f"Unknown scaling action: {action_type}"}

