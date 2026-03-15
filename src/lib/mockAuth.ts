// ============================================================
//  MOCK AUTH — provides a fake session so the app skips the
//  login screen and loads straight into the dashboard.
//  Toggle DEMO_MODE=true in .env.local to enable.
// ============================================================

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const mockSession = {
  access_token: "demo-token",
  refresh_token: "demo-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "demo-user-id",
    email: "analyst@cryptixsnare.io",
    user_metadata: { full_name: "Demo Analyst" },
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    role: "authenticated",
  },
};
