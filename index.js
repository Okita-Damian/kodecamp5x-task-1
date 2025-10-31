const axios = require("axios");
const readline = require("readline");
const dotenv = require("dotenv");
dotenv.config();

const MODEL = "mistralai/mistral-7b-instruct";

// Banned Keywords for moderation
const Banned_Words = [
  "kill",
  "murder",
  "hack",
  "bomb",
  "exploit",
  "attack",
  "violence",
];

function wordsCheck(text) {
  return Banned_Words.some((word) => text.toLowerCase().includes(word));
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("How can i help you today?", async (userPrompt) => {
  if (wordsCheck(userPrompt)) {
    console.log("❌ Your input violated the moderation policy");
    rl.close();
    return;
  }

  // system prompt that defines Ai behavior
  const system_prompt = "You are a helpful and safe AI assistant";

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: MODEL,
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: userPrompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost", // optional but recommended
          "X-Title": "AI Moderation Demo", // optional
        },
      }
    );

    let aiResponse = response.data.choices[0].message.content;

    // check output words
    if (wordsCheck(aiResponse)) {
      // Replace banned words with [REDACTED]
      for (const word of Banned_Words) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        aiResponse = aiResponse.replace(regex, "[REDACTED]");
      }
      console.log("⚠️ Output contained unaccepted content. Filtered version:");
    }
    console.log("\nAI Response:\n", aiResponse);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    rl.close();
  }
});
