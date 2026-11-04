import sys
from pathlib import Path
from pkt_core import decode_bytes
from pkt_core.models.lab import Lab as ParsedLab
from pkt_core.audit import validate_lab

def validate_cisco_pkt(pkt_path: str = "artifacts/cisco/university_online_examination_network.pkt"):
    path = Path(pkt_path)
    if not path.exists():
        print(f"[ERROR] Packet Tracer file not found: {pkt_path}")
        sys.exit(1)

    print(f"[*] Validating Packet Tracer artifact: {pkt_path} ({path.stat().st_size} bytes)...")
    raw = path.read_bytes()
    decoded = decode_bytes(raw, "pkt")
    print(f"  [+] Decoded container successfully")

    parsed = ParsedLab.from_bytes(decoded.xml)
    print(f"  [+] Lab Version: {parsed.version}")
    print(f"  [+] Total devices identified: {len(parsed.devices)}")
    print(f"  [+] Total cables/links identified: {len(parsed.links)}")

    rep = validate_lab(parsed)
    print(f"[*] Audit Results: OK={rep.ok}, Failures={len(rep.failures)}, Warnings={len(rep.warnings)}")
    if rep.failures:
        print("[!] Validation Failures:")
        for f in rep.failures:
            print(f"    - [{f.code}] {f.message}")
        sys.exit(1)

    if rep.warnings:
        print("[*] Validation Warnings:")
        for w in rep.warnings:
            print(f"    - [{w.code}] {w.message}")

    print("\n[SUCCESS] Cisco Packet Tracer file passed all structural and configuration audits!\n")

if __name__ == "__main__":
    validate_cisco_pkt()
