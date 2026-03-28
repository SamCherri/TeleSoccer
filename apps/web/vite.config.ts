import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const railwayPublicHost = process.env.RAILWAY_PUBLIC_DOMAIN;
const allowedHosts = [".up.railway.app", "proud-joy-production-5f79.up.railway.app", railwayPublicHost]
  .filter((host): host is string => Boolean(host));

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 5173),
    allowedHosts
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 4173),
    allowedHosts
  }
});
