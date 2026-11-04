import yaml
import time
import subprocess
from datetime import datetime
from typing import Dict, Any, List, Optional
from config import SPEC_PATH, KATHARA_LAB_DIR, KATHARA_LAB_NAME
import docker

try:
    from Kathara.manager.Kathara import Kathara
    from Kathara.model.Lab import Lab
    from Kathara.parser.netkit.LabParser import LabParser
    KATHARA_AVAILABLE = True
except Exception as e:
    KATHARA_AVAILABLE = False
    print(f"[!] Warning: Kathara python library load warning: {e}")

class KatharaService:
    def __init__(self):
        self.spec = self._load_spec()
        self.lab_name = KATHARA_LAB_NAME
        self.is_running = False
        self.active_faults = set()
        self.docker_client = None
        self._init_docker()

    def _load_spec(self) -> dict:
        if SPEC_PATH.exists():
            with open(SPEC_PATH, "r", encoding="utf-8") as f:
                return yaml.safe_load(f)
        return {}

    def _init_docker(self):
        try:
            self.docker_client = docker.from_env()
        except Exception:
            self.docker_client = None

    def get_simulation_state(self) -> Dict[str, Any]:
        running_count = 0
        failed_count = 0
        total_planned = 31

        if self.docker_client:
            try:
                containers = self.docker_client.containers.list(all=True)
                for c in containers:
                    if "kathara" in c.name or self.lab_name in c.name:
                        if c.status == "running":
                            running_count += 1
                        else:
                            failed_count += 1
            except Exception:
                pass

        self.is_running = (running_count > 0)

        return {
            "is_running": self.is_running,
            "lab_name": self.lab_name,
            "total_planned_devices": total_planned,
            "active_devices_count": running_count,
            "failed_devices_count": failed_count,
            "active_faults": list(self.active_faults),
            "timestamp": datetime.utcnow().isoformat()
        }

    def start_simulation(self) -> Dict[str, Any]:
        if not KATHARA_AVAILABLE:
            return {"success": False, "message": "Kathará library is not available in environment."}

        try:
            k = Kathara.get_instance()
            parser = LabParser()
            lab = parser.parse(str(KATHARA_LAB_DIR))
            lab.name = self.lab_name

            print(f"[*] Deploying Kathará lab {self.lab_name}...")
            k.deploy_lab(lab)
            self.is_running = True
            time.sleep(2)
            return {"success": True, "message": "Kathará simulation lab started successfully."}
        except Exception as e:
            return {"success": False, "message": f"Failed to start Kathará lab: {str(e)}"}

    def stop_simulation(self) -> Dict[str, Any]:
        if not KATHARA_AVAILABLE:
            return {"success": False, "message": "Kathará is not available."}

        try:
            k = Kathara.get_instance()
            k.undeploy_lab(lab_name=self.lab_name)
            self.is_running = False
            self.active_faults.clear()
            return {"success": True, "message": "Simulation stopped and undeployed."}
        except Exception as e:
            return {"success": False, "message": f"Undeploy error: {str(e)}"}

    def reset_simulation(self) -> Dict[str, Any]:
        self.stop_simulation()
        time.sleep(1)
        return self.start_simulation()

    def exec_command(self, device_id: str, command: str) -> Dict[str, Any]:
        start_t = time.time()
        
        # Security Allowlist Check
        allowlisted_cmds = [
            "ip addr", "ip route", "ip neigh", "ping", "traceroute",
            "curl", "dig", "vtysh", "ovs-vsctl", "ovs-ofctl", "ovs-appctl",
            "bridge", "cat", "ps aux", "systemctl", "service", "tc qdisc",
            "killall", "iptables"
        ]
        cmd_base = command.strip().split()[0] if command.strip() else ""
        if cmd_base not in allowlisted_cmds and not command.startswith("vtysh") and not command.startswith("ovs-"):
            return {
                "success": False,
                "output": f"Security restriction: Command '{cmd_base}' is not in pre-approved allowlist.",
                "exit_code": 126,
                "duration_ms": 0.0
            }

        if not self.is_running:
            return {
                "success": False,
                "output": f"Simulation lab is currently STOPPED. Start simulation to execute real commands on {device_id}.",
                "exit_code": 1,
                "duration_ms": 0.0
            }

        try:
            k = Kathara.get_instance()
            stream = k.exec(machine_name=device_id, command=command, lab_name=self.lab_name)
            chunks = []
            for chunk in stream._stream:
                if isinstance(chunk, tuple):
                    for part in chunk:
                        if isinstance(part, bytes):
                            chunks.append(part.decode("utf-8", "replace"))
                        elif part:
                            chunks.append(str(part))
                elif isinstance(chunk, bytes):
                    chunks.append(chunk.decode("utf-8", "replace"))
                elif chunk:
                    chunks.append(str(chunk))

            out = "".join(chunks)
            code = stream.exit_code()
            dur = (time.time() - start_t) * 1000
            return {
                "success": (code == 0),
                "output": out if out else "(No output returned)",
                "exit_code": code,
                "duration_ms": round(dur, 2)
            }
        except Exception as e:
            return {
                "success": False,
                "output": f"Execution error on {device_id}: {str(e)}",
                "exit_code": 1,
                "duration_ms": round((time.time() - start_t) * 1000, 2)
            }

    def get_device_info(self, device_id: str) -> Dict[str, Any]:
        # Planned spec information
        planned_info = self._find_device_in_spec(device_id)
        if not planned_info:
            return {"error": f"Device {device_id} not found in specification."}

        # Check live status
        live_status = "stopped"
        interfaces = []
        routes = []
        ospf_neighbors = []
        vrrp_state = None
        rstp_state = None

        if self.docker_client and self.is_running:
            try:
                # Query interfaces
                ip_res = self.exec_command(device_id, "ip -br addr")
                if ip_res["success"]:
                    live_status = "running"
                    for line in ip_res["output"].splitlines():
                        parts = line.split()
                        if len(parts) >= 2:
                            iface_name = parts[0]
                            state = parts[1]
                            ip = parts[2] if len(parts) >= 3 else None
                            interfaces.append({
                                "name": iface_name,
                                "ip": ip,
                                "state": state,
                                "mac": None
                            })

                # If router or DSW, query OSPF neighbors
                if "R" in device_id or "DSW" in device_id:
                    ospf_res = self.exec_command(device_id, "vtysh -c 'show ip ospf neighbor'")
                    if ospf_res["success"]:
                        ospf_neighbors = ospf_res["output"].splitlines()

                # If DSW, query VRRP
                if "DSW" in device_id:
                    vrrp_res = self.exec_command(device_id, "cat /tmp/keepalived.data")
                    vrrp_state = "Active VRRP Gateway" if vrrp_res["success"] else "Running"

                # If ASW, query OVS RSTP
                if "ASW" in device_id:
                    ovs_res = self.exec_command(device_id, "ovs-appctl rstp/show br0")
                    if ovs_res["success"]:
                        rstp_state = ovs_res["output"]

            except Exception:
                live_status = "degraded"

        return {
            "id": device_id,
            "name": planned_info.get("name", device_id),
            "model": planned_info.get("model", "Unknown"),
            "type": planned_info.get("type", "node"),
            "status": live_status,
            "interfaces": interfaces,
            "routes": routes,
            "ospf_neighbors": ospf_neighbors,
            "vrrp_state": vrrp_state,
            "rstp_state": rstp_state,
            "design_specs": planned_info
        }

    def _find_device_in_spec(self, device_id: str) -> Optional[dict]:
        devs = self.spec.get("devices", {})
        for group in ["routers", "distribution_switches", "access_switches", "endpoints"]:
            for d in devs.get(group, []):
                if d.get("id") == device_id:
                    return d
        for s in self.spec.get("servers", []):
            if s.get("id") == device_id:
                return s
        return None

kathara_service = KatharaService()

