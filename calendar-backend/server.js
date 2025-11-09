import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

app.get("/auth/status", (req, res) => {
  if (oauth2Client.credentials && oauth2Client.credentials.access_token) {
    return res.json({ authenticated: true });
  }
  res.json({ authenticated: false });
});

app.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.redirect("http://localhost:3000");
  } catch (error) {
    console.error("❌ Google OAuth Error:", error);
    res.status(500).send("❌ Error connecting to Google Calendar.");
  }
});

app.get("/events", async (req, res) => {
  try {
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });
    res.json(response.data.items);
  } catch (error) {
    console.error("❌ Calendar Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch events." });
  }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt, model } = req.body;
    console.log("🧠 Received Gemini prompt:", prompt?.slice(0, 100));

    const aiModel = genAI.getGenerativeModel({
      model: model || "gemini-2.0-pro",
    });

    const result = await aiModel.generateContent(prompt);
    const text =
      (result?.response?.text?.() ||
        result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response.")?.trim();

    res.json({ output: text });
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Gemini request failed." });
  }
});

app.post("/api/weekly-overview", async (req, res) => {
  const { avgMood, avgEnergy, completedTasks = [], upcomingTasks = [] } =
    req.body;

  const prompt = `
You are a supportive AI mentor for a college student.

Weekly mood average: ${avgMood.toFixed(1)} (1 = stressed, 5 = excited)
Weekly energy average: ${avgEnergy.toFixed(1)}%

Completed tasks this week:
${completedTasks.length > 0
    ? completedTasks.map((t, i) => `${i + 1}. ${t}`).join("\n")
    : "None logged this week."
  }

Upcoming deadlines or tasks for next week:
${upcomingTasks.length > 0
    ? upcomingTasks.map((t, i) => `${i + 1}. ${t}`).join("\n")
    : "No upcoming deadlines added yet."
  }

Write a short, encouraging weekly reflection (max 6 sentences). 
Include:
- A kind acknowledgment of their overall energy and effort.
- A brief recognition of what they completed this week.
- A motivational note for next week.
Tone: gentle, conversational, hopeful.
Return only plain text (no markdown or emojis).
Keep it under 1000 characters.
`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    const result = await model.generateContent(prompt);

    let text = "No insights available.";

    if (result?.response?.text) {
      text = result.response.text();
    } else if (
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text
    ) {
      text = result.response.candidates[0].content.parts[0].text;
    }

    text = text.replace(/^```[\s\S]*?```$/gm, "").trim();
    if (text.length > 1000) text = text.slice(0, 1000) + "...";

    res.status(200).json({ overview: text });
  } catch (err) {
    console.error("❌ Gemini weekly overview error:", err);

    if (err.response) {
      try {
        console.error(
          "🔍 Gemini API Error Details:",
          await err.response.text()
        );
      } catch (innerErr) {
        console.error("⚠️ Could not read Gemini error details:", innerErr);
      }
    }

    res.status(500).json({
      error: "Failed to generate AI insights",
      details: err.stack || err.message || JSON.stringify(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
