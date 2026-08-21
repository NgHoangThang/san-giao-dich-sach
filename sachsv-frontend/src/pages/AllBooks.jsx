import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";
import BookCard from "../components/BookCard";

const PALETTE = {
  primary: "#9A2F27",
  primaryDark: "#7A241D",
  gold: "#C98A2C",
  cream: "#FBF7F0",
  white: "#FFFFFF",
  ink: "#1F2A37",
  muted: "#6B7280",
  line: "#EAE3D5",
};

const FONT_SERIF = "'Fraunces', serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

const AllBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [sortOption, setSortOption] = useState("newest");

  const [visibleCount, setVisibleCount] = useState(10);

  // ======================================================
  // LẤY DANH SÁCH SÁCH
  // ======================================================
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
      console.error("Lỗi tải tất cả sách:", requestError);

      setError(
        requestError.response?.data?.message ||
          "Không thể tải danh sách sách. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // ======================================================
  // DANH MỤC LẤY TỪ DỮ LIỆU THẬT
  // ======================================================
  const categories = useMemo(() => {
    return Array.from(
      new Set(books.map((book) => book.category).filter(Boolean)),
    );
  }, [books]);

  // ======================================================
  // FILTER + SEARCH + SORT
  // ======================================================
  const filteredBooks = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const result = books.filter((book) => {
      const title = String(book.title || "").toLowerCase();

      const author = String(book.author || "").toLowerCase();

      const category = String(book.category || "").toLowerCase();

      const matchSearch =
        !keyword ||
        title.includes(keyword) ||
        author.includes(keyword) ||
        category.includes(keyword);

      const matchCategory =
        selectedCategory === "All" || book.category === selectedCategory;

      const matchCondition =
        selectedCondition === "All" || book.condition === selectedCondition;

      const price = Number(book.price || 0);

      const matchPrice =
        selectedPrice === "All" ||
        (selectedPrice === "under-50" && price < 50000) ||
        (selectedPrice === "50-100" && price >= 50000 && price <= 100000) ||
        (selectedPrice === "100-200" && price > 100000 && price <= 200000) ||
        (selectedPrice === "over-200" && price > 200000);

      return matchSearch && matchCategory && matchCondition && matchPrice;
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
    books,
    searchTerm,
    selectedCategory,
    selectedCondition,
    selectedPrice,
    sortOption,
  ]);

  // ======================================================
  // RESET VISIBLE COUNT KHI FILTER THAY ĐỔI
  // ======================================================
  useEffect(() => {
    setVisibleCount(10);
  }, [
    searchTerm,
    selectedCategory,
    selectedCondition,
    selectedPrice,
    sortOption,
  ]);

  const visibleBooks = filteredBooks.slice(0, visibleCount);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedCondition !== "All" ||
    selectedPrice !== "All" ||
    sortOption !== "newest";

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
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      `}</style>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* BREADCRUMB */}
        <div className="mb-5 flex items-center gap-2 text-sm">
          <Link
            to="/"
            className="font-semibold hover:underline"
            style={{
              color: PALETTE.primary,
            }}
          >
            Trang chủ
          </Link>

          <span
            style={{
              color: PALETTE.muted,
            }}
          >
            /
          </span>

          <span
            style={{
              color: PALETTE.muted,
            }}
          >
            Tất cả sách
          </span>
        </div>

        {/* ======================================================
            HERO
        ====================================================== */}
        <section
          className="relative overflow-hidden rounded-3xl px-6 py-10 text-white shadow-lg sm:px-10 lg:px-14"
          style={{
            background: `linear-gradient(135deg, ${PALETTE.primaryDark}, ${PALETTE.primary})`,
          }}
        >
          <div
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20"
            style={{
              backgroundColor: PALETTE.gold,
            }}
          />

          <div className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-white opacity-5" />

          <div className="relative z-10 max-w-3xl">
            <p
              className="text-xs font-extrabold uppercase tracking-[0.2em]"
              style={{
                color: "#F4D99C",
                fontFamily: FONT_MONO,
              }}
            >
              📚 Kho sách Sách SV
            </p>

            <h1
              className="mt-3 text-3xl font-bold sm:text-4xl lg:text-5xl"
              style={{
                fontFamily: FONT_SERIF,
              }}
            >
              Khám phá toàn bộ kho sách
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
              Tìm giáo trình, sách chuyên ngành, sách kỹ năng và nhiều đầu sách
              từ cộng đồng sinh viên trên Sách SV.
            </p>

            {!loading && !error && (
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur">
                  📖 {books.length} đầu sách
                </span>

                <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur">
                  🗂 {categories.length} danh mục
                </span>

                <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur">
                  🔎 Tìm kiếm nhanh
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ======================================================
            SEARCH + FILTER
        ====================================================== */}
        <section
          className="relative z-10 -mt-5 mx-3 rounded-2xl border bg-white p-5 shadow-xl sm:mx-6 lg:mx-10"
          style={{
            borderColor: PALETTE.line,
          }}
        >
          {/* SEARCH */}
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                color: PALETTE.muted,
              }}
            >
              <circle cx="11" cy="11" r="8" />

              <path d="m21 21-4.3-4.3" />
            </svg>

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên sách, tác giả hoặc danh mục..."
              className="h-13 w-full rounded-xl border bg-slate-50 py-3.5 pl-12 pr-12 text-sm outline-none transition focus:bg-white focus:ring-2"
              style={{
                borderColor: PALETTE.line,
              }}
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold"
                style={{
                  color: PALETTE.muted,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* FILTER */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-11 rounded-xl border bg-white px-3 text-sm font-semibold outline-none"
              style={{
                borderColor: PALETTE.line,
              }}
            >
              <option value="All">Tất cả danh mục</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={selectedCondition}
              onChange={(event) => setSelectedCondition(event.target.value)}
              className="h-11 rounded-xl border bg-white px-3 text-sm font-semibold outline-none"
              style={{
                borderColor: PALETTE.line,
              }}
            >
              <option value="All">Tất cả tình trạng</option>

              <option value="new">Mới 100%</option>

              <option value="like-new">Như mới</option>

              <option value="used">Đã dùng</option>
            </select>

            <select
              value={selectedPrice}
              onChange={(event) => setSelectedPrice(event.target.value)}
              className="h-11 rounded-xl border bg-white px-3 text-sm font-semibold outline-none"
              style={{
                borderColor: PALETTE.line,
              }}
            >
              <option value="All">Tất cả mức giá</option>

              <option value="under-50">Dưới 50.000đ</option>

              <option value="50-100">50.000đ – 100.000đ</option>

              <option value="100-200">100.000đ – 200.000đ</option>

              <option value="over-200">Trên 200.000đ</option>
            </select>

            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
              className="h-11 rounded-xl border bg-white px-3 text-sm font-semibold outline-none"
              style={{
                borderColor: PALETTE.line,
              }}
            >
              <option value="newest">Mới nhất</option>

              <option value="price-low">Giá thấp → cao</option>

              <option value="price-high">Giá cao → thấp</option>

              <option value="title">Tên A–Z</option>
            </select>
          </div>

          {/* QUICK PRICE FILTER */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              {
                value: "All",
                label: "Tất cả",
              },
              {
                value: "under-50",
                label: "Dưới 50K",
              },
              {
                value: "50-100",
                label: "50K - 100K",
              },
              {
                value: "100-200",
                label: "100K - 200K",
              },
              {
                value: "over-200",
                label: "Trên 200K",
              },
            ].map((item) => {
              const active = selectedPrice === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedPrice(item.value)}
                  className="rounded-full border px-4 py-2 text-xs font-bold transition hover:-translate-y-0.5"
                  style={{
                    backgroundColor: active ? PALETTE.primary : PALETTE.white,
                    color: active ? PALETTE.white : PALETTE.muted,
                    borderColor: active ? PALETTE.primary : PALETTE.line,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ======================================================
            TOOLBAR
        ====================================================== */}
        {!loading && !error && (
          <div
            className="mt-10 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between"
            style={{
              borderColor: PALETTE.line,
            }}
          >
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{
                  color: PALETTE.primary,
                  fontFamily: FONT_MONO,
                }}
              >
                Danh sách sản phẩm
              </p>

              <h2
                className="mt-1 text-2xl font-bold"
                style={{
                  color: PALETTE.ink,
                  fontFamily: FONT_SERIF,
                }}
              >
                Tất cả sách
              </h2>

              <p
                className="mt-1 text-sm"
                style={{
                  color: PALETTE.muted,
                }}
              >
                Tìm thấy{" "}
                <span className="font-extrabold">{filteredBooks.length}</span>{" "}
                cuốn phù hợp
              </p>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="self-start rounded-xl border bg-white px-4 py-2 text-sm font-bold transition hover:bg-red-50 sm:self-auto"
                style={{
                  borderColor: PALETTE.line,
                  color: PALETTE.primary,
                }}
              >
                ✕ Xóa bộ lọc
              </button>
            )}
          </div>
        )}

        {/* ======================================================
            LOADING
        ====================================================== */}
        {loading && (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({
              length: 10,
            }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border bg-white"
                style={{
                  borderColor: PALETTE.line,
                }}
              >
                <div className="h-60 animate-pulse bg-slate-200" />

                <div className="space-y-3 p-4">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />

                  <div className="h-5 w-full animate-pulse rounded bg-slate-200" />

                  <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />

                  <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ======================================================
            ERROR
        ====================================================== */}
        {error && (
          <div
            className="mt-8 rounded-2xl border bg-white p-10 text-center shadow-sm"
            style={{
              borderColor: "#F1C4BC",
            }}
          >
            <div className="text-5xl">⚠️</div>

            <h3
              className="mt-4 text-xl font-bold"
              style={{
                color: PALETTE.ink,
              }}
            >
              Không tải được kho sách
            </h3>

            <p
              className="mt-2 text-sm"
              style={{
                color: PALETTE.muted,
              }}
            >
              {error}
            </p>

            <button
              type="button"
              onClick={fetchBooks}
              className="mt-5 rounded-xl px-6 py-3 text-sm font-extrabold text-white"
              style={{
                backgroundColor: PALETTE.primary,
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* ======================================================
            DANH SÁCH SÁCH
        ====================================================== */}
        {!loading && !error && filteredBooks.length > 0 && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleBooks.map((book) => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>

            {/* XEM THÊM */}
            {visibleCount < filteredBooks.length && (
              <div className="mt-10 flex flex-col items-center gap-3">
                <p
                  className="text-sm"
                  style={{
                    color: PALETTE.muted,
                  }}
                >
                  Đang xem{" "}
                  <strong>
                    {Math.min(visibleCount, filteredBooks.length)}
                  </strong>{" "}
                  / <strong>{filteredBooks.length}</strong> sách
                </p>

                <button
                  type="button"
                  onClick={() => setVisibleCount((previous) => previous + 10)}
                  className="rounded-xl border px-8 py-3 text-sm font-extrabold shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    borderColor: PALETTE.gold,
                    backgroundColor: PALETTE.white,
                    color: PALETTE.primary,
                  }}
                >
                  Xem thêm sách ↓
                </button>
              </div>
            )}
          </>
        )}

        {/* ======================================================
            KHÔNG CÓ KẾT QUẢ
        ====================================================== */}
        {!loading && !error && filteredBooks.length === 0 && (
          <div
            className="mt-8 rounded-3xl border bg-white p-12 text-center"
            style={{
              borderColor: PALETTE.line,
            }}
          >
            <div className="text-6xl">🔎</div>

            <h3
              className="mt-4 text-2xl font-bold"
              style={{
                color: PALETTE.ink,
                fontFamily: FONT_SERIF,
              }}
            >
              Không tìm thấy sách phù hợp
            </h3>

            <p
              className="mt-2 text-sm"
              style={{
                color: PALETTE.muted,
              }}
            >
              Hãy thử thay đổi từ khóa, danh mục, tình trạng hoặc khoảng giá.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-xl px-6 py-3 text-sm font-extrabold text-white"
              style={{
                backgroundColor: PALETTE.primary,
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllBooks;
