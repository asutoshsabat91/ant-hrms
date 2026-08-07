"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, MapPin, AlertCircle, CheckCircle2, LogIn, LogOut } from "lucide-react";
import { format } from "date-fns";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Punch {
  id: string;
  punchType: "IN" | "OUT";
  punchedAt: string;
  location?: string | null;
}

interface OfficeConfig {
  lat: number;
  lon: number;
  radiusM: number;
}

interface Props {
  initialPunches: Punch[];
  onPunchSuccess?: () => void;
  isWFH?: boolean;
  workMode?: string;
}

async function getFastLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    // Attempt 1: High Accuracy with 4s timeout
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        if (err.code === GeolocationPositionError.TIMEOUT) {
          // Attempt 2: Standard Accuracy with 4s timeout fallback
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 4000,
            enableHighAccuracy: false,
            maximumAge: 10000,
          });
        } else {
          reject(err);
        }
      },
      {
        timeout: 4000,
        enableHighAccuracy: true,
        maximumAge: 5000,
      }
    );
  });
}

export function AttendanceCard({ initialPunches, onPunchSuccess, isWFH, workMode }: Props) {
  const [time, setTime] = useState(new Date());
  const [punches, setPunches] = useState<Punch[]>(initialPunches);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig>({ lat: 20.2961, lon: 85.8245, radiusM: 200 });

  const isRemote = isWFH || workMode?.toUpperCase() === "REMOTE";

  useEffect(() => {
    setPunches(initialPunches);
  }, [initialPunches]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    fetch("/api/config/office")
      .then((r) => r.json())
      .then((cfg) => setOfficeConfig(cfg))
      .catch(() => {});
    return () => clearInterval(t);
  }, []);

  const lastPunch = punches[punches.length - 1];
  const nextType: "IN" | "OUT" = !lastPunch || lastPunch.punchType === "OUT" ? "IN" : "OUT";

  const handlePunch = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      let latitude: number | null = null;
      let longitude: number | null = null;

      if (!isRemote) {
        const position = await getFastLocation();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const dist = haversineDistance(latitude, longitude, officeConfig.lat, officeConfig.lon);
        const effectiveRadius = officeConfig.radiusM + (accuracy ?? 0);

        if (dist > effectiveRadius) {
          setError(
            `You must be within ${officeConfig.radiusM}m of the office to clock ${nextType.toLowerCase()}. (You are ~${Math.round(dist)}m away — GPS accuracy ±${Math.round(accuracy ?? 0)}m)`
          );
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ punchType: nextType, latitude, longitude }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Punch failed.");
        return;
      }
      setPunches((p) => [...p, data.punch]);
      setSuccess(`Clocked ${nextType.toLowerCase()} at ${format(new Date(data.punch.punchedAt), "hh:mm a")}`);
      onPunchSuccess?.();
    } catch (err: unknown) {
      if (err instanceof GeolocationPositionError) {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setError("Location permission denied. Please allow location access in your browser settings.");
        } else if (err.code === GeolocationPositionError.TIMEOUT) {
          setError("Location request timed out. Please ensure GPS/Wi-Fi is enabled and try again.");
        } else {
          setError("Unable to get your location. Please check GPS settings.");
        }
      } else {
        setError("Unable to punch. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [nextType, officeConfig, onPunchSuccess, isRemote]);

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm space-y-4 h-full w-full">
      {/* Header + clock */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--purple)] shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Attendance</span>
        </div>
        <span className="text-2xl font-mono font-bold text-zinc-900 tabular-nums shrink-0">
          {format(time, "HH:mm:ss")}
        </span>
      </div>

      {/* Punch button */}
      <button
        onClick={handlePunch}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
          nextType === "IN"
            ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100 shadow-md"
            : "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-100 shadow-md"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {nextType === "IN" ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
        {loading ? "Getting location…" : `Clock ${nextType === "IN" ? "In" : "Out"}`}
      </button>

      {/* Location note */}
      {isRemote ? (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          <span>Remote Mode Active: Geolocation bypassed</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <MapPin className="h-3 w-3 shrink-0 text-[var(--purple)]" />
          <span>Requires GPS · within {officeConfig.radiusM}m of AntBox Bhubaneswar office</span>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {success}
        </div>
      )}

      {/* Today's punch log — capped height with scroll */}
      {punches.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Today&apos;s Log</p>
            <span className="text-[9px] font-semibold text-zinc-300">{punches.length} entries</span>
          </div>
          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
            {punches.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-1.5">
                <span className={`text-xs font-semibold ${p.punchType === "IN" ? "text-emerald-600" : "text-rose-500"}`}>
                  {p.punchType === "IN" ? "↑ In" : "↓ Out"}
                </span>
                <span className="text-xs font-mono text-zinc-500">
                  {format(new Date(p.punchedAt), "hh:mm a")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
