import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const allowedHosts = [".up.railway.app", "telesoccer-web-production.up.railway.app"];

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
