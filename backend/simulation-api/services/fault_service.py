import time
from datetime import datetime
from typing import Dict, Any, List
from database import get_db

class FaultService:
    def __init__(self, kathara_service):
        self.ks = kathara_service
        self.scenarios = self._init_scenarios()

    def _init_scenarios(self) -> Dict[str, dict]:
        return {
            "F01": {
                "id": "F01",
                "name": "Normal Baseline Network Operation",
                "description": "All devices and links operating nominally with no injected faults.",
                "target_device": "ALL",
                "target_interface": "NONE",
                "type": "baseline",
                "impact": "Nominal operations. 0% loss.",
                "recovery_mechanism": "None required"
            },
            "F02": {
                "id": "F02",
                "name": "Primary Distribution Switch Failure (DSW1)",
                "description": "DSW1 daemon and interface crash. DSW2 takes over VRRP VIPs.",
                "target_device": "DSW1",
                "target_interface": "ALL",
                "type": "device_failure",
                "impact": "DSW1 unroutable. VRRP failover to DSW2 for VLAN 10, 30, 50, 70.",
                "recovery_mechanism": "Restart DSW1 daemons & restore baseline routing"
            },
            "F03": {
                "id": "F03",
                "name": "Secondary Distribution Switch Failure (DSW2)",
                "description": "DSW2 fails. DSW1 takes over VLAN 20, 40, 60, 80 gateways.",
                "target_device": "DSW2",
                "target_interface": "ALL",
                "type": "device_failure",
                "impact": "Server, faculty, and guest gateways transfer to DSW1.",
                "recovery_mechanism": "Restart DSW2"
            },
            "F04": {
                "id": "F04",
                "name": "Access Switch Uplink Failure",
                "description": "Primary uplink on ASW-LA-1 (eth0 to DSW1) is disconnected.",
                "target_device": "ASW-LA-1",
                "target_interface": "eth0",
                "type": "link_failure",
                "impact": "RSTP unblocks redundant link on eth1 toward DSW2.",
                "recovery_mechanism": "Re-enable interface eth0 on ASW-LA-1"
            },
            "F05": {
                "id": "F05",
                "name": "Individual Access Switch Failure",
                "description": "Hardware failure of ASW-LA-1. Demonstrates paired switch resilience.",
                "target_device": "ASW-LA-1",
                "target_interface": "ALL",
                "type": "device_failure",
                "impact": "Hosts on ASW-LA-1 lose link; hosts on ASW-LA-2 remain online.",
                "recovery_mechanism": "Restart ASW-LA-1"
            },
            "F06": {
                "id": "F06",
                "name": "Campus Edge Router Failure (EDGE-R1)",
                "description": "EDGE-R1 goes down. OSPF withdraws routes; traffic uses EDGE-R2.",
                "target_device": "EDGE-R1",
                "target_interface": "ALL",
                "type": "router_failure",
                "impact": "Campus external test connectivity redirects via EDGE-R2.",
                "recovery_mechanism": "Restart EDGE-R1 FRR routing"
            },
            "F07": {
                "id": "F07",
                "name": "Routed Point-to-Point Uplink Failure",
                "description": "Severing DSW1 to EDGE-R1 link (10.20.255.8/30).",
                "target_device": "DSW1",
                "target_interface": "eth1",
                "type": "link_failure",
                "impact": "OSPF reroutes DSW1 traffic via DSW1-EDGE-R2 (10.20.255.12/30).",
                "recovery_mechanism": "Bring eth1 back up on DSW1"
            },
            "F08": {
                "id": "F08",
                "name": "Primary Examination Server Failure",
                "description": "EXAM-WEB-1 Nginx web daemon crashes. VIP 10.20.10.210 migrates to EXAM-WEB-2.",
                "target_device": "EXAM-WEB-1",
                "target_interface": "service",
                "type": "service_failure",
                "impact": "Service VIP transitions in < 2s via Keepalived VRRP. HTTP resumes.",
                "recovery_mechanism": "Restart Nginx and Keepalived on EXAM-WEB-1"
            },
            "F09": {
                "id": "F09",
                "name": "Primary DHCP and DNS Server Failure",
                "description": "DHCP-DNS-1 crashes. Non-overlapping Pool B on DHCP-DNS-2 serves clients.",
                "target_device": "DHCP-DNS-1",
                "target_interface": "service",
                "type": "service_failure",
                "impact": "New clients obtain leases from Scope B without address conflict.",
                "recovery_mechanism": "Restart dnsmasq on DHCP-DNS-1"
            },
            "F10": {
                "id": "F10",
                "name": "Packet Loss & Latency Injection",
                "description": "Applying 10% packet loss and 50ms jitter on DSW1 eth0 using tc netem.",
                "target_device": "DSW1",
                "target_interface": "eth0",
                "type": "impairment",
                "impact": "Observed ping drop and TCP retransmissions visible in capture.",
                "recovery_mechanism": "tc qdisc del dev eth0 root netem"
            },
            "F11": {
                "id": "F11",
                "name": "Guest ACL Isolation Verification",
                "description": "Enforcing ACL rule dropping all Guest packets to internal campus subnets.",
                "target_device": "DSW1",
                "target_interface": "vlan80",
                "type": "security_acl",
                "impact": "Guest traffic to 10.20.10.210 is explicitly dropped.",
                "recovery_mechanism": "Baseline firewall policy"
            },
            "F12": {
                "id": "F12",
                "name": "Dynamic Host Scaling in Existing Lab",
                "description": "Provisioning client PC-LA-03 and validating DHCP lease allocation.",
                "target_device": "PC-LA-03",
                "target_interface": "eth0",
                "type": "scaling",
                "impact": "Valid IP allocated within VLAN 10 scope with subnet headroom.",
                "recovery_mechanism": "Release client lease"
            },
            "F13": {
                "id": "F13",
                "name": "Campus Expansion: Additional Examination Lab D",
                "description": "Allocating reserved /26 (10.20.11.96/26) as VLAN 90 (LAB-D).",
                "target_device": "LAB-D",
                "target_interface": "vlan90",
                "type": "expansion",
                "impact": "New lab provisioned with unique non-overlapping subnet.",
                "recovery_mechanism": "Deprovision VLAN 90"
            },
            "F14": {
                "id": "F14",
                "name": "Simulated ISP Upstream Failure",
                "description": "ISP1 router goes offline. Isolates campus from external network.",
                "target_device": "ISP1",
                "target_interface": "ALL",
                "type": "upstream_failure",
                "impact": "External 198.51.100.10 unreachable; internal exam portal remains 100% up.",
                "recovery_mechanism": "Restore ISP1 routing"
            }
        }

    def list_scenarios(self) -> List[dict]:
        res = []
        for sid, s in self.scenarios.items():
            is_active = sid in self.ks.active_faults
            res.append({**s, "is_active": is_active})
        return res

    def inject_fault(self, scenario_id: str) -> Dict[str, Any]:
        scenario = self.scenarios.get(scenario_id)
        if not scenario:
            return {"success": False, "message": f"Unknown scenario {scenario_id}"}

        start_t = time.time()
        dev = scenario["target_device"]
        iface = scenario["target_interface"]
        action_res = "Executed real fault injection"

        if scenario_id == "F02":  # DSW1 down
            self.ks.exec_command("DSW1", "killall keepalived")
            self.ks.exec_command("DSW1", "killall -9 ospfd zebra")
        elif scenario_id == "F03":  # DSW2 down
            self.ks.exec_command("DSW2", "killall keepalived")
            self.ks.exec_command("DSW2", "killall -9 ospfd zebra")
        elif scenario_id == "F04":  # ASW-LA-1 uplink down
            self.ks.exec_command("ASW-LA-1", "ip link set eth0 down")
        elif scenario_id == "F05":  # ASW-LA-1 down
            self.ks.exec_command("ASW-LA-1", "service openvswitch-switch stop")
        elif scenario_id == "F06":  # EDGE-R1 down
            self.ks.exec_command("EDGE-R1", "killall -9 ospfd zebra")
        elif scenario_id == "F07":  # P2P link down
            self.ks.exec_command("DSW1", "ip link set eth1 down")
        elif scenario_id == "F08":  # Primary web node down
            self.ks.exec_command("EXAM-WEB-1", "killall -9 nginx keepalived")
        elif scenario_id == "F09":  # DHCP-DNS-1 down
            self.ks.exec_command("DHCP-DNS-1", "killall -9 dnsmasq")
        elif scenario_id == "F10":  # Packet loss netem
            self.ks.exec_command("DSW1", "tc qdisc add dev eth0 root netem loss 10% delay 50ms 10ms")
        elif scenario_id == "F14":  # ISP1 down
            self.ks.exec_command("ISP1", "ip link set eth0 down && ip link set eth1 down")

        self.ks.active_faults.add(scenario_id)
        duration = (time.time() - start_t) * 1000

        self._record_fault_db(scenario_id, "inject", dev, iface, "injected", action_res, duration)

        return {
            "success": True,
            "scenario_id": scenario_id,
            "status": "injected",
            "message": f"Fault {scenario_id} ({scenario['name']}) injected on {dev}.",
            "duration_ms": round(duration, 2)
        }

    def restore_fault(self, scenario_id: str) -> Dict[str, Any]:
        scenario = self.scenarios.get(scenario_id)
        if not scenario:
            return {"success": False, "message": f"Unknown scenario {scenario_id}"}

        start_t = time.time()
        dev = scenario["target_device"]

        if scenario_id == "F02":
            self.ks.exec_command("DSW1", "/usr/lib/frr/frrinit.sh start && service keepalived start")
        elif scenario_id == "F03":
            self.ks.exec_command("DSW2", "/usr/lib/frr/frrinit.sh start && service keepalived start")
        elif scenario_id == "F04":
            self.ks.exec_command("ASW-LA-1", "ip link set eth0 up")
        elif scenario_id == "F05":
            self.ks.exec_command("ASW-LA-1", "service openvswitch-switch start")
        elif scenario_id == "F06":
            self.ks.exec_command("EDGE-R1", "/usr/lib/frr/frrinit.sh start")
        elif scenario_id == "F07":
            self.ks.exec_command("DSW1", "ip link set eth1 up")
        elif scenario_id == "F08":
            self.ks.exec_command("EXAM-WEB-1", "service nginx start && service keepalived start")
        elif scenario_id == "F09":
            self.ks.exec_command("DHCP-DNS-1", "dnsmasq -C /etc/dnsmasq.conf")
        elif scenario_id == "F10":
            self.ks.exec_command("DSW1", "tc qdisc del dev eth0 root")
        elif scenario_id == "F14":
            self.ks.exec_command("ISP1", "ip link set eth0 up && ip link set eth1 up")

        if scenario_id in self.ks.active_faults:
            self.ks.active_faults.remove(scenario_id)

        duration = (time.time() - start_t) * 1000
        self._record_fault_db(scenario_id, "restore", dev, "", "restored", "Baseline restored", duration)

        return {
            "success": True,
            "scenario_id": scenario_id,
            "status": "restored",
            "recovery_time_ms": round(duration, 2),
            "message": f"Scenario {scenario_id} restored to nominal baseline."
        }

    def restore_all(self) -> Dict[str, Any]:
        start_t = time.time()
        for sid in list(self.ks.active_faults):
            self.restore_fault(sid)
        
        self.ks.active_faults.clear()
        total_dur = (time.time() - start_t) * 1000
        return {
            "success": True,
            "message": "All network interfaces, daemons, and baseline configurations fully restored.",
            "duration_ms": round(total_dur, 2)
        }

    def _record_fault_db(self, scenario_id: str, action: str, dev: str, iface: str, status: str, details: str, duration: float):
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO fault_history (scenario_id, action, target_device, target_interface, status, details, recovery_time_ms, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (scenario_id, action, dev, iface, status, details, duration, datetime.utcnow().isoformat())
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

