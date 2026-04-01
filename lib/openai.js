async function askOpenAI({ question, state }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You are PAMOJA, a network intelligence agent. Answer briefly, concretely, and focus on hidden clusters, bridges, and timeline shifts.",
        },
        {
          role: "user",
          content: `Question: ${question}\nState summary: ${JSON.stringify({
            profile: state.profile,
            hiddenClusters: state.hiddenClusters,
            bridgePeople: state.bridgePeople,
            timeline: state.timeline,
          })}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const text =
    data.output_text ||
    data.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join(" ");
  return text || null;
}

module.exports = {
  askOpenAI,
};
