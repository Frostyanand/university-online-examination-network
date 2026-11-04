import uuid
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from database import get_db

class TestRunnerService:
    def __init__(self, kathara_service, packet_capture_service):
        self.ks = kathara_service
        self.pcs = packet_capture_service

    def run_test(self, test_type: str, source_device: str, dest_target: str, capture: bool = True) -> Dict[str, Any]:
        test_id = f"test_{uuid.uuid4().hex[:8]}"
        start_t = time.time()

        cmd = ""
        test_name = test_type.replace("_", " ").title()

        if test_type == "ping_same_vlan" or test_type == "ping_cross_vlan":
            cmd = f"ping -c 3 -W 2 {dest_target}"
        elif test_type == "http_exam":
            cmd = f"curl -s -v -m 3 http://{dest_target}/"
        elif test_type == "dns_lookup":
            cmd = f"dig +time=2 +tries=1 {dest_target} @10.20.10.202"
        elif test_type == "guest_acl":
            cmd = f"curl -s -v -m 2 http://{dest_target}/"
        elif test_type == "external_test":
            cmd = f"ping -c 3 -W 2 {dest_target}"
        elif test_type == "traceroute":
            cmd = f"traceroute -n -m 5 -w 2 {dest_target}"
        else:
            cmd = f"ping -c 2 {dest_target}"

        capture_id = None
        if capture and self.ks.is_running:
            try:
                cap_info = self.pcs.start_capture(source_device, "eth0")
                capture_id = cap_info.get("capture_id")
            except Exception:
                capture_id = None

        # Execute command on actual simulated node
        exec_res = self.ks.exec_command(source_device, cmd)

        if capture_id:
            try:
                time.sleep(0.5)
                self.pcs.stop_capture(capture_id)
            except Exception:
                pass

        duration_ms = (time.time() - start_t) * 1000
        output = exec_res.get("output", "")
        code = exec_res.get("exit_code", 1)

        # Status evaluation
        if test_type == "guest_acl":
            # For ACL test, dropping/failing the connection IS the expected passing outcome!
            status = "pass" if (code != 0 or "timed out" in output or "Connection refused" in output) else "fail"
        else:
            status = "pass" if code == 0 else "fail"

        # Record in test history SQLite DB
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO test_history 
                (id, test_type, test_name, source_device, dest_target, command, output, status, duration_ms, timestamp, capture_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (test_id, test_type, test_name, source_device, dest_target, cmd, output, status, duration_ms, datetime.utcnow().isoformat(), capture_id)
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

        return {
            "test_id": test_id,
            "test_type": test_type,
            "test_name": test_name,
            "source_device": source_device,
            "dest_target": dest_target,
            "command": cmd,
            "output": output,
            "status": status,
            "duration_ms": round(duration_ms, 2),
            "timestamp": datetime.utcnow().isoformat(),
            "capture_id": capture_id
        }

    def get_test_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM test_history ORDER BY timestamp DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_test_by_id(self, test_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM test_history WHERE id = ?", (test_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
