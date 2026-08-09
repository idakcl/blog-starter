import "@tanstack/react-start/server-only";
import { parseJson } from "@repo/core";
import * as schema from "@repo/db/schema/cms";
import { eq } from "drizzle-orm";

import { getCmsDb } from "#/lib/cms-db";

const aiProviderSettingsKey = "ai:openai-compatible";
const defaultTimeoutMs = 20_000;

export type AiProviderConfigView = {
  baseUrl: string;
  model: string;
  apiKeyConfigured: boolean;
  configured: boolean;
  updatedAt: string | null;
};

export type AiProviderConfigInput = {
  baseUrl?: unknown;
  apiKey?: unknown;
  model?: unknown;
  clearApiKey?: unknown;
};

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiChatCompletionInput = {
  config: StoredAiProviderConfig;
  messages: AiChatMessage[];
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
};

export type AiChatCompletionResult =
  | {
      ok: true;
      content: string;
      raw: unknown;
    }
  | {
      ok: false;
      error: string;
      status?: number;
    };

type StoredAiProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export async function getAiProviderConfigView(): Promise<AiProviderConfigView> {
  const record = await readAiProviderRecord();

  return toConfigView(record?.value, record?.updatedAt ?? null);
}

export async function getConfiguredAiProvider() {
  const record = await readAiProviderRecord();
  const value = normalizeStoredConfig(record?.value);

  return isUsableAiConfig(value) ? value : null;
}

export async function updateAiProviderConfig(input: AiProviderConfigInput) {
  const current = (await readAiProviderRecord())?.value ?? emptyStoredConfig();
  const baseUrl = normalizeBaseUrl(input.baseUrl ?? current.baseUrl);
  const model = normalizeRequiredText(input.model ?? current.model);
  const inputApiKey = normalizeRequiredText(input.apiKey);
  const apiKey =
    input.clearApiKey === true ? "" : inputApiKey || normalizeRequiredText(current.apiKey);
  const nextValue = {
    baseUrl,
    model,
    apiKey,
  };
  const updatedAt = new Date().toISOString();
  const db = getCmsDb();

  await db
    .insert(schema.serverSettings)
    .values({
      key: aiProviderSettingsKey,
      value: nextValue,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: schema.serverSettings.key,
      set: {
        value: nextValue,
        updatedAt,
      },
    });

  return toConfigView(nextValue, updatedAt);
}

export async function clearAiProviderApiKey() {
  const current = (await readAiProviderRecord())?.value ?? emptyStoredConfig();

  if (!current.baseUrl && !current.model && !current.apiKey) {
    return toConfigView({}, null);
  }

  return updateAiProviderConfig({
    baseUrl: current.baseUrl,
    model: current.model,
    clearApiKey: true,
  });
}

export async function testAiProviderConnection(
  input?: AiProviderConfigInput,
): Promise<AiChatCompletionResult> {
  if (input && (await requiresFreshApiKeyForPreview(input))) {
    return {
      ok: false,
      error: "Testing a new AI base URL requires entering an API key.",
      status: 400,
    };
  }

  const config = input ? await previewAiProviderConfig(input) : await getConfiguredAiProvider();

  if (!config) {
    return {
      ok: false,
      error: "AI provider base URL, API key, and model are required.",
    };
  }

  return createOpenAiCompatibleChatCompletion({
    config,
    messages: [
      {
        role: "system",
        content: "You are a connection check. Reply with only: ok",
      },
      {
        role: "user",
        content: "ok",
      },
    ],
    maxTokens: 8,
    temperature: 0,
    timeoutMs: 12_000,
  });
}

export async function createConfiguredChatCompletion(
  input: Omit<AiChatCompletionInput, "config">,
): Promise<AiChatCompletionResult> {
  const config = await getConfiguredAiProvider();

  if (!config) {
    return {
      ok: false,
      error: "AI provider is not configured.",
    };
  }

  return createOpenAiCompatibleChatCompletion({ ...input, config });
}

export async function createOpenAiCompatibleChatCompletion({
  config,
  messages,
  timeoutMs = defaultTimeoutMs,
  temperature,
  maxTokens,
}: AiChatCompletionInput): Promise<AiChatCompletionResult> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      return {
        ok: false,
        error: getProviderErrorMessage(payload) ?? `AI provider returned HTTP ${response.status}.`,
        status: response.status,
      };
    }

    const content = getChatCompletionContent(payload);

    if (!content) {
      return {
        ok: false,
        error: "AI provider returned an empty completion.",
        status: response.status,
      };
    }

    return {
      ok: true,
      content,
      raw: payload,
    };
  } catch (error) {
    return {
      ok: false,
      error: timedOut
        ? "AI provider request timed out."
        : error instanceof Error
          ? error.message
          : "AI provider request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function parseAiJsonObject(content: string) {
  const trimmed = content.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = fenced?.[1]?.trim() ?? extractJsonObject(trimmed) ?? trimmed;

  return parseJson<Record<string, unknown>>(candidate);
}

async function previewAiProviderConfig(input: AiProviderConfigInput) {
  const current = (await readAiProviderRecord())?.value ?? emptyStoredConfig();
  const config = normalizeStoredConfig({
    baseUrl: input.baseUrl ?? current.baseUrl,
    model: input.model ?? current.model,
    apiKey: input.clearApiKey === true ? "" : input.apiKey || current.apiKey,
  });

  return isUsableAiConfig(config) ? config : null;
}

async function requiresFreshApiKeyForPreview(input: AiProviderConfigInput) {
  const requestedBaseUrl = normalizeBaseUrl(input.baseUrl);
  const inputApiKey = normalizeRequiredText(input.apiKey);

  if (!requestedBaseUrl || inputApiKey || input.clearApiKey === true) {
    return false;
  }

  const current = normalizeStoredConfig((await readAiProviderRecord())?.value);

  return Boolean(current.apiKey && current.baseUrl && requestedBaseUrl !== current.baseUrl);
}

async function readAiProviderRecord() {
  const db = getCmsDb();
  const rows = await db
    .select()
    .from(schema.serverSettings)
    .where(eq(schema.serverSettings.key, aiProviderSettingsKey))
    .limit(1)
    .catch((error: unknown) => {
      if (isMissingServerSettingsTableError(error)) {
        return [];
      }

      throw error;
    });
  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    value: normalizeStoredConfig(row.value),
    updatedAt: row.updatedAt,
  };
}

function toConfigView(value: unknown, updatedAt: string | null): AiProviderConfigView {
  const config = normalizeStoredConfig(value);

  return {
    baseUrl: config.baseUrl,
    model: config.model,
    apiKeyConfigured: Boolean(config.apiKey),
    configured: isUsableAiConfig(config),
    updatedAt,
  };
}

function normalizeStoredConfig(value: unknown): StoredAiProviderConfig {
  const record = isRecord(value) ? value : {};

  return {
    baseUrl: normalizeBaseUrl(record.baseUrl),
    apiKey: normalizeRequiredText(record.apiKey),
    model: normalizeRequiredText(record.model),
  };
}

function emptyStoredConfig(): StoredAiProviderConfig {
  return {
    baseUrl: "",
    apiKey: "",
    model: "",
  };
}

function normalizeBaseUrl(value: unknown) {
  const trimmed = normalizeRequiredText(value).replace(/\/+$/, "");

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function normalizeRequiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUsableAiConfig(value: StoredAiProviderConfig) {
  return Boolean(value.baseUrl && value.apiKey && value.model);
}

async function readJsonResponse(response: Response) {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

function getProviderErrorMessage(payload: unknown) {
  if (!isRecord(payload)) {
    return null;
  }

  const error = "error" in payload ? payload.error : null;

  if (typeof error === "string") {
    return error;
  }

  if (isRecord(error) && "message" in error) {
    return typeof error.message === "string" ? error.message : null;
  }

  return null;
}

function getChatCompletionContent(payload: unknown) {
  if (!isRecord(payload) || !("choices" in payload)) {
    return "";
  }

  const { choices } = payload;

  if (!Array.isArray(choices)) {
    return "";
  }

  const choice = choices[0];

  if (!isRecord(choice) || !("message" in choice)) {
    return "";
  }

  const { message } = choice;

  if (!isRecord(message) || !("content" in message)) {
    return "";
  }

  return typeof message.content === "string" ? message.content : "";
}

function extractJsonObject(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return value.slice(start, end + 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isMissingServerSettingsTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message.includes("no such table") && message.includes("server_settings");
}
