import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const prisma = new PrismaClient();

// ---------------- Token Helpers ----------------
const generateAccessToken = (user) =>
  jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

const generateRefreshToken = () =>
  crypto.randomBytes(64).toString("hex"); // random string

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// ---------------- Cookie Options ----------------
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ---------------- SignUp ----------------
export const signUp = async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { fullName, email, passwordHash },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken);

    await prisma.session.create({
      data: { userId: user.id, refreshToken: hashedRefreshToken },
    });

    res
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json({
        accessToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
};

// ---------------- SignIn ----------------
export const signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken);

    await prisma.session.create({
      data: { userId: user.id, refreshToken: hashedRefreshToken },
    });

    res
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json({
        accessToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

// ---------------- Refresh Token ----------------
export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: "No refresh token provided" });

  try {
    const hashedToken = hashToken(token);

    const session = await prisma.session.findFirst({
      where: { refreshToken: hashedToken },
      include: { user: true },
    });

    if (!session) return res.status(403).json({ error: "Invalid refresh token" });

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken();
    const newHashedToken = hashToken(newRefreshToken);

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newHashedToken },
    });

    const accessToken = generateAccessToken(session.user);

    res
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json({ accessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(403).json({ error: "Could not refresh token" });
  }
};

// ---------------- Logout ----------------
export const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(204);

  try {
    const hashedToken = hashToken(refreshToken);
    await prisma.session.deleteMany({ where: { refreshToken: hashedToken } });
    res.clearCookie("refreshToken", cookieOptions);
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
};
