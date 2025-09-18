import express from "express";
import { addDepartmentAndDepartmentHead, listUsers } from "../../controllers/admin/admin.controller.js";


const router = express.Router();

router.post("/add", addDepartmentAndDepartmentHead);
router.get("/list", listUsers);

// Example protected route

export default router;


