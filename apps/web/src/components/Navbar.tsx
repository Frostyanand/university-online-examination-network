"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Play, Square, RotateCcw, AlertTriangle, CheckCircle2,
  Network, ShieldAlert, Cpu
} from "lucide-react";
import { fetchSimulationState, startSimulation, stopSimulation, resetSimulation } from "@/lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const [simState, setSimState] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadState = async () => {
    try {
      const state = await fetchSimulationState();
      setSimState(state);
    } catch {
      setSimState({ is_running: false, active_faults: [] });
    }
  };

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    await startSimulation();
    await loadState();
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    await stopSimulation();
    await loadState();
    setLoading(false);
  };

  const handleReset = async () => {
    setLoading(true);
    await resetSimulation();
    await loadState();
    setLoading(false);
  };

  const navItems = [
    { name: "NOC Overview", href: "/" },
    { name: "IP & VLSM", href: "/addressing" },
    { name: "Packet Journey", href: "/packet-explorer" },
    { name: "Devices & CLI", href: "/devices" },
    { name: "Fault Scenarios", href: "/faults" },
    { name: "Test Suite", href: "/tests" },
    { name: "Capacity Planning", href: "/scalability" },
    { name: "Viva Defense", href: "/viva" },
  ];

  const isRunning = simState?.is_running;
  const activeFaults = simState?.active_faults || [];

  return (
    <header className="border-b border-border bg-panel sticky top-0 z-50 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        
        {/* Brand / Institution Lockup */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-md bg-brand text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
            EX
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-foreground flex items-center gap-2">
              University Examination Network
            </div>
            <div className="text-[11px] text-muted">Network Operations & Simulation</div>
          </div>
        </Link>

        {/* Clean Nav Tabs with Active Border Underline */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-brand font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-sm" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Simulation Controls & Status */}
        <div className="flex items-center gap-3">
          
          {/* Active Faults Tag */}
          {activeFaults.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-status-dangerBg border border-status-dangerBorder text-status-danger text-xs font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{activeFaults.length} Fault{activeFaults.length > 1 ? "s" : ""} Active</span>
            </div>
          )}

          {/* Clean Status Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-border bg-panel-subtle text-xs">
            <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-status-success" : "bg-muted-light"}`} />
            <span className={isRunning ? "text-status-success font-medium" : "text-muted"}>
              {isRunning ? "Lab Online" : "Lab Standby"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand hover:bg-brand-hover text-white text-xs font-medium shadow-subtle transition disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                {loading ? "Starting..." : "Start Lab"}
              </button>
            ) : (
              <button
                onClick={handleStop}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-status-dangerBg hover:bg-red-100 text-status-danger border border-status-dangerBorder text-xs font-medium transition disabled:opacity-50"
              >
                <Square className="w-3 h-3 fill-current" />
                {loading ? "Stopping..." : "Stop"}
              </button>
            )}

            <button
              onClick={handleReset}
              disabled={loading}
              title="Reset Laboratory"
              className="p-1.5 rounded-md bg-panel hover:bg-panel-subtle text-muted hover:text-foreground border border-border transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
