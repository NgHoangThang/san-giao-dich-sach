const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { validateCreateReport } = require("../middleware/validateTransaction");

router.post(
  "/",
  authMiddleware,
  validateCreateReport,
  reportController.createReport,
);
router.get(
  "/",
  authMiddleware,
  authorizeRoles("admin"),
  reportController.getAllReports,
);

module.exports = router;
