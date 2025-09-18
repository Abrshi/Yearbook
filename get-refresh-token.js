import { google } from "googleapis";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/oauth2callback"; // must match Google Cloud Console

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const app = express();

// Step 1: Generate URL to get authorization code
app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",  // important: ensures refresh_token
    prompt: "consent",       // forces consent to get refresh token
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });
  res.redirect(authUrl);
});

// Step 2: Exchange authorization code for tokens
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code; // this is the authorization code Google sends
  if (!code) return res.send("No code found in query params");

  try {
    const { tokens } = await oauth2Client.getToken(code); // <-- exchange code here
    oauth2Client.setCredentials(tokens);

    console.log("Tokens:", tokens); // contains access_token & refresh_token
    res.send("✅ Tokens generated! Check your console for the refresh_token.");
  } catch (err) {
    console.error("Error exchanging code for tokens:", err.message);
    res.status(500).send("Failed to exchange code for tokens");
  }
});

app.listen(3000, () => {
  console.log("Visit http://localhost:3000/auth to start the flow");
});
