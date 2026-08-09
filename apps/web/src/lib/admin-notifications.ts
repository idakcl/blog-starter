export async function getResponseErrorMessage(response: Response, fallback: string) {
  const payload = (await response
    .clone()
    .json()
    .catch(() => undefined)) as { error?: unknown } | undefined;
  const error = typeof payload?.error === "string" ? payload.error.trim() : "";

  return error || fallback;
}
