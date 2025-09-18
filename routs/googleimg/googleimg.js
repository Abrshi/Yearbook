import express from "express";
import { google } from "googleapis";

const router = express.Router();

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });

router.get("/:id", async (req, res) => {
  try {
    const fileId = req.params.id;

    // Fetch metadata to get mimeType
    const meta = await drive.files.get({
      fileId,
      fields: "mimeType",
    });

    res.setHeader("Content-Type", meta.data.mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const file = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    file.data.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(404).send("Image not found");
  }
});

export default router;
