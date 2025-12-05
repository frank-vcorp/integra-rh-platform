export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const.ts";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "App";

export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO ||
  "https://placehold.co/128x128/E1E7EF/1F2937?text=App";

// Sin Manus OAuth. El login se realiza en la ruta local "/login" (Firebase Auth).
export const getLoginUrl = () => "/login" as const;
