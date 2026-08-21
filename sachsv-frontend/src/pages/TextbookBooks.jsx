import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";
import BookCard from "../components/BookCard";

const PALETTE = {
  primary: "#9A2F27",
  ink: "#1F2A37",
  cream: "#FBF7F0",
  line: "#EAE3D5",
  muted: "#6B7280",
};

const FONT_SERIF = "'Fraunces', serif";

const TextbookBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/api/books");

        const responseBooks = Array.isArray(response.data)
          ? response.data
          : response.data?.books || response.data?.data || [];

        setBooks(Array.isArray(responseBooks) ? responseBooks : []);
      } catch (requestError) {
        console.error("Lỗi tải giáo trình:", requestError);

        setError(
          requestError.response?.data?.message ||
            "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // Chỉ lấy Giáo trình đại cương còn hàng
  const textbookBooks = useMemo(() => {
    return [...books]
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
      });
  }, [books]);

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
          </div>
        )}

        {/* DANH SÁCH */}
        {!loading && !error && textbookBooks.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {textbookBooks.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>
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
