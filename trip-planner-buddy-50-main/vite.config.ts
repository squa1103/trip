import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

function trimEnv(value: string | undefined): string {
  return (value ?? "").replace(/\r/g, "").trim();
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const sbUrl = trimEnv(env.VITE_SUPABASE_URL);
  const devProxyOff =
    trimEnv(env.VITE_SUPABASE_DEV_PROXY) === "false" || trimEnv(env.VITE_SUPABASE_DEV_PROXY) === "0";

  /** 開發時經由同源 /__supabase 轉發，避免瀏覽器對外連 supabase.co 失敗（Failed to fetch） */
  const supabaseProxy =
    mode === "development" &&
    !devProxyOff &&
    sbUrl.startsWith("https://") &&
    !/localhost|127\.0\.0\.1/i.test(sbUrl)
      ? {
          "/__supabase": {
            target: sbUrl,
            changeOrigin: true,
            secure: true,
            ws: true,
            rewrite: (p: string) => {
              const next = p.replace(/^\/__supabase/, "");
              return next.length > 0 ? next : "/";
            },
          },
        }
      : {};

  return {
    // Use relative asset paths so GitHub Pages works from any repository name.
    base: mode === "production" ? "./" : "/",
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: supabaseProxy,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },
  };
});
