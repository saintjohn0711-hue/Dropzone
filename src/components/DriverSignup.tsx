"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  APPLICATION_VEHICLES,
  US_STATES,
  WEEKDAYS,
  type Weekday,
} from "@/lib/driver-application";
import {
  DRIVER_STORAGE_KEY,
  type VehicleType,
} from "@/lib/drivers";
import { DRIVER_SESSION_STORAGE } from "@/lib/driver-session-client";
import { localCreateDriver } from "@/lib/drivers-local";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const VEHICLE_ICONS: Record<VehicleType, string> = {
  car: "🚗",
  suv: "🚙",
  pickup: "🛻",
  van: "🚐",
  box_truck: "🚛",
  drone: "🚁",
};

const DAY_KEYS: Record<Weekday, "dayMon" | "dayTue" | "dayWed" | "dayThu" | "dayFri" | "daySat" | "daySun"> = {
  mon: "dayMon",
  tue: "dayTue",
  wed: "dayWed",
  thu: "dayThu",
  fri: "dayFri",
  sat: "daySat",
  sun: "daySun",
};

export function DriverSignup() {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [addressState, setAddressState] = useState("NY");
  const [zip, setZip] = useState("");

  const [dlNumber, setDlNumber] = useState("");
  const [dlState, setDlState] = useState("NY");
  const [dlExpiration, setDlExpiration] = useState("");
  const [dlFront, setDlFront] = useState<File | null>(null);
  const [dlBack, setDlBack] = useState<File | null>(null);

  const [vehicleType, setVehicleType] = useState<VehicleType>("pickup");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [plateState, setPlateState] = useState("NY");
  const [haulingNotes, setHaulingNotes] = useState("");

  const [serviceArea, setServiceArea] = useState("");
  const [days, setDays] = useState<Weekday[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [hours, setHours] = useState("7am – 6pm");
  const [canHaulHeavy, setCanHaulHeavy] = useState(true);
  const [weightClass, setWeightClass] = useState<"light" | "medium" | "heavy">(
    "heavy",
  );
  const [insurance, setInsurance] = useState(false);

  const [bgConsent, setBgConsent] = useState(false);
  const [terms, setTerms] = useState(false);
  const [contractor, setContractor] = useState(false);
  const [signature, setSignature] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const stateOptions = useMemo(() => [...US_STATES], []);

  function vehicleLabel(id: VehicleType) {
    if (id === "car") return t.vehicleCarShort;
    if (id === "suv") return t.vehicleSuv;
    if (id === "pickup") return t.vehiclePickup;
    if (id === "van") return t.vehicleVan;
    if (id === "box_truck") return t.vehicleBox;
    return t.vehicleDrone;
  }

  function toggleDay(day: Weekday) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function validateClient(): string[] {
    const missing: string[] = [];
    if (!legalName.trim()) missing.push(t.driverLegalName);
    if (!email.trim()) missing.push(t.driverEmail);
    if (!phone.trim()) missing.push(t.driverPhone);
    if (!dob) missing.push(t.driverDob);
    if (!street.trim()) missing.push(t.driverAddressStreet);
    if (!city.trim()) missing.push(t.driverAddressCity);
    if (!addressState) missing.push(t.driverAddressState);
    if (!zip.trim()) missing.push(t.driverAddressZip);
    if (!dlNumber.trim()) missing.push(t.driverDlNumber);
    if (!dlState) missing.push(t.driverDlState);
    if (!dlExpiration) missing.push(t.driverDlExpiration);
    if (!vehicleMake.trim()) missing.push(t.driverVehicleMake);
    if (!vehicleModel.trim()) missing.push(t.driverVehicleModel);
    if (!vehicleYear.trim()) missing.push(t.driverVehicleYear);
    if (!vehicleColor.trim()) missing.push(t.driverVehicleColor);
    if (!licensePlate.trim()) missing.push(t.driverLicense);
    if (!plateState) missing.push(t.driverPlateState);
    if (!serviceArea.trim()) missing.push(t.driverServiceArea);
    if (days.length === 0) missing.push(t.driverAvailabilityDays);
    if (!insurance) missing.push(t.driverInsuranceConfirm);
    if (!bgConsent) missing.push(t.driverBgConsent);
    if (!terms) missing.push(t.driverTermsAccept);
    if (!contractor) missing.push(t.driverContractorAck);
    if (!signature.trim()) missing.push(t.driverSignature);
    if (
      signature.trim() &&
      legalName.trim() &&
      signature.trim().toLowerCase() !== legalName.trim().toLowerCase()
    ) {
      missing.push(t.driverSignatureMismatch);
    }
    return missing;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    const missing = validateClient();
    setClientErrors(missing);
    if (missing.length) {
      setError(`${t.driverFormIncomplete}\n• ${missing.join("\n• ")}`);
      setBusy(false);
      return;
    }

    const fd = new FormData();
    fd.set("legal_name", legalName.trim());
    if (displayName.trim()) fd.set("display_name", displayName.trim());
    fd.set("email", email.trim());
    fd.set("phone", phone.trim());
    fd.set("date_of_birth", dob);
    fd.set("address_street", street.trim());
    fd.set("address_city", city.trim());
    fd.set("address_state", addressState);
    fd.set("address_zip", zip.trim());
    fd.set("dl_number", dlNumber.trim());
    fd.set("dl_state", dlState);
    fd.set("dl_expiration", dlExpiration);
    fd.set("vehicle_type", vehicleType);
    fd.set("vehicle_make", vehicleMake.trim());
    fd.set("vehicle_model", vehicleModel.trim());
    fd.set("vehicle_year", vehicleYear.trim());
    fd.set("vehicle_color", vehicleColor.trim());
    fd.set("license_plate", licensePlate.trim());
    fd.set("license_plate_state", plateState);
    if (haulingNotes.trim()) fd.set("hauling_notes", haulingNotes.trim());
    fd.set("service_area", serviceArea.trim());
    fd.set("availability_days", JSON.stringify(days));
    if (hours.trim()) fd.set("availability_hours", hours.trim());
    fd.set("can_haul_heavy", canHaulHeavy ? "true" : "false");
    fd.set("weight_class", weightClass);
    fd.set("insurance_confirmed", insurance ? "true" : "false");
    fd.set("background_check_consent", bgConsent ? "true" : "false");
    fd.set("terms_accepted", terms ? "true" : "false");
    fd.set("contractor_ack", contractor ? "true" : "false");
    fd.set("signature_name", signature.trim());
    fd.set("signed_at", new Date().toISOString());
    fd.set("locale", locale);
    if (dlFront) fd.set("dl_front", dlFront);
    if (dlBack) fd.set("dl_back", dlBack);

    const localPayload = {
      name: legalName.trim(),
      legal_name: legalName.trim(),
      display_name: displayName.trim() || undefined,
      email: email.trim(),
      phone: phone.trim(),
      date_of_birth: dob,
      address_street: street.trim(),
      address_city: city.trim(),
      address_state: addressState,
      address_zip: zip.trim(),
      dl_number: dlNumber.trim(),
      dl_state: dlState,
      dl_expiration: dlExpiration,
      vehicle_type: vehicleType,
      vehicle_make: vehicleMake.trim(),
      vehicle_model: vehicleModel.trim(),
      vehicle_year: vehicleYear.trim(),
      vehicle_color: vehicleColor.trim(),
      vehicle_detail: `${vehicleYear} ${vehicleMake} ${vehicleModel} (${vehicleColor})`,
      license_plate: `${plateState} ${licensePlate}`.trim(),
      license_plate_state: plateState,
      hauling_notes: haulingNotes.trim() || undefined,
      service_area: serviceArea.trim(),
      availability_days: days,
      availability_hours: hours.trim() || undefined,
      can_haul_heavy: canHaulHeavy,
      weight_class: weightClass,
      insurance_confirmed: true,
      background_check_consent: true,
      terms_accepted: true,
      contractor_ack: true,
      signature_name: signature.trim(),
      locale,
    };

    try {
      const res = await fetch("/api/drivers", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json.ok) {
        localStorage.setItem(DRIVER_STORAGE_KEY, json.driver.id);
        if (json.hint) setNote(json.hint);
        try {
          const loginRes = await fetch("/api/drivers/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim() }),
          });
          const loginJson = await loginRes.json();
          if (loginRes.ok && loginJson.token) {
            localStorage.setItem(DRIVER_SESSION_STORAGE, loginJson.token);
          }
        } catch {
          /* dashboard may still load via id */
        }
        router.push(`/driver/dashboard?id=${json.driver.id}`);
        return;
      }

      if (res.status === 503 || json.hint) {
        const driver = localCreateDriver(localPayload);
        localStorage.setItem(DRIVER_STORAGE_KEY, driver.id);
        localStorage.setItem(DRIVER_SESSION_STORAGE, `local-${driver.id}`);
        setNote(
          [t.driverLocalNote, json.hint].filter(Boolean).join(" "),
        );
        router.push(`/driver/dashboard?id=${driver.id}&local=1`);
        return;
      }

      setError(json.error || t.driverSignupError);
      setBusy(false);
    } catch {
      try {
        const driver = localCreateDriver(localPayload);
        localStorage.setItem(DRIVER_STORAGE_KEY, driver.id);
        localStorage.setItem(DRIVER_SESSION_STORAGE, `local-${driver.id}`);
        router.push(`/driver/dashboard?id=${driver.id}&local=1`);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.driverSignupError);
        setBusy(false);
      }
    }
  }

  return (
    <form className="driver-form driver-application" onSubmit={onSubmit} noValidate>
      <h2 className="driver-form-title">{t.driverSignupTitle}</h2>
      <p className="driver-form-lead">{t.driverSignupLead}</p>

      <section className="driver-section" aria-labelledby="dz-identity">
        <h3 id="dz-identity" className="driver-section-title">
          {t.driverSectionIdentity}
        </h3>
        <label className="driver-label">
          {t.driverLegalName}
          <input
            required
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder={t.driverNamePlaceholder}
            autoComplete="name"
          />
        </label>
        <label className="driver-label">
          {t.driverDisplayName}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t.driverDisplayNamePlaceholder}
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
            autoComplete="email"
          />
        </label>
        <label className="driver-label">
          {t.driverPhone}
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 0100"
            autoComplete="tel"
          />
        </label>
        <label className="driver-label">
          {t.driverDob}
          <input
            required
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </label>
        <label className="driver-label">
          {t.driverAddressStreet}
          <input
            required
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={t.driverAddressStreetPlaceholder}
            autoComplete="street-address"
          />
        </label>
        <div className="driver-row-2">
          <label className="driver-label">
            {t.driverAddressCity}
            <input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              autoComplete="address-level2"
            />
          </label>
          <label className="driver-label">
            {t.driverAddressState}
            <select
              required
              value={addressState}
              onChange={(e) => setAddressState(e.target.value)}
            >
              {stateOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="driver-label">
          {t.driverAddressZip}
          <input
            required
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="10001"
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </label>
      </section>

      <section className="driver-section" aria-labelledby="dz-dl">
        <h3 id="dz-dl" className="driver-section-title">
          {t.driverSectionLicense}
        </h3>
        <label className="driver-label">
          {t.driverDlNumber}
          <input
            required
            value={dlNumber}
            onChange={(e) => setDlNumber(e.target.value)}
            placeholder={t.driverDlNumberPlaceholder}
            autoComplete="off"
          />
        </label>
        <div className="driver-row-2">
          <label className="driver-label">
            {t.driverDlState}
            <select
              required
              value={dlState}
              onChange={(e) => setDlState(e.target.value)}
            >
              {stateOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="driver-label">
            {t.driverDlExpiration}
            <input
              required
              type="date"
              value={dlExpiration}
              onChange={(e) => setDlExpiration(e.target.value)}
            />
          </label>
        </div>
        <label className="driver-label">
          {t.driverDlFront}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setDlFront(e.target.files?.[0] || null)}
          />
          <span className="driver-field-hint">{t.driverDlUploadHint}</span>
        </label>
        <label className="driver-label">
          {t.driverDlBack}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setDlBack(e.target.files?.[0] || null)}
          />
        </label>
      </section>

      <section className="driver-section" aria-labelledby="dz-vehicle">
        <h3 id="dz-vehicle" className="driver-section-title">
          {t.driverSectionVehicle}
        </h3>
        <fieldset className="driver-vehicle-fieldset">
          <legend>{t.driverVehicleType}</legend>
          <div className="driver-vehicle-grid driver-vehicle-grid-3">
            {APPLICATION_VEHICLES.map((id) => (
              <button
                key={id}
                type="button"
                className={`driver-vehicle-opt${vehicleType === id ? " active" : ""}`}
                onClick={() => setVehicleType(id)}
              >
                <span className="driver-vehicle-icon">{VEHICLE_ICONS[id]}</span>
                {vehicleLabel(id)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="driver-row-2">
          <label className="driver-label">
            {t.driverVehicleMake}
            <input
              required
              value={vehicleMake}
              onChange={(e) => setVehicleMake(e.target.value)}
              placeholder="Ford"
            />
          </label>
          <label className="driver-label">
            {t.driverVehicleModel}
            <input
              required
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="F-150"
            />
          </label>
        </div>
        <div className="driver-row-2">
          <label className="driver-label">
            {t.driverVehicleYear}
            <input
              required
              value={vehicleYear}
              onChange={(e) => setVehicleYear(e.target.value)}
              placeholder="2022"
              inputMode="numeric"
            />
          </label>
          <label className="driver-label">
            {t.driverVehicleColor}
            <input
              required
              value={vehicleColor}
              onChange={(e) => setVehicleColor(e.target.value)}
              placeholder={t.driverVehicleColorPlaceholder}
            />
          </label>
        </div>
        <div className="driver-row-2">
          <label className="driver-label">
            {t.driverLicense}
            <input
              required
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="ABC-1234"
            />
          </label>
          <label className="driver-label">
            {t.driverPlateState}
            <select
              required
              value={plateState}
              onChange={(e) => setPlateState(e.target.value)}
            >
              {stateOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="driver-label">
          {t.driverHaulingNotes}
          <textarea
            value={haulingNotes}
            onChange={(e) => setHaulingNotes(e.target.value)}
            placeholder={t.driverHaulingNotesPlaceholder}
            rows={2}
          />
        </label>
      </section>

      <section className="driver-section" aria-labelledby="dz-prefs">
        <h3 id="dz-prefs" className="driver-section-title">
          {t.driverSectionWork}
        </h3>
        <label className="driver-label">
          {t.driverServiceArea}
          <input
            required
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            placeholder={t.driverServiceAreaPlaceholder}
          />
        </label>
        <fieldset className="driver-vehicle-fieldset">
          <legend>{t.driverAvailabilityDays}</legend>
          <div className="driver-days-grid">
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`driver-day-opt${days.includes(d) ? " active" : ""}`}
                onClick={() => toggleDay(d)}
              >
                {t[DAY_KEYS[d]]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="driver-label">
          {t.driverAvailabilityHours}
          <input
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="7am – 6pm"
          />
        </label>
        <label className="driver-check">
          <input
            type="checkbox"
            checked={canHaulHeavy}
            onChange={(e) => {
              setCanHaulHeavy(e.target.checked);
              if (e.target.checked) setWeightClass("heavy");
              else setWeightClass("light");
            }}
          />
          <span>{t.driverCanHaulHeavy}</span>
        </label>
        <label className="driver-label">
          {t.driverWeightClass}
          <select
            value={weightClass}
            onChange={(e) =>
              setWeightClass(e.target.value as "light" | "medium" | "heavy")
            }
          >
            <option value="light">{t.weightLight}</option>
            <option value="medium">{t.weightMedium}</option>
            <option value="heavy">{t.weightHeavy}</option>
          </select>
        </label>
        <label className="driver-check">
          <input
            type="checkbox"
            checked={insurance}
            onChange={(e) => setInsurance(e.target.checked)}
            required
          />
          <span>{t.driverInsuranceConfirm}</span>
        </label>
      </section>

      <section className="driver-section" aria-labelledby="dz-compliance">
        <h3 id="dz-compliance" className="driver-section-title">
          {t.driverSectionCompliance}
        </h3>
        <label className="driver-check">
          <input
            type="checkbox"
            checked={bgConsent}
            onChange={(e) => setBgConsent(e.target.checked)}
            required
          />
          <span>{t.driverBgConsent}</span>
        </label>
        <label className="driver-check">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            required
          />
          <span>{t.driverTermsAccept}</span>
        </label>
        <label className="driver-check">
          <input
            type="checkbox"
            checked={contractor}
            onChange={(e) => setContractor(e.target.checked)}
            required
          />
          <span>{t.driverContractorAck}</span>
        </label>
        <label className="driver-label">
          {t.driverSignature}
          <input
            required
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={t.driverSignaturePlaceholder}
          />
          <span className="driver-field-hint">{t.driverSignatureHint}</span>
        </label>
        <p className="driver-signed-date">
          {t.driverSignedDate}: {new Date().toLocaleDateString(locale)}
        </p>
      </section>

      {clientErrors.length > 0 && !error ? (
        <p className="driver-error" role="alert">
          {t.driverFormIncomplete}
        </p>
      ) : null}
      {error ? (
        <p className="driver-error" role="alert">
          {error}
        </p>
      ) : null}
      {note ? <p className="driver-note">{note}</p> : null}

      <button type="submit" className="driver-submit" disabled={busy}>
        {busy ? t.driverCreating : t.driverSubmitApplication}
      </button>

      <p className="driver-form-foot">
        {t.driverAlreadyHave}{" "}
        <Link href="/driver/login">{t.driverLoginCta}</Link>
      </p>
    </form>
  );
}
