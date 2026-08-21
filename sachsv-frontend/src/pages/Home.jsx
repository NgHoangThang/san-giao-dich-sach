import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";

import api from "../services/api";
import BookCard from "../components/BookCard";
import { useAuth } from "../context/AuthContext";

// ======================================================
// BẢNG MÀU THEO THƯƠNG HIỆU SÁCH SV (đỏ nâu chủ đạo)
// ======================================================
const PALETTE = {
  primary: "#9A2F27",
  primaryDark: "#7A241D",
  gold: "#C98A2C",
  goldSoft: "#F0DDA8",
  ink: "#1F2A37",
  cream: "#FBF7F0",
  creamSoft: "#FFFDF9",
  line: "#EAE3D5",
  muted: "#6B7280",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  white: "#FFFFFF",
};

const FONT_SERIF = "'Fraunces', serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const API_ORIGIN = (
  process.env.REACT_APP_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

const resolveImageUrl = (image) => {
  if (!image) return "";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${API_ORIGIN}${image}`;
  }

  return `${API_ORIGIN}/${image}`;
};

const CATEGORY_META = {
  "Công nghệ thông tin": { short: "CNTT", icon: "💻" },
  "Kinh tế": { short: "Kinh tế", icon: "📊" },
  "Ngoại ngữ": { short: "Ngoại ngữ", icon: "🗣" },
  "Y Dược": { short: "Y Dược", icon: "⚕" },
  "Văn học": { short: "Văn học", icon: "📖" },
  "Kỹ năng sống": { short: "Kỹ năng sống", icon: "🎯" },
  "Giáo trình đại cương": { short: "Giáo trình", icon: "🎓" },
  "Khoa học - Kỹ thuật": { short: "KH - Kỹ thuật", icon: "🔬" },
  Luật: { short: "Luật", icon: "⚖️" },
  "Thiếu nhi - Truyện tranh": { short: "Thiếu nhi", icon: "🎨" },
};

const getStoredValue = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getSellerId = (book) => {
  const seller = book?.sellerId;

  if (!seller) return "";

  if (typeof seller === "object") {
    return String(seller._id || seller.id || "");
  }

  return String(seller);
};

const getSellerName = (book) => {
  const seller = book?.sellerId;

  if (seller && typeof seller === "object") {
    return seller.fullName || seller.name || "";
  }

  return "";
};

const isBookNew = (book) => {
  if (!book?.createdAt) return false;

  const createdAt = new Date(book.createdAt);

  if (Number.isNaN(createdAt.getTime())) return false;

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - createdAt.getTime() <= sevenDays;
};

const Home = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const booksSectionRef = useRef(null);

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState(() =>
    getStoredValue("sachsv-home-search", ""),
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [selectedCategory, setSelectedCategory] = useState(() =>
    getStoredValue("sachsv-home-category", "All"),
  );
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [sortOption, setSortOption] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(8);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/books");

      const responseBooks = Array.isArray(response.data)
        ? response.data
        : response.data?.books || response.data?.data || [];

      setBooks(Array.isArray(responseBooks) ? responseBooks : []);
    } catch (requestError) {
      console.error("Lỗi tải danh sách sách:", requestError);

      setError(
        requestError.response?.data?.message ||
          "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    try {
      localStorage.setItem("sachsv-home-search", searchTerm);
      localStorage.setItem("sachsv-home-category", selectedCategory);
    } catch {
      // Trình duyệt có thể chặn localStorage.
    }
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    setVisibleCount(8);
  }, [
    debouncedSearch,
    selectedCategory,
    selectedCondition,
    selectedPrice,
    sortOption,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 650);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const safeBooks = useMemo(() => (Array.isArray(books) ? books : []), [books]);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(safeBooks.map((book) => book.category).filter(Boolean)),
    );

    return ["All", ...uniqueCategories];
  }, [safeBooks]);

  useEffect(() => {
    if (selectedCategory !== "All" && !categories.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [categories, selectedCategory]);

  const categoryCounts = useMemo(() => {
    return safeBooks.reduce((result, book) => {
      const category = book.category || "Khác";
      result[category] = (result[category] || 0) + 1;
      return result;
    }, {});
  }, [safeBooks]);

  const statistics = useMemo(() => {
    const sellerIds = new Set(safeBooks.map(getSellerId).filter(Boolean));

    const newBooks = safeBooks.filter(isBookNew).length;

    return {
      totalBooks: safeBooks.length,
      totalCategories: Object.keys(categoryCounts).length,
      totalSellers: sellerIds.size,
      newBooks,
    };
  }, [safeBooks, categoryCounts]);

  const filteredBooks = useMemo(() => {
    const keyword = normalizeText(debouncedSearch);

    const result = safeBooks.filter((book) => {
      const searchableText = [
        book.title,
        book.author,
        book.category,
        getSellerName(book),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);

      const matchesCategory =
        selectedCategory === "All" || book.category === selectedCategory;

      const matchesCondition =
        selectedCondition === "All" || book.condition === selectedCondition;

      const price = Number(book.price || 0);

      const matchesPrice =
        selectedPrice === "All" ||
        (selectedPrice === "under-50" && price < 50000) ||
        (selectedPrice === "50-100" && price >= 50000 && price <= 100000) ||
        (selectedPrice === "over-100" && price > 100000);

      return (
        matchesSearch && matchesCategory && matchesCondition && matchesPrice
      );
    });

    return [...result].sort((firstBook, secondBook) => {
      if (sortOption === "price-low") {
        return Number(firstBook.price || 0) - Number(secondBook.price || 0);
      }

      if (sortOption === "price-high") {
        return Number(secondBook.price || 0) - Number(firstBook.price || 0);
      }

      if (sortOption === "title") {
        return String(firstBook.title || "").localeCompare(
          String(secondBook.title || ""),
          "vi",
        );
      }

      const firstDate = firstBook.createdAt
        ? new Date(firstBook.createdAt).getTime()
        : 0;

      const secondDate = secondBook.createdAt
        ? new Date(secondBook.createdAt).getTime()
        : 0;

      return secondDate - firstDate;
    });
  }, [
    safeBooks,
    debouncedSearch,
    selectedCategory,
    selectedCondition,
    selectedPrice,
    sortOption,
  ]);

  const newestBooks = useMemo(() => {
    return safeBooks
      .filter((book) => book.createdAt && book.status !== "sold")
      .sort(
        (firstBook, secondBook) =>
          new Date(secondBook.createdAt) - new Date(firstBook.createdAt),
      )
      .slice(0, 5);
  }, [safeBooks]);

  // "Sách giá tốt" = giá thấp nhất trong số sách còn hàng.
  // Không hiển thị giá gốc/giảm giá giả vì backend chưa có field đó.
  const bestPriceBooks = useMemo(() => {
    return safeBooks
      .filter((book) => book.status !== "sold" && Number(book.price) > 0)
      .sort(
        (firstBook, secondBook) =>
          Number(firstBook.price) - Number(secondBook.price),
      )
      .slice(0, 5);
  }, [safeBooks]);

  // "Giáo trình nổi bật" chỉ tạo khi thực sự có sách thuộc danh mục
  // "Giáo trình" trong dữ liệu — không tự bịa section rỗng.
  const hasTextbookCategory = categories.includes("Giáo trình đại cương");

  const textbookBooks = useMemo(() => {
    if (!hasTextbookCategory) {
      return [];
    }

    return [...safeBooks]
      .filter(
        (book) =>
          book.category === "Giáo trình đại cương" && book.status !== "sold",
      )
      .sort((firstBook, secondBook) => {
        const firstDate = firstBook.createdAt
          ? new Date(firstBook.createdAt).getTime()
          : 0;

        const secondDate = secondBook.createdAt
          ? new Date(secondBook.createdAt).getTime()
          : 0;

        return secondDate - firstDate;
      })
      .slice(0, 5);
  }, [safeBooks, hasTextbookCategory]);
  const popularCategories = useMemo(() => {
    return Object.entries(categoryCounts)
      .sort((first, second) => second[1] - first[1])
      .slice(0, 8);
  }, [categoryCounts]);

  const heroMainBook = newestBooks[0] || safeBooks[0] || null;
  const heroSideBooks = [bestPriceBooks[0] || null, newestBooks[1] || null];

  const suggestions = useMemo(() => {
    const keyword = normalizeText(searchTerm);

    if (!keyword) return [];

    return safeBooks
      .filter((book) =>
        normalizeText(`${book.title || ""} ${book.author || ""}`).includes(
          keyword,
        ),
      )
      .slice(0, 5);
  }, [safeBooks, searchTerm]);

  const visibleBooks = filteredBooks.slice(0, visibleCount);

  const hasActiveFilters =
    searchTerm.trim() ||
    selectedCategory !== "All" ||
    selectedCondition !== "All" ||
    selectedPrice !== "All" ||
    sortOption !== "newest";

  const scrollToBooks = (category) => {
    if (category) {
      setSelectedCategory(category);
    }

    booksSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedCondition("All");
    setSelectedPrice("All");
    setSortOption("newest");
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: PALETTE.cream,
        color: PALETTE.ink,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        @keyframes sachsv-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sachsv-fade-up {
          animation: sachsv-fade-up 0.5s ease both;
        }

        .sachsv-scroll::-webkit-scrollbar {
          height: 0px;
        }
      `}</style>

      {/* ==================================================
          THANH DANH MỤC (chức năng mở rộng bố cục)
      ================================================== */}
      <div className="border-b bg-white" style={{ borderColor: PALETTE.line }}>
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setCategoryMenuOpen((previous) => !previous)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
              style={{ backgroundColor: PALETTE.primary }}
            >
              <span>☰</span>
              Danh mục sản phẩm
            </button>

            {categoryMenuOpen && (
              <div
                className="absolute left-0 top-[calc(100%+6px)] z-40 w-64 overflow-hidden rounded-xl border bg-white shadow-2xl"
                style={{ borderColor: PALETTE.line }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("All");
                    setCategoryMenuOpen(false);
                    scrollToBooks();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold hover:bg-slate-50"
                  style={{ color: PALETTE.ink }}
                >
                  📚 Tất cả danh mục
                </button>

                {categories
                  .filter((category) => category !== "All")
                  .map((category) => {
                    const meta = CATEGORY_META[category];

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category);
                          setCategoryMenuOpen(false);
                          scrollToBooks();
                        }}
                        className="flex w-full items-center gap-2.5 border-t px-4 py-2.5 text-left text-sm font-semibold hover:bg-slate-50"
                        style={{
                          borderColor: PALETTE.line,
                          color: PALETTE.ink,
                        }}
                      >
                        <span>{meta?.icon || "📖"}</span>
                        {category}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="sachsv-scroll flex flex-1 items-center gap-1 overflow-x-auto">
            {categories.map((category) => {
              const active = selectedCategory === category;
              const meta = CATEGORY_META[category];

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition"
                  style={{
                    color: active ? PALETTE.primary : PALETTE.muted,
                    backgroundColor: active ? PALETTE.cream : "transparent",
                  }}
                >
                  {category === "All" ? "Tất cả" : meta?.short || category}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================================================
          HERO: 1 BANNER CHÍNH + 2 BANNER PHỤ
      ================================================== */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Banner chính */}
          <div
            className="sachsv-fade-up relative flex min-h-[300px] flex-col justify-center overflow-hidden rounded-2xl px-8 py-10 sm:min-h-[360px] sm:px-12"
            style={{ backgroundColor: PALETTE.primary }}
          >
            <p
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: PALETTE.goldSoft, fontFamily: FONT_MONO }}
            >
              Sách SV · Kho sách sinh viên
            </p>

            <h1
              className="mt-4 max-w-lg text-3xl font-bold leading-tight text-white sm:text-4xl"
              style={{ fontFamily: FONT_SERIF }}
            >
              Kho sách sinh viên – mua bán dễ dàng, tiết kiệm hơn
            </h1>

            <p className="mt-4 max-w-md text-sm leading-6 text-white/85 sm:text-base">
              Tìm giáo trình, sách chuyên ngành và tài liệu học tập từ cộng đồng
              sinh viên.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollToBooks()}
                className="rounded-xl px-6 py-3 text-sm font-extrabold shadow-lg transition hover:-translate-y-0.5"
                style={{
                  backgroundColor: PALETTE.white,
                  color: PALETTE.primary,
                }}
              >
                Khám phá ngay
              </button>

              {isAdmin && (
                <Link
                  to="/create-book"
                  className="rounded-xl border-2 border-white/70 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-white/10"
                >
                  Đăng bán sách
                </Link>
              )}
            </div>

            {heroMainBook?.images?.[0] && (
              <div className="pointer-events-none absolute -right-6 bottom-0 hidden h-[85%] w-40 overflow-hidden rounded-t-2xl border-4 border-white/20 shadow-2xl sm:block lg:w-48">
                <img
                  src={resolveImageUrl(heroMainBook.images[0])}
                  alt={heroMainBook.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Banner phụ */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {heroSideBooks[0] && (
              <Link
                to={`/books/${heroSideBooks[0]._id}`}
                className="sachsv-fade-up relative flex min-h-[168px] items-center gap-4 overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-lg"
                style={{ borderColor: PALETTE.line }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: PALETTE.gold, fontFamily: FONT_MONO }}
                  >
                    Sách giá tốt
                  </p>

                  <p
                    className="mt-1.5 line-clamp-2 text-sm font-bold"
                    style={{ color: PALETTE.ink }}
                  >
                    {heroSideBooks[0].title}
                  </p>

                  <p
                    className="mt-2 text-base font-extrabold"
                    style={{ color: PALETTE.primary }}
                  >
                    {Number(heroSideBooks[0].price || 0).toLocaleString(
                      "vi-VN",
                    )}{" "}
                    đ
                  </p>
                </div>

                {heroSideBooks[0].images?.[0] && (
                  <img
                    src={resolveImageUrl(heroSideBooks[0].images[0])}
                    alt={heroSideBooks[0].title}
                    className="h-24 w-16 shrink-0 rounded-lg object-cover shadow"
                  />
                )}
              </Link>
            )}

            {isAdmin && heroSideBooks[1] && (
              <Link
                to={`/books/${heroSideBooks[1]._id}`}
                className="sachsv-fade-up relative flex min-h-[168px] items-center gap-4 overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-lg"
                style={{ borderColor: PALETTE.line }}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: PALETTE.success, fontFamily: FONT_MONO }}
                  >
                    Sách mới đăng
                  </p>

                  <p
                    className="mt-1.5 line-clamp-2 text-sm font-bold"
                    style={{ color: PALETTE.ink }}
                  >
                    {heroSideBooks[1].title}
                  </p>

                  <p
                    className="mt-2 text-base font-extrabold"
                    style={{ color: PALETTE.primary }}
                  >
                    {Number(heroSideBooks[1].price || 0).toLocaleString(
                      "vi-VN",
                    )}{" "}
                    đ
                  </p>
                </div>

                {heroSideBooks[1].images?.[0] && (
                  <img
                    src={resolveImageUrl(heroSideBooks[1].images[0])}
                    alt={heroSideBooks[1].title}
                    className="h-24 w-16 shrink-0 rounded-lg object-cover shadow"
                  />
                )}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          SEARCH + FILTER
      ================================================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5"
          style={{ borderColor: PALETTE.line }}
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_auto]">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ color: PALETTE.muted }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>

              <input
                type="text"
                value={searchTerm}
                onFocus={() => setSearchFocused(true)}
                onBlur={() =>
                  window.setTimeout(() => setSearchFocused(false), 150)
                }
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm kiếm sách, tác giả, ngành học..."
                className="h-12 w-full rounded-xl border bg-slate-50 pl-11 pr-11 text-sm outline-none transition focus:bg-white focus:ring-2"
                style={{
                  borderColor: PALETTE.line,
                  "--tw-ring-color": "rgba(154, 47, 39, 0.18)",
                }}
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-sm transition hover:bg-slate-200"
                  style={{ color: PALETTE.muted }}
                  aria-label="Xóa nội dung tìm kiếm"
                >
                  ✕
                </button>
              )}

              {searchFocused && suggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-[54px] z-50 overflow-hidden rounded-xl border bg-white shadow-2xl"
                  style={{ borderColor: PALETTE.line }}
                >
                  {suggestions.map((book) => (
                    <button
                      key={book._id}
                      type="button"
                      onMouseDown={() => {
                        setSearchTerm(book.title || "");
                        setSearchFocused(false);
                      }}
                      className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition hover:bg-slate-50"
                      style={{ borderColor: PALETTE.line }}
                    >
                      <span className="text-xl">📘</span>

                      <span className="min-w-0">
                        <span
                          className="block truncate text-sm font-bold"
                          style={{ color: PALETTE.ink }}
                        >
                          {book.title}
                        </span>

                        <span
                          className="block truncate text-xs"
                          style={{ color: PALETTE.muted }}
                        >
                          {book.author || "Chưa rõ tác giả"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-12 rounded-xl border bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:bg-white focus:ring-2"
              style={{
                borderColor: PALETTE.line,
                "--tw-ring-color": "rgba(154, 47, 39, 0.18)",
              }}
            >
              <option value="All">Tất cả danh mục</option>

              {categories
                .filter((category) => category !== "All")
                .map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>

            <select
              value={selectedCondition}
              onChange={(event) => setSelectedCondition(event.target.value)}
              className="h-12 rounded-xl border bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:bg-white focus:ring-2"
              style={{
                borderColor: PALETTE.line,
                "--tw-ring-color": "rgba(154, 47, 39, 0.18)",
              }}
            >
              <option value="All">Mọi tình trạng</option>
              <option value="new">Sách mới</option>
              <option value="like-new">Như mới</option>
              <option value="used">Đã dùng</option>
            </select>

            <select
              value={selectedPrice}
              onChange={(event) => setSelectedPrice(event.target.value)}
              className="h-12 rounded-xl border bg-slate-50 px-4 text-sm font-semibold outline-none transition focus:bg-white focus:ring-2"
              style={{
                borderColor: PALETTE.line,
                "--tw-ring-color": "rgba(154, 47, 39, 0.18)",
              }}
            >
              <option value="All">Mọi mức giá</option>
              <option value="under-50">Dưới 50.000đ</option>
              <option value="50-100">50.000đ – 100.000đ</option>
              <option value="over-100">Trên 100.000đ</option>
            </select>

            <button
              type="button"
              onClick={() => scrollToBooks()}
              className="h-12 rounded-xl px-6 text-sm font-extrabold text-white shadow-sm transition hover:brightness-110"
              style={{ backgroundColor: PALETTE.primary }}
            >
              Tìm ngay
            </button>
          </div>

          <p className="mt-3 text-xs" style={{ color: PALETTE.muted }}>
            Sắp xếp và xóa bộ lọc có ở ngay khu vực "Tất cả sách" bên dưới.
          </p>
        </div>
      </section>

      {/* ==================================================
          THỐNG KÊ (tính từ dữ liệu sách thật)
      ================================================== */}
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              icon: "📚",
              value: statistics.totalBooks,
              label: "Sách đang hiển thị",
            },
            {
              icon: "🗂",
              value: statistics.totalCategories,
              label: "Danh mục hiện có",
            },
            {
              icon: "👤",
              value: statistics.totalSellers,
              label: "Người bán có dữ liệu",
            },
            ...(isAdmin
              ? [
                  {
                    icon: "✨",
                    value: statistics.newBooks,
                    label: "Sách mới trong 7 ngày",
                  },
                ]
              : []),
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: PALETTE.line }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-white"
                style={{ backgroundColor: PALETTE.primary }}
              >
                {stat.icon}
              </div>

              <div>
                <p
                  className="text-xl font-extrabold"
                  style={{ color: PALETTE.ink }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-[11px] font-semibold"
                  style={{ color: PALETTE.muted }}
                >
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================================================
          DANH MỤC NỔI BẬT
      ================================================== */}
      {popularCategories.length > 0 && (
        <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <h2
              className="text-2xl font-bold"
              style={{ color: PALETTE.ink, fontFamily: FONT_SERIF }}
            >
              Danh mục nổi bật
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
            {popularCategories.map(([category, count]) => {
              const meta = CATEGORY_META[category] || {
                short: category,
                icon: "📖",
              };

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => scrollToBooks(category)}
                  className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderColor: PALETTE.line }}
                >
                  <span className="text-2xl">{meta.icon}</span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: PALETTE.ink }}
                  >
                    {meta.short}
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: PALETTE.muted }}
                  >
                    {count} sách
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ==================================================
          SÁCH MỚI ĐĂNG
      ================================================== */}
      {isAdmin && !loading && !error && newestBooks.length > 0 && (
        <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="flex items-end justify-between border-b pb-4"
            style={{ borderColor: PALETTE.line }}
          >
            <div>
              <h2
                className="text-2xl font-bold"
                style={{ color: PALETTE.ink, fontFamily: FONT_SERIF }}
              >
                Sách mới đăng
              </h2>
              <p className="mt-1 text-sm" style={{ color: PALETTE.muted }}>
                {newestBooks.length} cuốn vừa được cập nhật
              </p>
            </div>
            <Link
              to="/sach-moi-dang"
              className="text-sm font-extrabold hover:underline"
              style={{ color: PALETTE.primary }}
            >
              Xem tất cả →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {newestBooks.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* ==================================================
          SÁCH GIÁ TỐT
      ================================================== */}
      {!loading && !error && bestPriceBooks.length > 0 && (
        <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="flex items-end justify-between border-b pb-4"
            style={{ borderColor: PALETTE.line }}
          >
            <div>
              <h2
                className="text-2xl font-bold"
                style={{ color: PALETTE.ink, fontFamily: FONT_SERIF }}
              >
                Sách giá tốt
              </h2>
              <p className="mt-1 text-sm" style={{ color: PALETTE.muted }}>
                Những cuốn sách còn hàng có giá thấp nhất hiện có
              </p>
            </div>

            <Link
              to="/sach-gia-tot"
              className="text-sm font-extrabold hover:underline"
              style={{ color: PALETTE.primary }}
            >
              Xem tất cả →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {bestPriceBooks.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* ==================================================
          GIÁO TRÌNH NỔI BẬT (chỉ hiện khi dữ liệu có danh mục này)
      ================================================== */}
      {!loading &&
        !error &&
        hasTextbookCategory &&
        textbookBooks.length > 0 && (
          <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className="flex items-end justify-between border-b pb-4"
              style={{ borderColor: PALETTE.line }}
            >
              <div>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: PALETTE.ink, fontFamily: FONT_SERIF }}
                >
                  Giáo trình nổi bật
                </h2>
                <p className="mt-1 text-sm" style={{ color: PALETTE.muted }}>
                  {textbookBooks.length} giáo trình đang được rao bán
                </p>
              </div>
              <Link
                to="/giao-trinh-noi-bat"
                className="text-sm font-extrabold hover:underline"
                style={{ color: PALETTE.primary }}
              >
                Xem tất cả →
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {textbookBooks.map((book) => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>
          </section>
        )}

      {/* ==================================================
          TẤT CẢ SÁCH — CATALOG CHÍNH
      ================================================== */}
      <section
        ref={booksSectionRef}
        className="mx-auto mt-12 max-w-7xl scroll-mt-24 px-4 pb-20 sm:px-6 lg:px-8"
      >
        <div
          className="rounded-3xl border bg-white p-5 shadow-sm sm:p-8"
          style={{
            borderColor: PALETTE.line,
            backgroundColor: PALETTE.creamSoft,
          }}
        >
          {/* TIÊU ĐỀ SECTION */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide"
                style={{
                  backgroundColor: PALETTE.cream,
                  color: PALETTE.primary,
                  border: `1px solid ${PALETTE.goldSoft}`,
                  fontFamily: FONT_MONO,
                }}
              >
                Kho sách Sách SV
              </span>

              <h2
                className="mt-3 text-2xl font-bold sm:text-3xl"
                style={{ color: PALETTE.ink, fontFamily: FONT_SERIF }}
              >
                Tất cả sách
              </h2>

              <p className="mt-1.5 text-sm" style={{ color: PALETTE.muted }}>
                Khám phá toàn bộ sách đang được đăng trên Sách SV.
              </p>
            </div>
          </div>

          {/* ĐƯỜNG PHÂN CÁCH */}
          <div
            className="my-5 border-t"
            style={{ borderColor: PALETTE.line }}
          />

          {/* TOOLBAR: KẾT QUẢ + SẮP XẾP + XÓA BỘ LỌC */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold" style={{ color: PALETTE.ink }}>
              {loading ? (
                "Đang tải danh sách..."
              ) : (
                <>
                  Tìm thấy{" "}
                  <span style={{ color: PALETTE.primary }}>
                    {filteredBooks.length}
                  </span>{" "}
                  cuốn phù hợp với bộ lọc hiện tại
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
                className="h-10 rounded-lg border bg-white px-3 text-xs font-semibold outline-none transition focus:ring-2"
                style={{
                  borderColor: PALETTE.line,
                  color: PALETTE.ink,
                  "--tw-ring-color": "rgba(154, 47, 39, 0.18)",
                }}
              >
                <option value="newest">Mới nhất</option>
                <option value="price-low">Giá thấp đến cao</option>
                <option value="price-high">Giá cao đến thấp</option>
                <option value="title">Tên A–Z</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 rounded-lg border px-3 text-xs font-bold transition hover:brightness-95"
                  style={{
                    borderColor: PALETTE.gold,
                    color: PALETTE.primaryDark,
                    backgroundColor: PALETTE.cream,
                  }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                  style={{ borderColor: PALETTE.line }}
                >
                  <div className="h-56 animate-pulse bg-slate-200" />

                  <div className="space-y-3 p-4">
                    <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
                    <div className="h-9 w-full animate-pulse rounded-lg bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LỖI */}
          {error && (
            <div
              className="mt-6 rounded-2xl border bg-white p-10 text-center shadow-sm"
              style={{ borderColor: "#F1C4BC" }}
            >
              <div className="text-5xl">⚠️</div>

              <h3
                className="mt-4 text-xl font-bold"
                style={{ color: PALETTE.ink, fontFamily: FONT_SERIF }}
              >
                Kho sách chưa mở được
              </h3>

              <p
                className="mx-auto mt-2 max-w-lg text-sm leading-6"
                style={{ color: PALETTE.muted }}
              >
                {error}
              </p>

              <button
                type="button"
                onClick={fetchBooks}
                className="mt-5 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white transition hover:brightness-110"
                style={{ backgroundColor: PALETTE.primary }}
              >
                Thử lại
              </button>
            </div>
          )}

          {/* DANH SÁCH SÁCH */}
          {!loading &&
            !error &&
            (filteredBooks.length > 0 ? (
              <>
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {visibleBooks.map((book) => (
                    <div key={book._id} className="flex h-full">
                      <BookCard book={book} />
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col items-center gap-2">
                  {visibleCount < filteredBooks.length && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((count) => count + 8)}
                      className="rounded-xl border-2 px-8 py-3 text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                      style={{
                        borderColor: PALETTE.primary,
                        color: PALETTE.primary,
                        backgroundColor: PALETTE.white,
                      }}
                    >
                      Xem thêm sách
                    </button>
                  )}

                  <p
                    className="text-xs font-semibold"
                    style={{ color: PALETTE.muted }}
                  >
                    Đang xem {Math.min(visibleCount, filteredBooks.length)} /{" "}
                    {filteredBooks.length} sách
                  </p>
                </div>
              </>
            ) : (
              <div
                className="mt-6 rounded-2xl border bg-white p-12 text-center shadow-sm"
                style={{ borderColor: PALETTE.line }}
              >
                <div className="text-6xl">🔎</div>

                <h3
                  className="mt-4 text-xl font-bold"
                  style={{ color: PALETTE.ink, fontFamily: FONT_SERIF }}
                >
                  Không tìm thấy sách phù hợp
                </h3>

                <p
                  className="mx-auto mt-2 max-w-lg text-sm leading-6"
                  style={{ color: PALETTE.muted }}
                >
                  Hãy thử thay đổi từ khóa, danh mục, tình trạng hoặc mức giá.
                </p>

                <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl px-5 py-2.5 text-sm font-extrabold text-white transition hover:brightness-110"
                    style={{ backgroundColor: PALETTE.primary }}
                  >
                    Xóa bộ lọc
                  </button>

                  {isAdmin && (
                    <Link
                      to="/create-book"
                      className="rounded-xl border px-5 py-2.5 text-sm font-extrabold"
                      style={{ borderColor: PALETTE.gold, color: PALETTE.ink }}
                    >
                      Đăng cuốn sách đầu tiên
                    </Link>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white shadow-2xl transition hover:-translate-y-1"
          style={{ backgroundColor: PALETTE.primary }}
          aria-label="Trở về đầu trang"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default Home;
