"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Activity, Network, Binary, ShieldAlert, 
  Terminal, FlaskConical, TrendingUp, BookOpen, 
  Play, Square, RotateCcw, AlertTriangle, CheckCircle2 
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
      // Backend not yet reachable or stopped
      setSimState({ is_running: false, active_faults: [] });
    }
  };

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 3000);
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
    { name: "NOC Overview", href: "/", icon: Activity },
    { name: "IP & VLSM", href: "/addressing", icon: Binary },
    { name: "Packet Explorer", href: "/packet-explorer", icon: Network },
    { name: "Devices & CLI", href: "/devices", icon: Terminal },
    { name: "Fault Lab", href: "/faults", icon: ShieldAlert },
    { name: "Test Centre", href: "/tests", icon: FlaskConical },
    { name: "Scalability", href: "/scalability", icon: TrendingUp },
    { name: "Viva & Concepts", href: "/viva", icon: BookOpen },
  ];

  const isRunning = simState?.is_running;
  const activeFaults = simState?.active_faults || [];

  return (
    <header className="border-b border-border bg-panel/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue font-bold text-lg">
            U
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide text-foreground flex items-center gap-2">
              EXAM NET NOC
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/20 text-accent-blue font-mono border border-accent-blue/40">
                v1.0 REAL
              </span>
            </div>
            <div className="text-[11px] text-slate-400">University Exam Network Emulator</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Simulation Controls & Status Pill */}
        <div className="flex items-center gap-3">
          {/* Active Faults Badge */}
          {activeFaults.length > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-red/20 border border-accent-red/40 text-accent-red text-xs animate-pulse font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{activeFaults.length} Fault{activeFaults.length > 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-border text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-accent-green shadow-[0_0_8px_#22c55e]" : "bg-slate-500"}`} />
            <span className={isRunning ? "text-accent-green font-semibold" : "text-slate-400"}>
              {isRunning ? "EMULATOR ACTIVE" : "EMULATOR IDLE"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/40 text-xs font-medium transition"
              >
                <Play className="w-3 h-3 fill-current" />
                Start Lab
              </button>
            ) : (
              <button
                onClick={handleStop}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/40 text-xs font-medium transition"
              >
                <Square className="w-3 h-3 fill-current" />
                Stop
              </button>
            )}

            <button
              onClick={handleReset}
              disabled={loading}
              title="Reset Simulation Lab"
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-border transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}

