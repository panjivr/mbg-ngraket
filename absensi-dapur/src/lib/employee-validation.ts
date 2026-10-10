export function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validImage(value: unknown, max = 2_000_000): value is string {
  if (typeof value !== "string" || value.length > max) return false;
  const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = Buffer.from(match[2], "base64");
  return match[1] === "jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([255,216,255]))
    : bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
}
export function validCoordinates(lat: unknown, lng: unknown): boolean {
  return typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90
    && typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180;
}
export function validCapture(value: unknown, now = Date.now()): boolean {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(time) && now-time >= -30_000 && now-time <= 120_000;
}
export function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && validDate(value.slice(0,10)) && Number.isFinite(Date.parse(value));
}
