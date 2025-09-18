import express from "express";
import { addYearBookProfile, getDepartments, getMyProfileWithPhotos, getProfileDetails, getProfilesOverview } from "../../controllers/student/student.controllers.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // temp folder

router.post("/addYearBookProfile",upload.array("photos", 5), addYearBookProfile);
router.get("/departments", getDepartments);

router.get("/me/:id", getMyProfileWithPhotos);
router.get("/all",getProfilesOverview)
router.get("/:id",getProfileDetails)
export default router;
