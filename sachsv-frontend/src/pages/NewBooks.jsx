import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";
import BookCard from "../components/BookCard";

// ======================================================
// BẢNG MÀU THEO THƯƠNG HIỆU SÁCH SV (đồng bộ với BookCard)
// ======================================================
const PALETTE = {
  primary: "#9A2F27",
  primaryDark: "#7A241D",
  gold: "#C98A2C",
  ink: "#1F2A37",
  cream: "#FBF7F0",
  line: "#EAE3D5",
  muted: "#6B7280",
  success: "#16A34A",
  white: "#FFFFFF",
};

const FONT_SERIF = "'Fraunces', serif";

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

const DAY_MS = 24 * 60 * 60 * 1000;

const isSameCalendarDay = (date, reference) =>
  date.getFullYear() === reference.getFullYear() &&
  date.getMonth() === reference.getMonth() &&
  date.getDate() === reference.getDate();

const TIME_RANGES = [
  { key: "all", label: "Tất cả" },
  { key: "today", label: "Hôm nay" },
  { key: "3days", label: "3 ngày gần đây" },
  { key: "7days", label: "7 ngày gần đây" },
  { key: "30days", label: "30 ngày gần đây" },
];

const CONDITION_OPTIONS = [
  { key: "all", label: "Tất cả tình trạng" },
  { key: "new", label: "Mới 100%" },
  { key: "like-new", label: "Như mới" },
  { key: "used", label: "Đã dùng" },
];

const SORT_OPTIONS = [
  { key: "newest", label: "Mới nhất" },
  { key: "oldest", label: "Cũ hơn" },
  { key: "price-low", label: "Giá thấp đến cao" },
  { key: "price-high", label: "Giá cao đến thấp" },
  { key: "title", label: "Tên A–Z" },
];

const PAGE_SIZE = 10;

const NewBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [timeFilter, setTimeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
      console.error("Lỗi tải sách mới đăng:", requestError);

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

  // Debounce ô tìm kiếm (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim().toLowerCase());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sách còn hàng + có ngày đăng, mới nhất trước (logic gốc, không đổi)
  const newestBooks = useMemo(() => {
    return [...books]
      .filter((book) => book.createdAt && book.status !== "sold")
      .sort(
        (firstBook, secondBook) =>
          new Date(secondBook.createdAt) - new Date(firstBook.createdAt),
      );
  }, [books]);

  // Danh mục lấy từ dữ liệu thật, không hard-code
  const categories = useMemo(() => {
    const unique = new Set(
      newestBooks
        .map((book) => book.category)
        .filter((category) => typeof category === "string" && category.trim()),
    );

    return Array.from(unique).sort((a, b) => a.localeCompare(b, "vi"));
  }, [newestBooks]);

  // Thống kê nhanh tính từ dữ liệu thật
  const stats = useMemo(() => {
    const now = new Date();

    const total = newestBooks.length;

    const todayCount = newestBooks.filter((book) =>
      isSameCalendarDay(new Date(book.createdAt), now),
    ).length;

    const last7DaysCount = newestBooks.filter(
      (book) => now - new Date(book.createdAt) <= 7 * DAY_MS,
    ).length;

    return {
      total,
      todayCount,
      last7DaysCount,
      categoryCount: categories.length,
    };
  }, [newestBooks, categories.length]);

  // Sách đăng trong hôm nay để làm section nổi bật đầu trang (tối đa 5 cuốn)
  const todaySpotlightBooks = useMemo(() => {
    const now = new Date();

    return newestBooks
      .filter((book) => isSameCalendarDay(new Date(book.createdAt), now))
      .slice(0, 5);
  }, [newestBooks]);

  // Áp dụng filter + search + sort trên frontend
  const filteredBooks = useMemo(() => {
    let result = [...newestBooks];
    const now = new Date();

    if (timeFilter !== "all") {
      result = result.filter((book) => {
        const createdAt = new Date(book.createdAt);
        const diff = now - createdAt;

        switch (timeFilter) {
          case "today":
            return isSameCalendarDay(createdAt, now);
          case "3days":
            return diff <= 3 * DAY_MS;
          case "7days":
            return diff <= 7 * DAY_MS;
          case "30days":
            return diff <= 30 * DAY_MS;
          default:
            return true;
        }
      });
    }

    if (categoryFilter !== "all") {
      result = result.filter((book) => book.category === categoryFilter);
    }

    if (conditionFilter !== "all") {
      result = result.filter((book) => book.condition === conditionFilter);
    }

    if (search) {
      result = result.filter((book) => {
        const title = (book.title || "").toLowerCase();
        const author = (book.author || "").toLowerCase();
        const category = (book.category || "").toLowerCase();

        return (
          title.includes(search) ||
          author.includes(search) ||
          category.includes(search)
        );
      });
    }

    switch (sortOption) {
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "price-low":
        result.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-high":
        result.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "title":
        result.sort((a, b) =>
          (a.title || "").localeCompare(b.title || "", "vi"),
        );
        break;
      case "newest":
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return result;
  }, [
    newestBooks,
    timeFilter,
    categoryFilter,
    conditionFilter,
    search,
    sortOption,
  ]);

  // Reset phân trang mỗi khi filter/search/sort thay đổi
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [timeFilter, categoryFilter, conditionFilter, search, sortOption]);

  const displayedBooks = filteredBooks.slice(0, visibleCount);
  const hasMore = visibleCount < filteredBooks.length;

  const hasActiveFilters =
    search !== "" ||
    timeFilter !== "all" ||
    categoryFilter !== "all" ||
    conditionFilter !== "all" ||
    sortOption !== "newest";

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setTimeFilter("all");
    setCategoryFilter("all");
    setConditionFilter("all");
    setSortOption("newest");
  };

  // Ảnh sách thật mới nhất để trang trí banner (chỉ khi dữ liệu có images)
  const decorativeImages = useMemo(() => {
    return newestBooks
      .filter((book) => book?.images?.[0])
      .slice(0, 3)
      .map((book) => ({
        id: book._id,
        title: book.title,
        url: resolveImageUrl(book.images[0]),
      }));
  }, [newestBooks]);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: PALETTE.cream,
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* BREADCRUMB */}
        <nav
          className="mb-4 flex items-center gap-1.5 text-xs font-semibold"
          style={{
            color: PALETTE.muted,
          }}
          aria-label="breadcrumb"
        >
          <Link
            to="/"
            className="transition hover:underline"
            style={{
              color: PALETTE.primary,
            }}
          >
            Trang chủ
          </Link>

          <span>/</span>

          <span
            style={{
              color: PALETTE.ink,
            }}
          >
            Sách mới đăng
          </span>
        </nav>

        {/* HERO / BANNER */}
        <div
          className="relative overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-10"
          style={{
            background: `linear-gradient(135deg, ${PALETTE.primary} 0%, ${PALETTE.primaryDark} 100%)`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, #FFFFFF 1px, transparent 1px), radial-gradient(circle at 80% 60%, #FFFFFF 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white"
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                📚 Sách mới lên kệ
              </span>

              <h1
                className="mt-4 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl"
                style={{
                  fontFamily: FONT_SERIF,
                }}
              >
                Khám phá những cuốn sách vừa được đăng trên Sách SV
              </h1>

              <p
                className="mt-3 text-sm leading-6 sm:text-base"
                style={{
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Cập nhật liên tục từ cộng đồng sinh viên.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Mới đăng",
                  "Cập nhật liên tục",
                  "Còn hàng",
                  "Sinh viên đăng bán",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.14)",
                      border: `1px solid ${PALETTE.gold}`,
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {decorativeImages.length > 0 && (
              <div className="hidden shrink-0 items-end gap-4 sm:flex">
                {decorativeImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-xl border-4 border-white/90 bg-white shadow-2xl"
                    style={{
                      width: 100,
                      height: 140,
                      transform:
                        index === 0
                          ? "rotate(-6deg)"
                          : index === 1
                            ? "translateY(14px)"
                            : "rotate(6deg)",
                    }}
                  >
                    <img
                      src={image.url}
                      alt={image.title || "Sách mới đăng"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* THỐNG KÊ NHANH */}
        {!loading && !error && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              {
                label: "Tổng sách mới",
                value: stats.total > 0 ? `${stats.total}` : "—",
              },
              {
                label: "Đăng hôm nay",
                value: stats.todayCount > 0 ? `${stats.todayCount}` : "—",
              },
              {
                label: "Trong 7 ngày",
                value:
                  stats.last7DaysCount > 0 ? `${stats.last7DaysCount}` : "—",
              },
              {
                label: "Danh mục có sách mới",
                value: stats.categoryCount > 0 ? `${stats.categoryCount}` : "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border bg-white p-4 shadow-sm"
                style={{
                  borderColor: PALETTE.line,
                }}
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{
                    color: PALETTE.muted,
                  }}
                >
                  {item.label}
                </p>

                <p
                  className="mt-1.5 truncate text-lg font-extrabold sm:text-xl"
                  style={{
                    color: PALETTE.primary,
                    fontFamily: FONT_SERIF,
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* SECTION MỚI HÔM NAY */}
        {!loading && !error && todaySpotlightBooks.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <h2
                className="text-lg font-bold"
                style={{
                  color: PALETTE.ink,
                  fontFamily: FONT_SERIF,
                }}
              >
                Mới hôm nay
              </h2>

              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white"
                style={{
                  backgroundColor: PALETTE.success,
                }}
              >
                Vừa đăng
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {todaySpotlightBooks.map((book) => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>
          </div>
        )}

        {/* TÌM KIẾM */}
        <div className="mt-8">
          <div
            className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 shadow-sm"
            style={{
              borderColor: PALETTE.line,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={PALETTE.muted}
              strokeWidth="2"
              className="shrink-0"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>

            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm sách mới theo tên, tác giả hoặc danh mục..."
              className="w-full bg-transparent text-sm outline-none"
              style={{
                color: PALETTE.ink,
              }}
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Xóa từ khóa"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                style={{
                  backgroundColor: PALETTE.muted,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* BỘ LỌC THEO THỜI GIAN */}
        <div className="mt-4 flex flex-wrap gap-2">
          {TIME_RANGES.map((range) => {
            const isActive = timeFilter === range.key;

            return (
              <button
                key={range.key}
                type="button"
                onClick={() => setTimeFilter(range.key)}
                className="rounded-full border px-4 py-2 text-xs font-bold transition"
                style={
                  isActive
                    ? {
                        backgroundColor: PALETTE.primary,
                        borderColor: PALETTE.primary,
                        color: PALETTE.white,
                      }
                    : {
                        backgroundColor: PALETTE.white,
                        borderColor: PALETTE.line,
                        color: PALETTE.ink,
                      }
                }
              >
                {range.label}
              </button>
            );
          })}
        </div>

        {/* THANH CÔNG CỤ: KẾT QUẢ + DANH MỤC + TÌNH TRẠNG + SẮP XẾP */}
        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p
            className="text-sm font-bold"
            style={{
              color: PALETTE.ink,
            }}
          >
            {loading ? "Đang tải..." : `${filteredBooks.length} cuốn phù hợp`}
          </p>

          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border bg-white px-3 py-2 text-xs font-bold outline-none"
              style={{
                borderColor: PALETTE.line,
                color: PALETTE.ink,
              }}
            >
              <option value="all">Tất cả danh mục</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={conditionFilter}
              onChange={(event) => setConditionFilter(event.target.value)}
              className="rounded-xl border bg-white px-3 py-2 text-xs font-bold outline-none"
              style={{
                borderColor: PALETTE.line,
                color: PALETTE.ink,
              }}
            >
              {CONDITION_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
              className="rounded-xl border bg-white px-3 py-2 text-xs font-bold outline-none"
              style={{
                borderColor: PALETTE.line,
                color: PALETTE.ink,
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-xl border px-3 py-2 text-xs font-bold transition hover:brightness-95"
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
            {Array.from({
              length: 10,
            }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                style={{
                  borderColor: PALETTE.line,
                }}
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
        {!loading && error && (
          <div
            className="mt-6 rounded-2xl border bg-white p-10 text-center shadow-sm"
            style={{
              borderColor: "#F1C4BC",
            }}
          >
            <div className="text-5xl">⚠️</div>

            <h3
              className="mt-4 text-xl font-bold"
              style={{
                color: PALETTE.ink,
                fontFamily: FONT_SERIF,
              }}
            >
              Không tải được danh sách sách mới
            </h3>

            <p
              className="mx-auto mt-2 max-w-lg text-sm leading-6"
              style={{
                color: PALETTE.muted,
              }}
            >
              {error}
            </p>

            <button
              type="button"
              onClick={fetchBooks}
              className="mt-5 inline-block rounded-xl px-5 py-2.5 text-sm font-extrabold text-white transition hover:brightness-110"
              style={{
                backgroundColor: PALETTE.primary,
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* DANH SÁCH SÁCH */}
        {!loading && !error && displayedBooks.length > 0 && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {displayedBooks.map((book) => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((current) => current + PAGE_SIZE)
                  }
                  className="rounded-xl border-2 px-6 py-2.5 text-sm font-extrabold transition hover:brightness-95"
                  style={{
                    borderColor: PALETTE.primary,
                    color: PALETTE.primary,
                    backgroundColor: PALETTE.white,
                  }}
                >
                  Xem thêm sách mới
                </button>
              </div>
            )}
          </>
        )}

        {/* KHÔNG TÌM THẤY KẾT QUẢ SAU KHI LỌC (vẫn còn sách mới gốc) */}
        {!loading &&
          !error &&
          newestBooks.length > 0 &&
          filteredBooks.length === 0 && (
            <div
              className="mt-6 rounded-2xl border bg-white p-12 text-center shadow-sm"
              style={{
                borderColor: PALETTE.line,
              }}
            >
              <div className="text-6xl">🔎</div>

              <h3
                className="mt-4 text-xl font-bold"
                style={{
                  color: PALETTE.ink,
                  fontFamily: FONT_SERIF,
                }}
              >
                Không tìm thấy sách mới phù hợp
              </h3>

              <p
                className="mt-2 text-sm"
                style={{
                  color: PALETTE.muted,
                }}
              >
                Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-xl px-5 py-2.5 text-sm font-extrabold text-white transition hover:brightness-110"
                  style={{
                    backgroundColor: PALETTE.primary,
                  }}
                >
                  Xóa bộ lọc
                </button>

                <Link
                  to="/"
                  className="rounded-xl border-2 px-5 py-2.5 text-sm font-extrabold transition hover:brightness-95"
                  style={{
                    borderColor: PALETTE.primary,
                    color: PALETTE.primary,
                  }}
                >
                  Về trang chủ
                </Link>
              </div>
            </div>
          )}

        {/* KHÔNG CÓ SÁCH MỚI NÀO TRONG HỆ THỐNG */}
        {!loading && !error && newestBooks.length === 0 && (
          <div
            className="mt-6 rounded-2xl border bg-white p-12 text-center shadow-sm"
            style={{
              borderColor: PALETTE.line,
            }}
          >
            <div className="text-6xl">📚</div>

            <h3
              className="mt-4 text-xl font-bold"
              style={{
                color: PALETTE.ink,
                fontFamily: FONT_SERIF,
              }}
            >
              Chưa có sách mới đăng
            </h3>

            <p
              className="mt-2 text-sm"
              style={{
                color: PALETTE.muted,
              }}
            >
              Hiện tại chưa có sách mới trong hệ thống.
            </p>

            <Link
              to="/"
              className="mt-5 inline-block rounded-xl px-5 py-2.5 text-sm font-extrabold text-white"
              style={{
                backgroundColor: PALETTE.primary,
              }}
            >
              Về trang chủ
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewBooks;
