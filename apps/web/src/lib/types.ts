export interface SimulationState {
  is_running: boolean;
  lab_name: string;
  total_planned_devices: number;
  active_devices_count: number;
  failed_devices_count: number;
  active_faults: string[];
  last_action?: string;
  timestamp: string;
}

export interface DeviceInterface {
  name: string;
  ip?: string;
  mac?: string;
  state: string;
  vlan?: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  type: string;
  status: string;
  interfaces: DeviceInterface[];
  routes: string[];
  ospf_neighbors: string[];
  vrrp_state?: string;
  rstp_state?: string;
  design_specs?: any;
}

export interface TestResult {
  test_id: string;
  test_type: string;
  test_name: string;
  source_device: string;
  dest_target: string;
  command: string;
  output: string;
  status: "pass" | "fail";
  duration_ms: number;
  timestamp: string;
  capture_id?: string;
}

export interface PacketEvent {
  id: number;
  timestamp: number;
  time_str: string;
  device: string;
  interface: string;
  src_mac?: string;
  dst_mac?: string;
  vlan_id?: number;
  src_ip?: string;
  dst_ip?: string;
  ttl?: number;
  protocol: string;
  src_port?: number;
  dst_port?: number;
  tcp_flags?: string;
  seq?: number;
  ack?: number;
  summary: string;
}

export interface FaultScenario {
  id: string;
  name: string;
  description: string;
  target_device: string;
  target_interface: string;
  type: string;
  impact: string;
  recovery_mechanism: string;
  is_active: boolean;
}

export interface SubnetCalcResult {
  ip_address: string;
  prefix_length: number;
  netmask: string;
  wildcard_mask: string;
  network_address: string;
  broadcast_address: string;
  first_usable: string;
  last_usable: string;
  total_addresses: number;
  usable_hosts: number;
  ipv4_class: string;
  classful_mask: string;
  is_private: boolean;
  binary_netmask: string;
}

