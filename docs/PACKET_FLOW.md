# End-to-End Packet Flow Analysis & Header Decapsulation

This document details the exact hop-by-hop traversal, protocol handshakes, and Layer 2/3 header modifications occurring during standard examination operations.

---

## Journey 1: Student Station to Exam Web Cluster VIP (Inter-VLAN)

**Scenario:** `PC-LAB-A1` (`10.20.20.10`) accesses `http://exam.campus.internal` (`10.20.10.210:80`).

```
[PC-LAB-A1] ──(Untagged)──> [ASW-LAB-A1] ──(802.1Q Tag:20)──> [DSW-1] ──(802.1Q Tag:10)──> [ASW-SRV-1] ──(Untagged)──> [SRV-WEB-1]
```

### Hop 1: PC-LAB-A1 (Layer 3 Routing Decision & ARP Resolution)
1. **Target Evaluation:** `10.20.10.210` is outside local subnet `10.20.20.0/23`.
2. **Next-Hop Selection:** Default gateway is set to VRRP VIP `10.20.20.1`.
3. **ARP Lookup:** PC checks its ARP cache for `10.20.20.1`.
   - If missing: Sends broadcast ARP Request (`Who has 10.20.20.1? Tell 10.20.20.10`).
   - `DSW-1` (VRRP Master) replies with Virtual MAC: `00:00:5E:00:01:14`.
4. **Frame Assembly:**
   - Layer 2: `Src MAC: 02:42:0A:14:14:0A` | `Dst MAC: 00:00:5E:00:01:14` | `EtherType: 0x0800 (IPv4)`
   - Layer 3: `Src IP: 10.20.20.10` | `Dst IP: 10.20.10.210` | `TTL: 64` | `Proto: 6 (TCP)`
   - Layer 4: `Src Port: 49152` | `Dst Port: 80` | `Flags: [SYN]`

### Hop 2: ASW-LAB-A1 (Layer 2 Access-to-Trunk Ingress)
1. Frame enters port `eth1` (configured in Access mode for VLAN 20).
2. Switch tags frame with IEEE 802.1Q header: `VLAN ID = 20`, `Priority = 0`.
3. Forwarded out trunk port `eth0` toward `DSW-1`.

### Hop 3: DSW-1 (Inter-VLAN Routing & ACL Enforcement)
1. Frame arrives on trunk interface `eth0` with 802.1Q Tag 20.
2. Ingress processing strips VLAN 20 tag and delivers packet to SVI `vlan20`.
3. **ACL Check:** Inbound ACL on VLAN 20 permits TCP port 80 to `10.20.10.210`.
4. **Routing Engine:**
   - Destination `10.20.10.210` matches directly connected route `10.20.10.0/24` on SVI `vlan10`.
   - Decrements TTL: `64 -> 63`.
   - Recalculates IPv4 header checksum.
5. **Egress Framing:**
   - Layer 2 rewritten with: `Src MAC = 00:00:5E:00:01:0A` (VLAN 10 Virtual MAC) | `Dst MAC = 02:42:0A:14:0A:D2` (`SRV-WEB-1`).
   - 802.1Q Tag `10` inserted onto outgoing trunk frame toward `ASW-SRV-1`.

### Hop 4: ASW-SRV-1 to SRV-WEB-1
1. Access switch receives tagged VLAN 10 frame on trunk.
2. Strips 802.1Q tag and forwards out access port `eth1` to `SRV-WEB-1`.
3. `SRV-WEB-1` Linux kernel matches cluster VIP `10.20.10.210`, answers with TCP `[SYN, ACK]`.
4. Reverse path follows symmetric return routing back to `PC-LAB-A1`.

---

## Journey 2: DHCP Address Lease Acquisition (DORA with Relay)

```
[Unconfigured PC] ──(Broadcast)──> [ASW] ──(Trunk)──> [DSW-1 Relay] ──(Unicast UDP)──> [SRV-DNS-DHCP]
```

1. **DHCP DISCOVER (Layer 2/3 Broadcast):**
   - `Src MAC: PC-MAC` | `Dst MAC: FF:FF:FF:FF:FF:FF`
   - `Src IP: 0.0.0.0` | `Dst IP: 255.255.255.255` | `UDP 68 -> 67`
2. **DSW-1 Relay Interception:**
   - SVI `vlan20` intercepts UDP 67 broadcast.
   - Encapsulates payload into a unicast IPv4 packet:
     - `Src IP: 10.20.20.2` (DSW-1 SVI IP)
     - `Dst IP: 10.20.10.5` (`SRV-DNS-DHCP`)
     - `giaddr: 10.20.20.2`
3. **Server Allocation & DHCP OFFER:**
   - `SRV-DNS-DHCP` sees `giaddr = 10.20.20.2`, maps to `dhcp-range=set:vlan20,10.20.20.10,10.20.21.250`.
   - Offers IP `10.20.20.15`, subnet mask `255.255.254.0`, gateway `10.20.20.1`, DNS `10.20.10.5`.
4. **DHCP REQUEST & ACK:**
   - Client requests the lease; server registers lease and confirms with DHCP ACK.

