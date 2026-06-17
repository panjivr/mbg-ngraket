import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `pg` is a native-ish server package; keep it external to the server bundle.
  serverExternalPackages: ["pg"],
  // This app lives in a subfolder of a larger monorepo; pin the tracing root
  // to this folder so Next doesn't pick up the parent lockfile.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
