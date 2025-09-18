import multer from "multer";

const upload = multer({ dest: "uploads/" }); // temp folder
export default upload;
