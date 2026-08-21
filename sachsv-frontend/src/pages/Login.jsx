// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  ShieldCheck,
  Users,
  Loader2,
  ArrowRight,
} from "lucide-react";

/**
 * Login.jsx — Sách SV
 * ---------------------------------------------------------------
 * Giao diện premium bookstore (font Fraunces + Inter, panel navy
 * bên trái, card kem bên phải) — logic đăng nhập nối đúng với:
 *   - api (axios instance đã cấu hình sẵn base URL backend)
 *   - useAuth() — để phần còn lại của app (Navbar, phân quyền...)
 *     nhận biết đúng trạng thái đăng nhập
 *   - react-router-dom Link/useNavigate — điều hướng kiểu SPA,
 *     không load lại trang
 *   - GoogleLogin thật — đã nối với POST /api/auth/google
 * ---------------------------------------------------------------
 */

function useInjectFonts() {
  useEffect(() => {
    const id = "sachsv-font-link";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* ------------------------------------------------------------------ */
/* Minh hoạ sách mở dạng line-art cho panel thương hiệu                */
/* ------------------------------------------------------------------ */
function OpenBookIllustration() {
  return (
    <svg
      viewBox="0 0 420 260"
      fill="none"
      className="w-full max-w-md mx-auto"
      aria-hidden="true"
    >
      <ellipse cx="210" cy="235" rx="150" ry="14" fill="#0E1830" />
      <path
        d="M40 70 C110 45, 160 45, 208 66 L208 210 C160 190, 110 190, 40 212 Z"
        stroke="#B8863B"
        strokeWidth="1.5"
        fill="rgba(184,134,59,0.05)"
      />
      <path
        d="M378 70 C308 45, 258 45, 210 66 L210 210 C258 190, 308 190, 378 212 Z"
        stroke="#B8863B"
        strokeWidth="1.5"
        fill="rgba(184,134,59,0.05)"
      />
      <line
        x1="209"
        y1="60"
        x2="209"
        y2="216"
        stroke="#E9C989"
        strokeWidth="1.5"
      />
      {[92, 112, 132, 152].map((y) => (
        <line
          key={`l-${y}`}
          x1="60"
          y1={y}
          x2="188"
          y2={y - 6}
          stroke="#E9C989"
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
      ))}
      {[92, 112, 132, 152].map((y) => (
        <line
          key={`r-${y}`}
          x1="230"
          y1={y - 6}
          x2="358"
          y2={y}
          stroke="#E9C989"
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
      ))}
      <g transform="translate(196,18)">
        <path d="M0 0 H20 V34 L10 26 L0 34 Z" fill="#9A4B32" />
      </g>
      <circle cx="70" cy="50" r="2.5" fill="#B8863B" />
      <circle cx="352" cy="56" r="2" fill="#E9C989" />
      <circle cx="330" cy="200" r="2.5" fill="#B8863B" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Panel thương hiệu bên trái (ẩn trên mobile)                         */
/* ------------------------------------------------------------------ */
function BrandPanel({ mounted }) {
  const bullets = [
    { icon: BookOpen, text: "Tìm sách giá tốt" },
    { icon: ShieldCheck, text: "Mua bán an toàn" },
    { icon: Users, text: "Kết nối sinh viên toàn trường" },
  ];

  return (
    <div className="relative hidden lg:flex flex-col justify-between h-full overflow-hidden bg-[#16233F] px-14 xl:px-20 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #E9C989 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#9A4B32]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-20 w-80 h-80 rounded-full bg-[#B8863B]/10 blur-3xl" />

      <div
        className={`relative transition-all duration-700 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <span className="inline-block text-[12px] tracking-[0.2em] uppercase text-[#E9C989] font-semibold mb-6">
          Sàn sách sinh viên
        </span>
        <h1
          className="text-[40px] xl:text-[46px] leading-[1.12] text-white"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
        >
          Chào mừng bạn <br />
          <span className="italic text-[#E9C989]">quay lại</span> với Sách SV
        </h1>
        <p className="mt-5 text-[16px] leading-relaxed text-[#C9D0DE] max-w-sm">
          Đăng nhập để khám phá kho sách sinh viên, theo dõi đơn hàng và tiếp
          tục giao dịch dễ dàng.
        </p>

        <ul className="mt-9 space-y-4">
          {bullets.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-center gap-3.5">
              <span className="grid place-items-center w-9 h-9 rounded-full bg-white/[0.06] ring-1 ring-[#E9C989]/25">
                <Icon size={16} strokeWidth={2} className="text-[#E9C989]" />
              </span>
              <span className="text-[15px] text-[#E4E8F0] font-medium">
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`relative my-10 transition-all duration-700 delay-150 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <OpenBookIllustration />
      </div>

      <div
        className={`relative border-l-2 border-[#B8863B] pl-5 transition-all duration-700 delay-300 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <p
          className="text-[17px] italic text-[#EDE6D3] leading-relaxed"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          "Mỗi cuốn sách cũ là một hành trình mới của người tiếp theo."
        </p>
        <span className="mt-2 block text-[13px] text-[#9AA5BC] tracking-wide">
          — Sách SV
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Input field                                                         */
/* ------------------------------------------------------------------ */
function FormField({ label, icon: Icon, error, rightSlot, ...inputProps }) {
  return (
    <div>
      <label className="block text-[13.5px] font-semibold text-[#16233F] mb-2">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9A8F73]">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <input
          {...inputProps}
          className={`w-full h-[52px] rounded-2xl border bg-white pl-11 pr-11 text-[15px] text-[#23262B] placeholder:text-[#B4AC97] outline-none transition-all
            ${
              error
                ? "border-[#C24A3C] focus:ring-4 focus:ring-[#C24A3C]/12"
                : "border-[#E7DFCB] focus:border-[#B8863B] focus:ring-4 focus:ring-[#B8863B]/14"
            }`}
        />
        {rightSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightSlot}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-[13px] text-[#C24A3C] flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-[#C24A3C]" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card đăng nhập                                                      */
/* ------------------------------------------------------------------ */
function LoginCard({ mounted }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
    if (serverError) setServerError("");
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) {
      next.email = "Vui lòng nhập email sinh viên.";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      next.email = "Email chưa đúng định dạng.";
    }
    if (!form.password) {
      next.password = "Vui lòng nhập mật khẩu.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ==========================================================
  // ĐĂNG NHẬP BẰNG EMAIL / MẬT KHẨU
  // ==========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");

    try {
      const response = await api.post("/api/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      const token = response.data.token || response.data.accessToken;
      const userData = response.data.user;

      if (token) {
        login(userData, token);
        navigate("/");
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setServerError("Tài khoản của bạn đã bị khóa hoặc chưa xác thực.");
      } else {
        setServerError(
          err.response?.data?.message || "Email hoặc mật khẩu không chính xác.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // ĐĂNG NHẬP GOOGLE — nhận credential (id_token) từ Google,
  // gửi lên backend xác thực, rồi dùng chung luồng login() y
  // hệt đăng nhập bằng email/mật khẩu ở trên
  // ==========================================================
  const handleGoogleSuccess = async (credentialResponse) => {
    setServerError("");
    setLoading(true);

    try {
      const response = await api.post("/api/auth/google", {
        credential: credentialResponse.credential,
      });

      const token = response.data.token;
      const userData = response.data.user;

      if (token) {
        login(userData, token);
        navigate("/");
      }
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
          "Đăng nhập bằng Google thất bại, vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setServerError("Đăng nhập bằng Google thất bại, vui lòng thử lại.");
  };

  return (
    <div
      className={`relative w-full max-w-[420px] transition-all duration-700 ease-out ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
      }`}
    >
      {/* ribbon bookmark trang trí */}
      <div
        className="absolute -top-3 left-10 w-8 h-14 z-10 shadow-md"
        style={{
          background:
            "linear-gradient(180deg,#E9C989 0%, #B8863B 55%, #9A4B32 100%)",
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
        }}
        aria-hidden="true"
      />

      <div className="rounded-[28px] bg-[#FBF8F2] border border-[#EFE7D3] shadow-[0_20px_60px_-15px_rgba(22,35,63,0.18)] px-8 sm:px-10 py-10">
        <div className="text-center mb-8">
          <h2
            className="text-[26px] text-[#16233F]"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
          >
            Đăng nhập SáchSV
          </h2>
          <p className="mt-2 text-[14.5px] text-[#6B6555]">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="font-semibold text-[#B8863B] hover:text-[#9A4B32] transition-colors"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-2xl bg-[#C24A3C]/8 border border-[#C24A3C]/25 px-4 py-3 text-[13.5px] text-[#C24A3C]"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C24A3C]" />
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <FormField
            label="Email sinh viên"
            icon={Mail}
            type="email"
            placeholder="sv@truong.edu.vn"
            value={form.email}
            onChange={handleChange("email")}
            error={errors.email}
            autoComplete="email"
          />

          <FormField
            label="Mật khẩu"
            icon={Lock}
            type={showPassword ? "text" : "password"}
            placeholder="Nhập mật khẩu"
            value={form.password}
            onChange={handleChange("password")}
            error={errors.password}
            autoComplete="current-password"
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-[#9A8F73] hover:text-[#16233F] transition-colors"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <EyeOff size={18} strokeWidth={1.8} />
                ) : (
                  <Eye size={18} strokeWidth={1.8} />
                )}
              </button>
            }
          />

          <div className="flex justify-end -mt-1">
            <Link
              to="/forgot-password"
              className="text-[13.5px] font-medium text-[#16233F] hover:text-[#B8863B] transition-colors"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group w-full h-[52px] rounded-2xl text-white text-[15.5px] font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#9A4B32]/20 hover:shadow-xl hover:shadow-[#9A4B32]/25 disabled:opacity-80 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(90deg,#9A4B32 0%, #B8863B 100%)",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              <>
                Đăng nhập
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-7">
          <span className="h-px flex-1 bg-[#E7DFCB]" />
          <span className="text-[12.5px] text-[#A79E86] tracking-wide">
            HOẶC
          </span>
          <span className="h-px flex-1 bg-[#E7DFCB]" />
        </div>

        {/* ĐĂNG NHẬP GOOGLE — component thật, đã nối API */}
        <div className="flex justify-center [&>div]:w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            shape="rectangular"
            size="large"
            text="continue_with"
            width="336"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function Login() {
  useInjectFonts();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#F7F2E7]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <main className="grid lg:grid-cols-2 min-h-screen">
        <BrandPanel mounted={mounted} />

        {/* phần giới thiệu rút gọn — chỉ hiện trên mobile vì panel trái đã ẩn */}
        <div
          className={`lg:hidden px-6 pt-10 text-center transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="inline-block text-[11px] tracking-[0.2em] uppercase text-[#B8863B] font-semibold mb-2">
            Sàn sách sinh viên
          </span>
          <h1
            className="text-[26px] leading-tight text-[#16233F]"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
          >
            Chào mừng bạn{" "}
            <span className="italic text-[#9A4B32]">quay lại</span>
          </h1>
        </div>

        <div className="flex items-center justify-center px-5 sm:px-8 py-12 lg:py-16">
          <LoginCard mounted={mounted} />
        </div>
      </main>
    </div>
  );
}
