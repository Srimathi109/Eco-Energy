// Load environment variables
require('dotenv').config();
const fetch = require('node-fetch');

const API_KEY = process.env.GEMINI_API_KEY;

async function generateContent(prompt) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      }
    );

    const data = await response.json();
    console.log("Gemini Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

// Example usage
generateContent("Explain climate change simply");
