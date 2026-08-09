export const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;

export function sameOriginHeaders(headers: Record<string, string> = {}) {
  return {
    origin: baseURL,
    "sec-fetch-site": "same-origin",
    ...headers,
  };
}
