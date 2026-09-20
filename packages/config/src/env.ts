/**
 * Environment helpers for validating required public and server variables
 */
export function getEnvVariable(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`[Darb REST Configuration] Missing required environment variable: ${key}`);
    }
    return fallback ?? "";
  }
  return value;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
}
