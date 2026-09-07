import React, { useMemo } from "react";
import { Link } from "react-router-dom";

import BookCard from "../components/BookCard";
import { useBookCatalog } from "../hooks/useBookCatalog";

const PALETTE = {
  primary: "#9A2F27",
  ink: "#1F2A37",
  cream: "#FBF7F0",
  line: "#EAE3D5",
  muted: "#6B7280",
};

const FONT_SERIF = "'Fraunces', serif";

const TextbookBooks = () => {
  const { books, loading, loadingMore, error, hasMore, loadMore, reload } =
    useBookCatalog({
      initialFilters: { category: "Giáo trình đại cương", sort: "newest" },
    });

  // Chỉ hiện giáo trình còn hàng — lọc ở client trên trang đã tải
  // (logic gốc, giữ nguyên; backend chưa lọc theo status để giữ
  // phạm vi thay đổi gọn — đã thống nhất khi lên kế hoạch).
  const textbookBooks = useMemo(
    () => books.filter((book) => book.status !== "sold"),
    [books],
  );

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: PALETTE.cream,
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* QUAY LẠI */}
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold hover:underline"
          style={{
            color: PALETTE.primary,
          }}
        >
          ← Về trang chủ
        </Link>

        {/* HEADER */}
        <div
          className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"
          style={{
            borderColor: PALETTE.line,
          }}
        >
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{
                color: PALETTE.primary,
              }}
            >
              Sách SV
            </p>

            <h1
              className="mt-2 text-3xl font-bold"
              style={{
                color: PALETTE.ink,
                fontFamily: FONT_SERIF,
              }}
            >
              Giáo trình nổi bật
            </h1>

            <p
              className="mt-2 text-sm"
              style={{
                color: PALETTE.muted,
              }}
            >
              Danh sách giáo trình đại cương đang được rao bán trên Sách SV.
            </p>
          </div>

          {!loading && !error && (
            <div
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold"
              style={{
                borderColor: PALETTE.line,
                color: PALETTE.muted,
              }}
            >
              {textbookBooks.length} giáo trình
            </div>
          )}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
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
                <div className="h-56 animate-pulse bg-slate-200" />

                <div className="space-y-3 p-4">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />

                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />

                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />

                  <div className="h-9 w-full animate-pulse rounded-lg bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERROR */}
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
                fontFamily: FONT_SERIF,
              }}
            >
              Không tải được danh sách giáo trình
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
              onClick={reload}
              className="mt-5 inline-block rounded-xl px-5 py-2.5 text-sm font-extrabold text-white"
              style={{
                backgroundColor: PALETTE.primary,
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* DANH SÁCH */}
        {!loading && !error && textbookBooks.length > 0 && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {textbookBooks.map((book) => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>

            {/* ĐÃ THÊM: trang này giờ phân trang thật ở server, nếu
                không có nút này sẽ lại bị cụt ở 10 cuốn như lỗi cũ. */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={loadMore}
                  className="rounded-xl border-2 px-6 py-2.5 text-sm font-extrabold transition hover:brightness-95 disabled:opacity-50"
                  style={{
                    borderColor: PALETTE.primary,
                    color: PALETTE.primary,
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  {loadingMore ? "Đang tải..." : "Xem thêm giáo trình"}
                </button>
              </div>
            )}
          </>
        )}

        {/* KHÔNG CÓ GIÁO TRÌNH */}
        {!loading && !error && textbookBooks.length === 0 && (
          <div
            className="mt-8 rounded-2xl border bg-white p-12 text-center shadow-sm"
            style={{
              borderColor: PALETTE.line,
            }}
          >
            <div className="text-6xl">🎓</div>

            <h3
              className="mt-4 text-xl font-bold"
              style={{
                color: PALETTE.ink,
                fontFamily: FONT_SERIF,
              }}
            >
              Chưa có giáo trình
            </h3>

            <p
              className="mt-2 text-sm"
              style={{
                color: PALETTE.muted,
              }}
            >
              Hiện tại chưa có sách thuộc danh mục Giáo trình đại cương.
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

export default TextbookBooks;
