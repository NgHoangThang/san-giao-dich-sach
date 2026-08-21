const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    university: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String, // Link ảnh từ Cloudinary
      default: "",
    },

    // OTP xác thực email
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false, // Sẽ đổi thành true khi xác thực qua Gmail
    },
    role: {
      type: String,
      enum: ["student", "user", "admin"],
      default: "student",
    },

    // ==========================================
    // TÍNH NĂNG ADMIN: Khóa tài khoản vi phạm
    // ==========================================
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Hash password trước khi lưu vào DB
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// So sánh password khi login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
