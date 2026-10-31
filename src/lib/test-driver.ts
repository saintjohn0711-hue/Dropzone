/** Documented DropZone demo driver — email-only login (no password in v1). */
export const TEST_DRIVER = {
  email: "driver@dropzone.test",
  name: "Demo Driver",
  phone: "+1 555 0199",
  vehicle_type: "pickup" as const,
  vehicle_detail: "Ford F-150 · DropZone wrap",
  license_plate: "DZ TEST-1",
  locale: "en",
  /** v1 login is email-only; shown for clarity on the login page. */
  passwordNote: "No password — email-only session (v1)",
};
