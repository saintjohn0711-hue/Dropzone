"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DRIVER_STORAGE_KEY,
  type VehicleType,
} from "@/lib/drivers";
import { localCreateDriver } from "@/lib/drivers-local";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const VEHICLE_OPTIONS: { id: VehicleType; icon: string }[] = [
  { id: "car", icon: "🚗" },
  { id: "pickup", icon: "🛻" },
  { id: "box_truck", icon: "🚛" },
  { id: "drone", icon: "🚁" },
];

export function DriverSignup() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("pickup");
  const [vehicleDetail, setVehicleDetail] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);

    const payload = {
      name,
      email,
      phone,
      vehicle_type: vehicleType,
      vehicle_detail: vehicleDetail,
      license_plate: licensePlate,
      locale,
    };

    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        localStorage.setItem(DRIVER_STORAGE_KEY, json.driver.id);
        router.push(`/driver/dashboard?id=${json.driver.id}`);
        return;
      }

      // Schema missing / Supabase down — local demo account so UI still works
      if (res.status === 503 || json.hint) {
        const driver = localCreateDriver(payload);
        localStorage.setItem(DRIVER_STORAGE_KEY, driver.id);
        setNote(t.driverLocalNote);
        router.push(`/driver/dashboard?id=${driver.id}&local=1`);
        return;
      }

      setError(json.error || t.driverSignupError);
      setBusy(false);
    } catch {
      try {
        const driver = localCreateDriver(payload);
        localStorage.setItem(DRIVER_STORAGE_KEY, driver.id);
        router.push(`/driver/dashboard?id=${driver.id}&local=1`);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.driverSignupError);
        setBusy(false);
      }
    }
  }

  function vehicleLabel(id: VehicleType) {
    if (id === "car") return t.vehicleCar;
    if (id === "pickup") return t.vehiclePickup;
    if (id === "box_truck") return t.vehicleBox;
    return t.vehicleDrone;
  }

  return (
    <form className="driver-form" onSubmit={onSubmit}>
      <h2 className="driver-form-title">{t.driverSignupTitle}</h2>
      <p className="driver-form-lead">{t.driverSignupLead}</p>

      <label className="driver-label">
        {t.driverName}
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.driverNamePlaceholder}
        />
      </label>

      <label className="driver-label">
        {t.driverEmail}
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </label>

      <label className="driver-label">
        {t.driverPhone}
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 0100"
        />
      </label>

      <fieldset className="driver-vehicle-fieldset">
        <legend>{t.driverVehicleType}</legend>
        <div className="driver-vehicle-grid">
          {VEHICLE_OPTIONS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`driver-vehicle-opt${vehicleType === v.id ? " active" : ""}`}
              onClick={() => setVehicleType(v.id)}
            >
              <span className="driver-vehicle-icon">{v.icon}</span>
              {vehicleLabel(v.id)}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="driver-label">
        {t.driverVehicleDetail}
        <input
          value={vehicleDetail}
          onChange={(e) => setVehicleDetail(e.target.value)}
          placeholder={t.driverVehicleDetailPlaceholder}
        />
      </label>

      <label className="driver-label">
        {t.driverLicense}
        <input
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value)}
          placeholder="NY ABC-1234"
        />
      </label>

      {error ? (
        <p className="driver-error" role="alert">
          {error}
        </p>
      ) : null}
      {note ? <p className="driver-note">{note}</p> : null}

      <button type="submit" className="driver-submit" disabled={busy}>
        {busy ? t.driverCreating : t.driverCreateAccount}
      </button>

      <p className="driver-form-foot">
        {t.driverAlreadyHave}{" "}
        <Link href="/driver/dashboard">{t.driverOpenDashboard}</Link>
      </p>
    </form>
  );
}
