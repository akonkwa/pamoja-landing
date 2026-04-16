function resolveProvider(provider) {
  if (provider === "openrouter" && process.env.OPENROUTER_API_KEY) {
    return "openrouter";
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return "openai";
  }

  if (process.env.OPENROUTER_API_KEY) {
    return "openrouter";
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  return null;
}

function getProviderSettings(provider) {
  const resolvedProvider = resolveProvider(provider);
  if (!resolvedProvider) {
    return null;
  }

  if (resolvedProvider === "openai") {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    };
  }

  return {
    provider: "openrouter",
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || "openrouter/free",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  };
}

function buildProviderOrder(provider) {
  const preferred = resolveProvider(provider);
  const alternates = ["openrouter", "openai"].filter((item) => item !== preferred);
  const order = preferred ? [preferred, ...alternates] : alternates;
  return order
    .map((item) => getProviderSettings(item))
    .filter((item) => item?.apiKey);
}

function extractText(data) {
  return (
    data.output_text ||
    data.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join(" ") ||
    null
  );
}

function normalizeErrorMessage(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isQuotaError(status, message) {
  const normalized = normalizeErrorMessage(message).toLowerCase();
  return (
    status === 429 ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("credits") ||
    normalized.includes("insufficient_quota") ||
    normalized.includes("capacity")
  );
}

function summarizeFailure(provider, status, message) {
  const label = provider === "openrouter" ? "OpenRouter" : "OpenAI";
  const normalized = normalizeErrorMessage(message);

  if (!normalized) {
    return `${label} returned status ${status || "unknown"}.`;
  }

  if (isQuotaError(status, normalized)) {
    return `${label} is out of quota or temporarily rate-limited: ${normalized}`;
  }

  return `${label} failed: ${normalized}`;
}

async function callProvider(settings, { systemPrompt, userPrompt, maxOutputTokens }) {
  try {
    const response = await fetch(`${settings.baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
        ...(settings.provider === "openrouter"
          ? {
              "HTTP-Referer": process.env.APP_BASE_URL || "http://localhost:3000",
              "X-Title": "Umoja MVP",
            }
          : {}),
      },
      body: JSON.stringify({
        model: settings.model,
        max_output_tokens: maxOutputTokens,
        input: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    const rawText = await response.text();
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        rawText;
      return {
        ok: false,
        provider: settings.provider,
        model: settings.model,
        status: response.status,
        message: summarizeFailure(settings.provider, response.status, message),
        quotaExceeded: isQuotaError(response.status, message),
      };
    }

    const text = extractText(data);
    if (!text) {
      return {
        ok: false,
        provider: settings.provider,
        model: settings.model,
        status: response.status,
        message: summarizeFailure(settings.provider, response.status, "No text was returned by the model."),
        quotaExceeded: false,
      };
    }

    return {
      ok: true,
      provider: settings.provider,
      model: settings.model,
      status: response.status,
      text,
    };
  } catch (error) {
    return {
      ok: false,
      provider: settings.provider,
      model: settings.model,
      status: 0,
      message: summarizeFailure(settings.provider, 0, error.message || String(error)),
      quotaExceeded: false,
    };
  }
}

async function callLanguageModelDetailed({
  systemPrompt,
  userPrompt,
  maxOutputTokens = 240,
  provider,
}) {
  const providers = buildProviderOrder(provider);
  if (!providers.length) {
    return {
      ok: false,
      text: null,
      provider: null,
      model: null,
      attempts: [],
      failureMessage: "No AI provider is configured for this environment.",
    };
  }

  const attempts = [];

  for (const settings of providers) {
    const result = await callProvider(settings, {
      systemPrompt,
      userPrompt,
      maxOutputTokens,
    });
    attempts.push(result);
    if (result.ok) {
      return {
        ok: true,
        text: result.text,
        provider: result.provider,
        model: result.model,
        attempts,
        failoverUsed: attempts.length > 1,
        failureMessage: null,
      };
    }
  }

  return {
    ok: false,
    text: null,
    provider: null,
    model: null,
    attempts,
    failoverUsed: attempts.length > 1,
    failureMessage: attempts.map((item) => item.message).filter(Boolean).join(" "),
  };
}

async function callLanguageModel({ systemPrompt, userPrompt, maxOutputTokens = 240, provider }) {
  const result = await callLanguageModelDetailed({
    systemPrompt,
    userPrompt,
    maxOutputTokens,
    provider,
  });
  return result.text;
}

async function askOpenAI({ question, state }) {
  return callLanguageModel({
    systemPrompt:
      "You are UMOJA, a network intelligence agent. Answer briefly, concretely, and focus on hidden clusters, bridges, and timeline shifts.",
    userPrompt: `Question: ${question}\nState summary: ${JSON.stringify({
      profile: state.profile,
      hiddenClusters: state.hiddenClusters,
      bridgePeople: state.bridgePeople,
      timeline: state.timeline,
    })}`,
    maxOutputTokens: 220,
  });
}

module.exports = {
  askOpenAI,
  callLanguageModel,
  callLanguageModelDetailed,
  getProviderSettings,
  resolveProvider,
};
