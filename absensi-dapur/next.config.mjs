import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Root file-tracing dikunci ke folder app ini (monorepo punya banyak lockfile).
  // Menghilangkan tebakan workspace → bundle serverless lebih akurat & cepat.
  outputFileTracingRoot: __dirname,

  // `pg` (dan native-nya) & bcryptjs jangan ikut di-bundle/trace ke server chunk —
  // dipakai apa adanya dari node_modules. Mempercepat build & cold start serverless.
  serverExternalPackages: ["pg", "bcryptjs"],

  // Tree-shake impor dari paket besar agar hanya bagian terpakai yang masuk bundle
  // (mempercepat first load semua halaman yang memakainya).
  experimental: {
    optimizePackageImports: ["jspdf", "jspdf-autotable", "html-to-image"],
  },

  // Jangan kirim source map browser ke produksi (bundle lebih kecil, unduhan lebih cepat).
  productionBrowserSourceMaps: false,

  // Header 'X-Powered-By' tak perlu — hemat byte tiap response.
  poweredByHeader: false,

  // Kompresi respons (gzip) untuk HTML/JS/CSS yang dilayani server.
  compress: true,

  // Cache jangka panjang untuk aset statis ber-hash (immutable) → repeat visit instan.
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
