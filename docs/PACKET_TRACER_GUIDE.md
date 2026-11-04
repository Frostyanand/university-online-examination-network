# Cisco Packet Tracer Deployment & Verification Guide (Deliverable A)

## 1. Overview & Artifact Locations

Deliverable A is a standalone, fully configured Cisco Packet Tracer environment that reproduces the complete university examination network architecture without manual GUI cable placement.

### Generated Deliverable A Files
- **Primary Packet Tracer Lab File:**
  `artifacts/cisco/university_online_examination_network.pkt` (127,658 bytes)
- **High-Resolution Topology Diagram:**
  `artifacts/cisco/topology.svg`
- **Device Inventory Export:**
  `artifacts/cisco/device-inventory.csv`
- **IP Addressing Allocation Export:**
  `artifacts/cisco/ip-addressing.csv`
- **Raw Cisco IOS Configuration Backups:**
  `packet-tracer/device-configs/*.cfg` (15 standalone Cisco IOS config files)

---

## 2. Opening & Compatibility

### Supported Cisco Packet Tracer Versions
- Cisco Packet Tracer 8.0
- Cisco Packet Tracer 8.1
- Cisco Packet Tracer 8.2 & 8.2.1+

### Opening Instructions
1. Launch **Cisco Packet Tracer**.
2. Go to **File -> Open** (or press `Ctrl + O`).
3. Navigate to and select:
   `c:\Vault 1\Frosty Coder\Micro Projects\CN_Project\artifacts\cisco\university_online_examination_network.pkt`
4. The workspace will load with all **31 devices placed in a clean hierarchical layout**, cabled with Copper Straight-Through and Cross-Over connections, with green link indicators across all active segments.

---

## 3. Step-by-Step IOS Verification Commands

Open the CLI tab on the designated devices in Packet Tracer to verify network convergence:

### Step 1: Verify Core OSPF Adjacencies (`R-CORE-1`)
```ios
R-CORE-1# show ip ospf neighbor
```
*Expected Output:* Three neighbors (`R-CORE-2` on `10.20.0.2`, `DSW-1` on `10.20.0.6`, `DSW-2` on `10.20.0.10`) all displaying state `FULL/DR` or `FULL/BDR`.

### Step 2: Verify Routing Table on Core Router (`R-CORE-1`)
```ios
R-CORE-1# show ip route ospf
```
*Expected Output:* OSPF routes for all student VLAN subnets (`10.20.10.0/24`, `10.20.20.0/23`, `10.20.30.0/24`, `10.20.40.0/24`) learned via equal-cost distribution paths.

### Step 3: Verify HSRP Gateway Redundancy (`DSW-1` & `DSW-2`)
```ios
DSW-1# show standby brief
```
*Expected Output:*
```
                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Vl10        10   110 P Active  local           10.20.10.3      10.20.10.1
Vl20        20   110 P Active  local           10.20.20.3      10.20.20.1
Vl30        30   110 P Active  local           10.20.30.3      10.20.30.1
Vl40        40   110 P Active  local           10.20.40.3      10.20.40.1
```
On `DSW-2`:
```ios
DSW-2# show standby brief
```
*Expected Output:* State for all VLAN groups should be `Standby`, with `Active` pointing to `10.20.x.2` (`DSW-1`).

### Step 4: Verify Spanning Tree Root Bridge (`ASW-LAB-A1`)
```ios
ASW-LAB-A1# show spanning-tree
```
*Expected Output:* Root ID points to `DSW-1` (`priority 4096`). Root Port is `GigabitEthernet0/1` (uplink to `DSW-1`), and `GigabitEthernet0/2` (uplink to `DSW-2`) is in `Altn / BLK` (Alternate / Blocking) state.

### Step 5: Test Client Connectivity from Workstation
Click on `PC-LAB-A1`, navigate to **Desktop -> Command Prompt**, and execute:
```shell
PC> ping 10.20.20.1
```
*(Tests default gateway ping to HSRP Virtual IP)*
```shell
PC> ping 10.20.10.10
```
*(Tests inter-VLAN routing to Exam Web Server 1)*

### Step 6: Test HSRP Live Failover in Packet Tracer
1. On `DSW-1`, enter interface configuration and shut down VLAN 20:
   ```ios
   DSW-1# configure terminal
   DSW-1(config)# interface vlan 20
   DSW-1(config-if)# shutdown
   ```
2. Switch to `DSW-2` CLI:
   Notice the syslog message:
   `%HSRP-5-STATECHANGE: Vlan20 Grp 20 state Standby -> Active`
3. On `PC-LAB-A1`, re-run `ping 10.20.10.10`. Pings continue without interruption via `DSW-2`!
4. Bring `DSW-1` VLAN 20 back up with `no shutdown`. Because `standby 20 preempt` is configured, `DSW-1` automatically reclaims `Active` state!

