import express from "express";
import { signUp, signIn, logout, refreshToken } from "../../controllers/auth/auth.controller.js";


const router = express.Router();

router.post("/signup", signUp);
router.post("/login", signIn);
router.post("/logout", logout);
router.post("/refresh", refreshToken);

// Example protected route

export default router;
