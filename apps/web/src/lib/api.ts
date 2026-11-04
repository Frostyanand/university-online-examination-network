const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchSimulationState() {
  const res = await fetch(`${API_BASE}/simulation/state`, { cache: "no-store" });
  return res.json();
}

export async function startSimulation() {
  const res = await fetch(`${API_BASE}/simulation/start`, { method: "POST" });
  return res.json();
}

export async function stopSimulation() {
  const res = await fetch(`${API_BASE}/simulation/stop`, { method: "POST" });
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: "POST" });
  return res.json();
}

export async function fetchDevices() {
  const res = await fetch(`${API_BASE}/devices`, { cache: "no-store" });
  return res.json();
}

export async function fetchDevice(id: string) {
  const res = await fetch(`${API_BASE}/devices/${id}`, { cache: "no-store" });
  return res.json();
}

export async function executeDeviceCommand(deviceId: string, command: string) {
  const res = await fetch(`${API_BASE}/devices/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: deviceId, command })
  });
  return res.json();
}

export async function runTest(testType: string, sourceDevice: string, destTarget: string, capture: boolean = true) {
  const res = await fetch(`${API_BASE}/tests/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test_type: testType, source_device: sourceDevice, dest_target: destTarget, capture })
  });
  return res.json();
}

export async function fetchTestHistory() {
  const res = await fetch(`${API_BASE}/tests/history`, { cache: "no-store" });
  return res.json();
}

export async function fetchFaults() {
  const res = await fetch(`${API_BASE}/faults`, { cache: "no-store" });
  return res.json();
}

export async function injectFault(scenarioId: string) {
  const res = await fetch(`${API_BASE}/faults/${scenarioId}/inject`, { method: "POST" });
  return res.json();
}

export async function restoreFault(scenarioId: string) {
  const res = await fetch(`${API_BASE}/faults/${scenarioId}/restore`, { method: "POST" });
  return res.json();
}

export async function restoreAllFaults() {
  const res = await fetch(`${API_BASE}/faults/restore-all`, { method: "POST" });
  return res.json();
}

export async function fetchSubnets() {
  const res = await fetch(`${API_BASE}/addressing/subnets`, { cache: "no-store" });
  return res.json();
}

export async function calculateSubnet(ip: string, prefix: number) {
  const res = await fetch(`${API_BASE}/addressing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip_address: ip, prefix_length: prefix })
  });
  return res.json();
}

export async function fetchFlsmComparison() {
  const res = await fetch(`${API_BASE}/addressing/flsm-vs-vlsm`, { cache: "no-store" });
  return res.json();
}

export async function planScaling(actionType: string, labId?: string, vlanId?: number, hostCount?: number) {
  const res = await fetch(`${API_BASE}/addressing/scale/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_type: actionType, lab_id: labId, vlan_id: vlanId, host_count: hostCount })
  });
  return res.json();
}

export async function fetchCapturedPackets(captureId: string) {
  const res = await fetch(`${API_BASE}/captures/${captureId}/packets`, { cache: "no-store" });
  return res.json();
}

// Aliases for component convenience
export const fetchDeviceDetail = fetchDevice;

export async function runConnectivityTest(params: {
  test_type: string;
  source_device: string;
  destination_ip?: string;
  dest_target?: string;
  capture_packets?: boolean;
}) {
  return runTest(
    params.test_type,
    params.source_device,
    params.destination_ip || params.dest_target || "10.20.10.1",
    params.capture_packets !== false
  );
}
