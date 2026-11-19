// Remote Config: values that change with DMW policy or model availability, without shipping a new app.
// - hsw_min_salary_usd / hsw_old_min_salary_usd: DMW Advisory 25-2025 / MC 03-2025 thresholds. The outcome of the
//   MC 03-2025 six-month audit is not public yet (docs/sources/rules/HSW-SALARY-STATUS.md); when DMW announces it,
//   we change the value in the console and every user gets it.
// - cloud_model: the Gemini model for the cloud explanation.
// Defaults are compiled in, and the last fetched values are cached, so the app works offline.
import { fetchAndActivate, getRemoteConfig, getValue } from "firebase/remote-config";
import { DEFAULT_RULES_CONFIG, type RulesConfig } from "@kontrata/core";
import { app } from "./firebase";

const DEFAULTS = {
  hsw_min_salary_usd: DEFAULT_RULES_CONFIG.hswMinSalaryUsd,
  hsw_old_min_salary_usd: DEFAULT_RULES_CONFIG.hswOldMinSalaryUsd,
  cloud_model: "gemini-3.5-flash-lite",
};

const rc = getRemoteConfig(app);
rc.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 60_000 : 3_600_000;
rc.defaultConfig = DEFAULTS;

/** Start fetching right away; never block the UI on it. */
export const configReady: Promise<void> = fetchAndActivate(rc)
  .then(() => undefined)
  .catch(() => undefined); // offline or blocked: compiled defaults / cached values apply

const num = (key: keyof typeof DEFAULTS, fallback: number) => {
  const v = getValue(rc, key).asNumber();
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export function rulesConfig(): RulesConfig {
  return {
    ...DEFAULT_RULES_CONFIG,
    hswMinSalaryUsd: num("hsw_min_salary_usd", DEFAULTS.hsw_min_salary_usd),
    hswOldMinSalaryUsd: num("hsw_old_min_salary_usd", DEFAULTS.hsw_old_min_salary_usd),
  };
}

export function cloudModelName(): string {
  return getValue(rc, "cloud_model").asString() || DEFAULTS.cloud_model;
}
