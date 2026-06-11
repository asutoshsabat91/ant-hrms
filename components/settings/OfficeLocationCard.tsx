"use client";

import { useState } from "react";
import { MapPin, Navigation, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  initialLat: number;
  initialLon: number;
  initialRadius: number;
}

export function OfficeLocationCard({ initialLat, initialLon, initialRadius }: Props) {
  const [lat, setLat] = useState(String(initialLat));
  const [lon, setLon] = useState(String(initialLon));
  const [radius, setRadius] = useState(String(initialRadius));
  const [loading, setLoading] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function pinMyLocation() {
    setPinning(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      );
      setLat(pos.coords.latitude.toFixed(6));
      setLon(pos.coords.longitude.toFixed(6));
      setSuccess("Location captured — click Save to apply.");
    } catch {
      setError("Could not get your location. Ensure GPS is enabled and location permission is granted.");
    } finally {
      setPinning(false);
    }
  }

  async function save() {
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    const radN = parseInt(radius);
    if (isNaN(latN) || isNaN(lonN)) {
      setError("Invalid coordinates.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/config/office", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: latN, lon: lonN, radiusM: isNaN(radN) ? 200 : radN }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed."); return; }
      setSuccess(`Office pinned at ${latN.toFixed(5)}, ${lonN.toFixed(5)} with ${data.radiusM}m radius.`);
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[var(--purple)]" />
          <CardTitle>Office Location</CardTitle>
        </div>
        <CardDescription>
          Set exact GPS coordinates for clock-in/out geofencing. Use &quot;Pin My Location&quot; when you&apos;re at the office.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pin button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2 border-[var(--purple)]/30 text-[var(--purple)] hover:bg-[var(--purple)]/5"
          onClick={pinMyLocation}
          disabled={pinning}
        >
          <Navigation className={`h-3.5 w-3.5 ${pinning ? "animate-pulse" : ""}`} />
          {pinning ? "Getting your location…" : "📍 Pin My Current Location as Office"}
        </Button>

        {/* Manual inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Latitude</label>
            <Input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="mt-1 font-mono text-xs"
              placeholder="20.2961"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Longitude</label>
            <Input
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="mt-1 font-mono text-xs"
              placeholder="85.8245"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Allowed Radius (meters)
          </label>
          <Input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="mt-1 text-xs"
            placeholder="200"
          />
          <p className="text-[10px] text-zinc-400 mt-1">Recommended: 100–300m. Accounts for indoor GPS drift.</p>
        </div>

        {/* Open in Maps link */}
        <a
          href={`https://maps.google.com/?q=${lat},${lon}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-[var(--purple)] hover:underline"
        >
          <MapPin className="h-3 w-3" /> View current pin on Google Maps ↗
        </a>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {success}
          </div>
        )}

        <Button onClick={save} disabled={loading} size="sm" className="w-full gap-2">
          <Save className="h-3.5 w-3.5" />
          {loading ? "Saving…" : "Save Office Location"}
        </Button>
      </CardContent>
    </Card>
  );
}
