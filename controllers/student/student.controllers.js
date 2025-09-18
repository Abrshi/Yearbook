// controllers/yearbookController.js
import { PrismaClient } from "@prisma/client";
import { uploadFileToDrive } from "../../services/driveService.js";
import fs from "fs";

const prisma = new PrismaClient();

export const addYearBookProfile = async (req, res) => {
  try {
    const { userId, departmentId, batch, profileQuote, description } =
      req.body;
    const files = req.files; // photos from multer

    const uid = Number(userId);
    const deptId = departmentId ? Number(departmentId) : null;
    const batchInt = Number(batch);

    // 1️⃣ Upload each photo to Drive
    const driveLinks = [];
    for (const f of files) {
      const link = await uploadFileToDrive(f.path, f.originalname, f.mimetype);
      console.log("Uploaded to Drive:", link);
      driveLinks.push(link);
      fs.unlinkSync(f.path); // remove local temp file
    }


    // 2️⃣ Create or update UserProfile
    const profile = await prisma.userProfile.upsert({
      where: { userId: uid },
      update: {
        departmentId: deptId,
        batch: batchInt,
        profileQuote,
        description,
        profilePicture: driveLinks[0] || null, // first photo = profile picture
      },
      create: {
        userId: uid,
        departmentId: deptId,
        batch: batchInt,
        profileQuote,
        description,
        profilePicture: driveLinks[0] || null,
      },
    });

    // 3️⃣ Save other photos in Photo table
    const photoRows = [];
    for (const url of driveLinks) {
      photoRows.push(
        await prisma.photo.create({
          data: { userId: uid, url },
        })
      );
    }

    return res.status(201).json({
      message: "Yearbook profile created successfully",
      profile,
      photos: photoRows,
    });
  } catch (error) {
    console.error("Error adding yearbook profile:", error);
    res
      .status(500)
      .json({ error: "Failed to add yearbook profile", details: error.message });
  }
};

// =================getDepartments=================

export const getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc", // optional: sorts alphabetically
      },
    });

    return res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (err) {
    console.error("Error fetching departments:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch departments",
    });
  }
};





export async function getMyProfileWithPhotos(req, res) {
  try {
    const userId = Number(req.params.id); // get from /student/me/:id
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const photosRaw = await prisma.photo.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const photos = photosRaw.map((ph) => {
      const match = ph.url.match(/id=([a-zA-Z0-9_-]+)/);
      const driveId = match ? match[1] : null;
      return {
        ...ph,
        url: driveId
          ? `${process.env.SERVER_URL}/api/v1/google-image/${driveId}`
          : ph.url,
      };
    });

    res.json({ profile, photos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile/photos" });
  }
}










// get all
export async function getProfilesOverview(req, res) {
  try {
    const profiles = await prisma.userProfile.findMany({
      where: { approvalStatus: "APPROVED" }, // ONLY approved profiles
      select: {
        id: true,
        profileQuote: true,
        profilePicture: true,
        user: { select: { fullName: true, id: true } },
      },
    });

    const mapped = profiles.map((p) => {
      if (!p.profilePicture) return p;
      const match = p.profilePicture.match(/id=([a-zA-Z0-9_-]+)/);
      const driveId = match ? match[1] : null;
      return {
        ...p,
        profilePicture: driveId
          ? `${process.env.SERVER_URL}/api/v1/google-image/${driveId}`
          : p.profilePicture,
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profiles overview" });
  }
}

// get the detale
export async function getProfileDetails(req, res) {
  try {
    const profileId = Number(req.params.id);
    if (!profileId) return res.status(400).json({ error: "Profile ID required" });

    const profile = await prisma.userProfile.findFirst({
      where: { id: profileId, approvalStatus: "APPROVED" }, // ONLY approved
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!profile) return res.status(404).json({ error: "Profile not found or not approved" });

    const photosRaw = await prisma.photo.findMany({
      where: { userId: profile.userId },
      orderBy: { createdAt: "desc" },
    });

    const photos = photosRaw.map((ph) => {
      const match = ph.url.match(/id=([a-zA-Z0-9_-]+)/);
      const driveId = match ? match[1] : null;
      return {
        ...ph,
        url: driveId
          ? `${process.env.SERVER_URL}/api/v1/google-image/${driveId}`
          : ph.url,
      };
    });

    res.json({ profile, photos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile details" });
  }
}
