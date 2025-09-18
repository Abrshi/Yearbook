import express from "express";
import {
  getProfiles,
  approveProfile,
  rejectProfile,
  approveAllInDepartment,
  getProfileById,
} from "../../controllers/admin/profile.controller.js";

const router = express.Router();

router.get("/", getProfiles);                  // filtering/search
router.get("/:id", getProfileById); 
router.post("/approve", approveProfile);       // single approve
router.post("/reject", rejectProfile);         // single reject
router.post("/approve-all", approveAllInDepartment);

export default router;
