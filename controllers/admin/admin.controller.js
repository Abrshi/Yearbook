import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
//=============


export const listUsers = async (req, res) => {
  const { search } = req.query; // 👈 ?search=John
  console.log("Search query:", search);

  try {
    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}, // no filter → return all users
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
      orderBy: { fullName: "asc" },
    });

    return res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};



//=================


export const addDepartmentAndDepartmentHead = async (req, res) => {
  const { name, email, headUserId } = req.body; // 👈 pass this from frontend

  if (!name || !headUserId) {
    return res.status(400).json({ error: "Department name and head user ID are required" });
  }

  try {
    // 1. Check if the user exists
    const user = await prisma.user.findUnique({ where: { id: headUserId } });
    if (!user) return res.status(404).json({ error: "Head user not found" });

    // 2. Create department and assign head
    const department = await prisma.department.create({
      data: {
        name,
        email,
        headId: headUserId, // 👈 assign head
      },
    });

    // 3. Update user role to DEPARTMENT_HEAD
    await prisma.user.update({
      where: { id: headUserId },
      data: { role: "DEPARTMENT_HEAD" },
    });

    return res.status(201).json({
      message: "Department created and head assigned successfully",
      department,
    });
  } catch (err) {
    console.error("Error adding department and head:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


//======================

