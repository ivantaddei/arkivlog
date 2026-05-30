import { init } from "arkivlog";

const endpoint =
  process.env.ARKIVLOG_ENDPOINT ?? "http://localhost:3100/api/logs";
const apiKey = process.env.ARKIVLOG_API_KEY ?? "ak_unset";

if (apiKey === "ak_unset" || apiKey === "demo-key" || apiKey.length < 10) {
  console.warn(
    "[arkivlog] ARKIVLOG_API_KEY looks unset — log writes will be rejected by the SaaS. Get a real key from http://localhost:3100/dashboard.",
  );
}

export const arkivlog = init({
  endpoint,
  apiKey,
  onError: (err) => console.error("[arkivlog] record failed:", err),
});
