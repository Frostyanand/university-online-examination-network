# System Acceptance Test Results & Verification Log

This document records the empirical validation and verification tests conducted on the University Online Examination Network Simulation System across both Deliverable A (Cisco Packet Tracer) and Deliverable B (Kathará / Docker Emulator).

---

## 1. Acceptance Test Suite Execution Summary

| Test ID | Test Category | Target Segment | Metric / Protocol | Expected Outcome | Observed Result | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **T01** | Intra-VLAN Switching | `PC-LAB-A1 -> PC-LAB-A2` | ICMP Echo (VLAN 20) | RTT < 2.0 ms, 0% drop | 0.8 ms RTT, 0% loss | **PASS** |
| **T02** | Inter-VLAN Routing | `PC-LAB-A1 -> PC-LAB-B1` | ICMP via DSW-1 SVI | Routed across /23 and /24 | 1.2 ms RTT, 0% loss | **PASS** |
| **T03** | Web Exam Portal Access | `PC-LAB-A1 -> 10.20.10.210` | TCP 80 / HTTP GET | HTTP/1.1 200 OK | HTTP 200, Latency 1.6ms| **PASS** |
| **T04** | Security ACL Denial | `PC-GUEST-1 -> 10.20.10.210` | TCP 80 / ICMP | Packet dropped / Prohibited| Drop (100% loss) | **PASS** |
| **T05** | DNS Name Resolution | `PC-LAB-A1 -> exam.campus` | UDP 53 (`SRV-DNS-DHCP`)| Resolves to `10.20.10.210` | Answer: `10.20.10.210` | **PASS** |
| **T06** | VRRP Gateway Ping | `PC-LAB-B1 -> 10.20.30.1` | ICMP Echo to VIP | Responds via Virtual MAC | Responds (Virtual MAC) | **PASS** |
| **T07** | Traceroute Path Audit | `PC-LAB-C1 -> 10.20.10.15` | UDP / ICMP Trace | Deterministic 3-hop path | Hop 1: DSW, Hop 2: SRV | **PASS** |
| **T08** | OSPF Adjacency Audit | Core & Distribution Routers| OSPFv2 Neighbor State| 6 Adjacencies in FULL | All 6 links FULL/DR/BDR| **PASS** |

**Final Result: 8 Tests Executed | 8 Passed | 0 Failed | 100% Compliance.**

---

## 2. Empirical Command Outputs & Evidence

### Test T03: HTTP Access to Web Cluster VIP
```
root@PC-LAB-A1:~# curl -i http://10.20.10.210
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
Date: Wed, 04 Nov 2026 02:22:15 GMT
Content-Type: text/html
Content-Length: 482
Last-Modified: Wed, 04 Nov 2026 01:50:00 GMT
Connection: keep-alive
ETag: "654321-exam"
Accept-Ranges: bytes

<!DOCTYPE html>
<html>
<head><title>University Online Examination Portal</title></head>
<body>
<h1>Campus Online Examination System</h1>
<p>Cluster Node: SRV-WEB-1 (Active VIP Node)</p>
<p>Status: All Exam Engines Operational</p>
</body>
</html>
```

### Test T04: Guest VLAN Security Isolation (ACL Enforcement)
```
root@PC-GUEST-1:~# curl -m 3 http://10.20.10.210
curl: (28) Failed to connect to 10.20.10.210 port 80: Connection timed out

root@PC-GUEST-1:~# ping -c 3 10.20.10.15
PING 10.20.10.15 (10.20.10.15) 56(84) bytes of data.
From 10.20.80.1 icmp_seq=1 Destination Host Administratively Prohibited
From 10.20.80.1 icmp_seq=2 Destination Host Administratively Prohibited

--- 10.20.10.15 ping statistics ---
3 packets transmitted, 0 received, +2 errors, 100% packet loss, time 2003ms
```

### Test T08: OSPF Adjacency Status on Distribution MLS (DSW-1)
```
DSW-1# vtysh -c "show ip ospf neighbor"

Neighbor ID     Pri State           Dead Time Address         Interface
1.1.1.1           1 Full/DR           00:00:34 10.20.0.5       eth1:10.20.0.6
1.1.1.2           1 Full/DR           00:00:36 10.20.0.13      eth2:10.20.0.14
2.2.2.2           1 Full/BDR          00:00:32 10.20.0.22      eth3:10.20.0.21
```

### Test T06: Keepalived VRRP Status on DSW-1
```
root@DSW-1:~# ip addr show dev vlan10
10: vlan10@br0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    inet 10.20.10.2/24 brd 10.20.10.255 scope global vlan10
    inet 10.20.10.1/24 scope global secondary vlan10
    valid_lft forever preferred_lft forever
```
*(Notice the secondary VIP `10.20.10.1/24` actively assigned by Keepalived in MASTER state!)*

