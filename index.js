const axios = require("axios");
const readline = require("readline");
const dotenv = require("dotenv");
dotenv.config();

// models
// const MODEL = "meta-llama/llama-3.2-3b-instruct:free"; // Free model
const MODEL = "mistralai/mistral-7b-instruct"; // Original model
// const MODEL = "google/gemma-2-9b-it:free"; // Another free option

// Banned Keywords
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

let userName = "";

//store conversation history
let conversationHistory = [];

// Function to ask AI a question
async function askAI(userPrompt, systemPrompt) {
  try {
    console.log("\n🤔 Thinking....");

    // Add user's message to history before sending a chat
    conversationHistory.push({
      role: "user",
      content: userPrompt,
    });

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
        ],
        temperature: 0.7,
        max_tokens: 500,
        min_tokens: 20,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost",
          "X-Title": "AI Moderation Demo",
        },
      }
    );

    // Check if response has the expected structure
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      console.log("❌ ERROR: Unexpected response structure!");

      //remove user message since we got no response
      conversationHistory.pop();
      return null;
    }

    let aiResponse = response.data.choices[0].message.content;

    // Check if response is empty or just whitespace
    if (!aiResponse || aiResponse.trim().length === 0) {
      console.log("❌ ERROR: AI returned an empty response!");
      console.log(
        "💡 TIP: Try asking a more specific question or check your API credits"
      );
      //remove user message since we got no response
      conversationHistory.pop();
      return null;
    }

    // check output words
    if (wordsCheck(aiResponse)) {
      // Replace banned words with [REDACTED]
      for (const word of Banned_Words) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        aiResponse = aiResponse.replace(regex, "[REDACTED]");
      }
      console.log("⚠️  Output contained unaccepted content. Filtered version:");
    }
    // Add Ais response to history after we got a response
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    return aiResponse;
  } catch (error) {
    console.log("❌ ERROR: Something went wrong!");
    console.error("Error message:", error.message);

    if (error.response) {
      console.error("API Error Status:", error.response.status);
    }
    // Remove user message we get an error
    conversationHistory.pop();
    return null;
  }
}

// Function to ask for user's name
function askName() {
  rl.question("\n👋 Hello! What may I call you? ", (name) => {
    name = name.trim();

    if (!name) {
      console.log("😊 No worries! I'll just call you 'Friend'");
      userName = "Friend";
    } else {
      userName = name;
      console.log(`\n✨ Nice to meet you, ${userName}! 🎉`);
    }

    startChat(true);
  });
}

// Main chat function
function startChat(firstMessage = true) {
  // prompt for 1st message and continuation
  const prompt = firstMessage
    ? `\n💬 ${userName}, how can I help you today? (type 'exit' or 'reset') `
    : `\n✍️  How can i help you? `;

  rl.question(prompt, async (userPrompt) => {
    userPrompt = userPrompt.trim();

    // Check for exit command
    if (
      userPrompt.toLowerCase() === "exit" ||
      userPrompt.toLowerCase() === "quit"
    ) {
      console.log(`\n👋 Goodbye, ${userName}! Have a nice day! 🌟`);
      rl.close();
      return;
    }

    // Check for empty input
    if (!userPrompt) {
      console.log("❓ Please ask me something!");
      startChat(false); // Ask again
      return;
    }

    //Auto-add question mark for obvious questions
    const questionWords = [
      "what",
      "why",
      "how",
      "when",
      "where",
      "who",
      "which",
      "can",
      "could",
      "would",
      "should",
      "will",
      "did",
      "does",
      "is",
      "are",
      "was",
      "were",
      "do",
    ];

    const startsWithQuestion = questionWords.some((word) =>
      userPrompt.toLowerCase().startsWith(word + " ")
    );

    // If chat starts with a question word but no punctuation, add question mark
    if (startsWithQuestion && !userPrompt.match(/[?!.]$/)) {
      userPrompt = userPrompt + "?";
    }

    if (wordsCheck(userPrompt)) {
      console.log("❌ Your input violated the moderation policy");
      startChat(false); // Ask again
      return;
    }

    // system prompt
    const system_prompt = `You are a helpful and safe AI assistant talking to a user named ${userName}.

IMPORTANT INSTRUCTIONS:
- Address the user as ${userName} naturally in your responses when appropriate
- Don't overuse their name - use it naturally like in normal conversation
- Respond to ALL user inputs whether they have punctuation or not
- Treat inputs as questions even without question marks if they seem like questions
- Understand commands, greetings, statements, and questions equally well
- Always provide complete, detailed, and helpful responses
- Never respond with just a single word or empty response
- Be conversational and friendly

SAFETY RULES:
- Refuse to provide harmful, dangerous, or illegal information
- Avoid discussing violence, hacking, or harmful activities
- Maintain a respectful and constructive tone`;

    const aiResponse = await askAI(userPrompt, system_prompt);

    if (aiResponse) {
      console.log("\n🤖 AI Response:\n", aiResponse);
    }

    // Continue the conversation
    startChat(false);
  });
}

// Start by asking for the user's name
console.log("🌟 Welcome to Kodecamp AI Assistant! 🌟");
askName();
