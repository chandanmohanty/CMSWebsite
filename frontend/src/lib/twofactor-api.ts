import { adminFetch } from "./api";

export interface TwoFactorApi {
  /** Whether 2FA is currently enabled for the signed-in user. */
  status(): Promise<boolean>;
  enable(): Promise<{ secret: string; otpauth_url: string }>;
  confirm(code: string): Promise<{ recovery_codes: string[] }>;
  disable(password: string): Promise<void>;
}

export const realTwoFactorApi: TwoFactorApi = {
  async status() {
    const me = await adminFetch<{ two_factor_confirmed_at: string | null }>("auth/me");
    return Boolean(me.two_factor_confirmed_at);
  },

  enable: () => adminFetch("auth/2fa/enable", { method: "POST" }),

  confirm: (code) => adminFetch("auth/2fa/confirm", { method: "POST", body: JSON.stringify({ code }) }),

  disable: async (password) => {
    await adminFetch("auth/2fa/disable", { method: "POST", body: JSON.stringify({ password }) });
  },
};
