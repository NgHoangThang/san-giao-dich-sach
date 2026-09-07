import React, { useState } from "react";
import { Link } from "react-router-dom";

import BookCard from "../components/BookCard";
import { useBookCatalog } from "../hooks/useBookCatalog";
import { BOOK_CATEGORIES } from "../constants/bookCategories";

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

// Khoảng giá quy đổi sang minPrice/maxPrice gửi lên backend — biên
// giữ đúng như logic lọc cũ (VD "100-200" loại trừ đúng 100.000đ,
// khớp với "> 100000 && <= 200000" trước đây).
const PRICE_BUCKETS = {
  "under-50": { max: 49999 },
  "50-100": { min: 50000, max: 100000 },
  "100-200": { min: 100001, max: 200000 },
  "over-200": { min: 200001 },
};

const AllBooks = () => {
  const {
    books,
    loading,
    loadingMore,
    error,
    totalCount,
    hasMore,
    filters,
    setSearch,
    setCategory,
    setCondition,
    setSort,
    setPriceRange,
    resetFilters: resetCatalogFilters,
    loadMore,
    reload,
  } = useBookCatalog({ initialFilters: { sort: "newest" } });

  // Chỉ dùng để tô sáng đúng nút/khoảng giá đang chọn trên UI — hook
  // chỉ lưu minPrice/maxPrice, không lưu "tên khoảng giá".
  const [selectedPriceKey, setSelectedPriceKey] = useState("All");

  const handleSelectPrice = (key) => {
    setSelectedPriceKey(key);

    const bucket = PRICE_BUCKETS[key];

    setPriceRange(bucket?.min, bucket?.max);
  };

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.category !== "" ||
    filters.condition !== "" ||
    selectedPriceKey !== "All" ||
    filters.sort !== "newest";

  const resetFilters = () => {
    resetCatalogFilters();
    setSelectedPriceKey("All");
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
                  📖 {totalCount} đầu sách
                </span>

                <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur">
                  🗂 {BOOK_CATEGORIES.length} danh mục
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
              value={filters.search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên sách, tác giả hoặc danh mục..."
              className="h-13 w-full rounded-xl border bg-slate-50 py-3.5 pl-12 pr-12 text-sm outline-none transition focus:bg-white focus:ring-2"
              style={{
                borderColor: PALETTE.line,
              }}
            />

            {filters.search && (
              <button
                type="button"
                onClick={() => setSearch("")}
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
              value={filters.category || "All"}
              onChange={(event) =>
                setCategory(
                  event.target.value === "All" ? "" : event.target.value,
                )
              }
              className="h-11 rounded-xl border bg-white px-3 text-sm font-semibold outline-none"
              style={{
                borderColor: PALETTE.line,
              }}
            >
              <option value="All">Tất cả danh mục</option>

              {BOOK_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={filters.condition || "All"}
              onChange={(event) =>
                setCondition(
                  event.target.value === "All" ? "" : event.target.value,
                )
              }
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
              value={selectedPriceKey}
              onChange={(event) => handleSelectPrice(event.target.value)}
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
              value={filters.sort}
              onChange={(event) => setSort(event.target.value)}
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
              const active = selectedPriceKey === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleSelectPrice(item.value)}
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
                Tìm thấy <span className="font-extrabold">{totalCount}</span>{" "}
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
              onClick={reload}
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
        {!loading && !error && books.length > 0 && (
          <>
            <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {books.map((book) => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>

            {/* XEM THÊM */}
            {hasMore && (
              <div className="mt-10 flex flex-col items-center gap-3">
                <p
                  className="text-sm"
                  style={{
                    color: PALETTE.muted,
                  }}
                >
                  Đang xem <strong>{books.length}</strong> /{" "}
                  <strong>{totalCount}</strong> sách
                </p>

                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={loadMore}
                  className="rounded-xl border px-8 py-3 text-sm font-extrabold shadow-sm transition hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0"
                  style={{
                    borderColor: PALETTE.gold,
                    backgroundColor: PALETTE.white,
                    color: PALETTE.primary,
                  }}
                >
                  {loadingMore ? "Đang tải..." : "Xem thêm sách ↓"}
                </button>
              </div>
            )}
          </>
        )}

        {/* ======================================================
            KHÔNG CÓ KẾT QUẢ
        ====================================================== */}
        {!loading && !error && books.length === 0 && (
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
