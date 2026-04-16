const crypto = require("crypto");
const { createId, now } = require("./store");

function getTelegramBotUsername() {
  return process.env.TELEGRAM_BOT_USERNAME || "";
}

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

function createTelegramLinkToken(db, profileAgentId) {
  const token = crypto.randomBytes(12).toString("hex");
  const record = {
    id: createId("telegram_link"),
    token,
    profileAgentId,
    createdAt: now(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    consumedAt: null,
  };

  db.telegramLinkTokens = (db.telegramLinkTokens || []).filter(
    (item) =>
      item.profileAgentId !== profileAgentId ||
      new Date(item.expiresAt).getTime() > Date.now()
  );
  db.telegramLinkTokens.push(record);
  return record;
}

function consumeTelegramLinkToken(db, token, telegramUser) {
  const link = (db.telegramLinkTokens || []).find(
    (item) => item.token === token && !item.consumedAt
  );

  if (!link) {
    throw new Error("Telegram link token not found.");
  }

  if (new Date(link.expiresAt).getTime() < Date.now()) {
    throw new Error("Telegram link token expired.");
  }

  const existing = (db.telegramConnections || []).find(
    (item) => item.telegramUserId === String(telegramUser.id)
  );
  if (existing) {
    existing.profileAgentId = link.profileAgentId;
    existing.username = telegramUser.username || existing.username || "";
    existing.firstName = telegramUser.first_name || existing.firstName || "";
    existing.lastName = telegramUser.last_name || existing.lastName || "";
    existing.linkedAt = now();
  } else {
    db.telegramConnections.push({
      id: createId("telegram_connection"),
      profileAgentId: link.profileAgentId,
      telegramUserId: String(telegramUser.id),
      username: telegramUser.username || "",
      firstName: telegramUser.first_name || "",
      lastName: telegramUser.last_name || "",
      linkedAt: now(),
    });
  }

  link.consumedAt = now();
  return link;
}

function findTelegramConnection(db, telegramUserId) {
  return (db.telegramConnections || []).find(
    (item) => item.telegramUserId === String(telegramUserId)
  );
}

async function sendTelegramMessage(chatId, text) {
  const token = getTelegramBotToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function setTelegramWebhook(webhookUrl) {
  const token = getTelegramBotToken();
  if (!token) {
    throw new Error("Telegram bot token is not configured.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: webhookUrl,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to register Telegram webhook.");
  }

  return response.json();
}

async function getTelegramWebhookInfo() {
  const token = getTelegramBotToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  if (!response.ok) {
    return null;
  }

  return response.json();
}

module.exports = {
  consumeTelegramLinkToken,
  createTelegramLinkToken,
  findTelegramConnection,
  getTelegramWebhookInfo,
  getTelegramBotToken,
  getTelegramBotUsername,
  sendTelegramMessage,
  setTelegramWebhook,
};
