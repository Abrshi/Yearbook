// services/driveService.js
import { google } from "googleapis";
import fs from "fs";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

export const uploadFileToDrive = async (filePath, fileName, mimeType) => {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType,
      },
      media: {
        mimeType,
        body: fs.createReadStream(filePath),
      },
    });

    const fileId = response.data.id;

    // Make file public
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return `https://drive.google.com/uc?id=${fileId}`;
  } catch (err) {
    console.error("Error uploading to Google Drive:", err);
    throw err;
  }
};
