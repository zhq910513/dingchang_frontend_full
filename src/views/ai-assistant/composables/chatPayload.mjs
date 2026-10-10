export function normalizeChatPayload(respOrBody) {
  let body = respOrBody;
  for (let depth = 0; depth < 3 && body && typeof body === "object"; depth += 1) {
    if (
      Object.prototype.hasOwnProperty.call(body, "reply") ||
      Object.prototype.hasOwnProperty.call(body, "session_id") ||
      Object.prototype.hasOwnProperty.call(body, "intent")
    ) {
      return body;
    }
    body = body.data;
  }
  return {};
}
