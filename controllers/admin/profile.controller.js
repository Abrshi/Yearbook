import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
/* -----------------------
   Get profiles with
   - Filtering
   - Sorting
   - Search
   - Pagination
------------------------ */
export async function getProfiles(req, res) {
  try {
    const {
      departmentId,
      status,          // PENDING / APPROVED / REJECTED
      graduationYear,
      search,          // by name or email
      sortBy = "createdAt",
      order = "desc",  // asc | desc
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};
    if (departmentId) where.departmentId = Number(departmentId);
    if (status) where.approvalStatus = status;
    if (graduationYear) where.graduationYear = Number(graduationYear);
    if (search) {
      where.OR = [
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [profilesRaw, total] = await Promise.all([
      prisma.userProfile.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: order },
        skip: (page - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.userProfile.count({ where }),
    ]);

    // ✅ map over the whole array
    const profiles = profilesRaw.map((p) => {
      if (!p.profilePicture) return p;

      const match = p.profilePicture.match(/id=([a-zA-Z0-9_-]+)/);
      const driveId = match ? match[1] : null;

      return {
        ...p,
        profilePicture: driveId
          ? `http://localhost:5500/api/v1/google-image/${driveId}`
          : null,
      };
    });

    res.json({ total, page: Number(page), limit: Number(limit), profiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
}


/* -----------------------
   Approve a single profile
------------------------ */
export async function approveProfile(req, res) {
  const { profileId, approverId, comment } = req.body;

  try {
    const profile = await prisma.userProfile.update({
      where: { id: profileId },
      data: { approvalStatus: "APPROVED" },
    });

    await prisma.approvalHistory.create({
      data: {
        entityType: "UserProfile",
        entityId: profileId,
        action: "APPROVED",
        approvedById: approverId,
        comments: comment || null,
      },
    });

    await prisma.notification.create({
      data: {
        recipientId: profile.userId,
        message: "Your profile has been approved 🎉",
      },
    });

    res.json({ message: "Profile approved", profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve profile" });
  }
}

/* -----------------------
   Reject a single profile
------------------------ */
export async function rejectProfile(req, res) {
  const { profileId, approverId, comment } = req.body;

  try {
    const profile = await prisma.userProfile.update({
      where: { id: profileId },
      data: { approvalStatus: "REJECTED" },
    });

    await prisma.approvalHistory.create({
      data: {
        entityType: "UserProfile",
        entityId: profileId,
        action: "REJECTED",
        approvedById: approverId,
        comments: comment || null,
      },
    });

    await prisma.notification.create({
      data: {
        recipientId: profile.userId,
        message: comment
          ? `Your profile was rejected: ${comment}`
          : "Your profile was rejected ❌",
      },
    });

    res.json({ message: "Profile rejected", profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reject profile" });
  }
}

/* -----------------------
   Approve all in a department
------------------------ */
export async function approveAllInDepartment(req, res) {
  const { departmentId, approverId } = req.body;

  try {
    const pendingProfiles = await prisma.userProfile.findMany({
      where: { departmentId: Number(departmentId), approvalStatus: "PENDING" },
      select: { id: true, userId: true },
    });

    if (!pendingProfiles.length) {
      return res.json({ message: "No pending profiles in this department" });
    }

    // Update status
    await prisma.userProfile.updateMany({
      where: { id: { in: pendingProfiles.map((p) => p.id) } },
      data: { approvalStatus: "APPROVED" },
    });

    // Write approval history
    await prisma.approvalHistory.createMany({
      data: pendingProfiles.map((p) => ({
        entityType: "UserProfile",
        entityId: p.id,
        action: "APPROVED",
        approvedById: approverId,
      })),
    });

    // Notify users
    await prisma.notification.createMany({
      data: pendingProfiles.map((p) => ({
        recipientId: p.userId,
        message: "Your profile has been approved 🎉",
      })),
    });

    res.json({
      message: `Approved ${pendingProfiles.length} profiles successfully`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve profiles" });
  }
}


export async function getProfileById(req, res) {
  try {
    const { id } = req.params;

    const profileRaw = await prisma.userProfile.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            photos: { select: { id: true, url: true } }, // <-- fetch user's photos
          },
        },
        department: { select: { id: true, name: true } },
      },
    });

    if (!profileRaw) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Handle the single profilePicture
    const profilePic = profileRaw.profilePicture;
    let mainPic = null;
    if (profilePic) {
      const match = profilePic.match(/id=([a-zA-Z0-9_-]+)/);
      const driveId = match ? match[1] : null;
      mainPic = driveId
        ? `http://localhost:5500/api/v1/google-image/${driveId}`
        : profilePic;
    }

    // Handle the extra photos from Photo table
    const gallery =
      profileRaw.user.photos?.map((ph) => {
        const match = ph.url.match(/id=([a-zA-Z0-9_-]+)/);
        const driveId = match ? match[1] : null;
        return {
          id: ph.id,
          url: driveId
            ? `http://localhost:5500/api/v1/google-image/${driveId}`
            : ph.url,
        };
      }) || [];

    const profile = {
      ...profileRaw,
      profilePicture: mainPic,
      photos: gallery,
    };

    res.json({ profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
}
