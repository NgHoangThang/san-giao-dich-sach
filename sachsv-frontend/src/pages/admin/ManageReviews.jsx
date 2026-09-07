import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const API_ORIGIN = (
  process.env.REACT_APP_API_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");

const PAGE_SIZE = 6;

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

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const formatDate = (value) => {
  if (!value) return "Không xác định";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không xác định";
  }

  return date.toLocaleString("vi-VN");
};

const getInitial = (name) => {
  if (!name) return "U";
  return name.trim().charAt(0).toUpperCase();
};

const getReviewer = (review) =>
  review?.reviewerId && typeof review.reviewerId === "object"
    ? review.reviewerId
    : null;

const getSeller = (review) =>
  review?.revieweeId && typeof review.revieweeId === "object"
    ? review.revieweeId
    : null;

const getOrder = (review) =>
  review?.orderId && typeof review.orderId === "object" ? review.orderId : null;

// ĐÃ SỬA: Order giờ chứa nhiều sách qua items[] thay vì 1 bookId duy
// nhất. Trang này (thống kê/kiểm duyệt đánh giá) chỉ cần đại diện 1
// sách để hiển thị nên lấy item đầu tiên — ưu tiên title/price snapshot
// lưu sẵn trong item (đáng tin cậy hơn vì không phụ thuộc sách còn
// tồn tại hay không), merge thêm author/images từ Book đã populate
// nếu có.
const getBook = (review) => {
  const order = getOrder(review);

  const firstItem = order?.items?.[0];

  if (!firstItem) {
    return null;
  }

  const populatedBook =
    firstItem.bookId && typeof firstItem.bookId === "object"
      ? firstItem.bookId
      : null;

  return {
    ...(populatedBook || {}),
    title: firstItem.title || populatedBook?.title,
    price: firstItem.price ?? populatedBook?.price,
  };
};

const analyzeReview = (review) => {
  const rating = Number(review?.rating || 0);
  const comment = String(review?.comment || "")
    .trim()
    .toLowerCase();

  const negativeWords = [
    "tệ",
    "xấu",
    "dở",
    "dỡ",
    "quá dở",
    "quá tệ",
    "lừa",
    "lừa đảo",
    "chậm",
    "hỏng",
    "rách",
    "bẩn",
    "không đúng",
    "không tốt",
    "không hài lòng",
    "thất vọng",
    "khó chịu",
    "kém",
    "tồi",
  ];

  const positiveWords = [
    "tốt",
    "đẹp",
    "nhanh",
    "uy tín",
    "nhiệt tình",
    "hài lòng",
    "đúng mô tả",
    "rất ổn",
    "chất lượng",
    "tuyệt vời",
    "ok",
  ];

  const hasNegativeWord = negativeWords.some((word) => comment.includes(word));

  const hasPositiveWord = positiveWords.some((word) => comment.includes(word));

  // Nội dung bình luận được ưu tiên hơn số sao
  if (hasNegativeWord && !hasPositiveWord) {
    return {
      key: "negative",
      label: "Tiêu cực",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
      cardClass: "border-red-200 shadow-[0_18px_60px_rgba(239,68,68,0.08)]",
      accentClass: "bg-red-500",
    };
  }

  if (hasPositiveWord && !hasNegativeWord) {
    return {
      key: "positive",
      label: "Tích cực",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      cardClass:
        "border-emerald-100 shadow-[0_18px_60px_rgba(16,185,129,0.06)]",
      accentClass: "bg-emerald-500",
    };
  }

  // Không nhận diện rõ nội dung thì phân loại theo số sao
  if (rating <= 2) {
    return {
      key: "negative",
      label: "Tiêu cực",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
      cardClass: "border-red-200 shadow-[0_18px_60px_rgba(239,68,68,0.08)]",
      accentClass: "bg-red-500",
    };
  }

  if (rating >= 4) {
    return {
      key: "positive",
      label: "Tích cực",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      cardClass:
        "border-emerald-100 shadow-[0_18px_60px_rgba(16,185,129,0.06)]",
      accentClass: "bg-emerald-500",
    };
  }

  return {
    key: "neutral",
    label: "Trung lập",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    cardClass: "border-amber-100 shadow-[0_18px_60px_rgba(245,158,11,0.06)]",
    accentClass: "bg-amber-400",
  };
};

const StarRating = ({ rating = 0, size = "text-lg" }) => {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${safeRating} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`${size} ${
            star <= safeRating
              ? "text-amber-400 drop-shadow-sm"
              : "text-slate-200"
          }`}
        >
          ★
        </span>
      ))}

      <span className="ml-1 text-sm font-bold text-slate-600">
        {safeRating}/5
      </span>
    </div>
  );
};

const Avatar = ({ user, size = "w-14 h-14" }) => {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveImageUrl(user?.avatar);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        alt={user?.fullName || "Người dùng"}
        className={`${size} rounded-2xl object-cover ring-4 ring-white shadow-md`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${size} rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 text-white flex items-center justify-center text-xl font-black ring-4 ring-white shadow-md`}
    >
      {getInitial(user?.fullName)}
    </div>
  );
};

const StatCard = ({ icon, label, value, subText, className = "" }) => (
  <div
    className={`relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur ${className}`}
  >
    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-100/70" />

    <div className="relative flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          {value}
        </p>

        {subText && (
          <p className="mt-2 text-xs font-medium text-slate-400">{subText}</p>
        )}
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-2xl text-white shadow-lg">
        {icon}
      </div>
    </div>
  </div>
);

const ManageReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchKeyword, setSearchKeyword] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedReview, setSelectedReview] = useState(null);
  const [copiedReviewId, setCopiedReviewId] = useState("");

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/admin/reviews");

      const reviewData = Array.isArray(response.data)
        ? response.data
        : response.data?.reviews || [];

      setReviews(reviewData);
    } catch (requestError) {
      console.error("Lỗi lấy danh sách đánh giá:", requestError);

      setError(
        requestError.response?.data?.message ||
          "Không thể tải danh sách đánh giá.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, ratingFilter, sentimentFilter, sortOption]);

  const statistics = useMemo(() => {
    const total = reviews.length;

    const totalRating = reviews.reduce(
      (sum, review) => sum + Number(review.rating || 0),
      0,
    );

    const averageRating = total > 0 ? (totalRating / total).toFixed(1) : "0.0";

    const fiveStar = reviews.filter(
      (review) => Number(review.rating) === 5,
    ).length;

    const needAttention = reviews.filter(
      (review) => analyzeReview(review).key === "negative",
    ).length;

    const withComment = reviews.filter(
      (review) => String(review.comment || "").trim().length > 0,
    ).length;

    return {
      total,
      averageRating,
      fiveStar,
      needAttention,
      withComment,
    };
  }, [reviews]);

  const distribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter(
        (review) => Number(review.rating) === star,
      ).length;

      const percentage =
        reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;

      return {
        star,
        count,
        percentage,
      };
    });
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();

    const result = reviews.filter((review) => {
      const reviewer = getReviewer(review);
      const seller = getSeller(review);
      const book = getBook(review);
      const sentiment = analyzeReview(review);

      const searchableText = [
        reviewer?.fullName,
        reviewer?.email,
        reviewer?.university,
        seller?.fullName,
        seller?.email,
        book?.title,
        book?.author,
        review?.comment,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedKeyword || searchableText.includes(normalizedKeyword);

      const matchesRating =
        ratingFilter === "all" ||
        Number(review.rating) === Number(ratingFilter);

      const matchesSentiment =
        sentimentFilter === "all" || sentiment.key === sentimentFilter;

      return matchesSearch && matchesRating && matchesSentiment;
    });

    return [...result].sort((a, b) => {
      if (sortOption === "oldest") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }

      if (sortOption === "rating-high") {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }

      if (sortOption === "rating-low") {
        return Number(a.rating || 0) - Number(b.rating || 0);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [reviews, searchKeyword, ratingFilter, sentimentFilter, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));

  const paginatedReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredReviews.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredReviews, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleCopyComment = async (review) => {
    const text =
      String(review.comment || "").trim() ||
      "Người dùng không để lại nội dung bình luận.";

    try {
      await navigator.clipboard.writeText(text);
      setCopiedReviewId(review._id);

      window.setTimeout(() => {
        setCopiedReviewId("");
      }, 1500);
    } catch (copyError) {
      console.error("Không thể sao chép bình luận:", copyError);
      alert("Trình duyệt không cho phép sao chép nội dung.");
    }
  };

  const handleExportCsv = () => {
    if (filteredReviews.length === 0) {
      alert("Không có dữ liệu để xuất.");
      return;
    }

    const rows = filteredReviews.map((review) => {
      const reviewer = getReviewer(review);
      const seller = getSeller(review);
      const order = getOrder(review);
      const book = getBook(review);
      const sentiment = analyzeReview(review);

      return {
        "Người đánh giá": reviewer?.fullName || "",
        Email: reviewer?.email || "",
        "Tên sách": book?.title || "",
        "Tác giả": book?.author || "",
        "Người bán": seller?.fullName || "",
        "Số sao": Number(review.rating || 0),
        "Phân loại": sentiment.label,
        "Bình luận": String(review.comment || "").replace(/\r?\n/g, " "),
        "Giá trị đơn": Number(order?.price || book?.price || 0),
        "Ngày đánh giá": formatDate(review.createdAt),
      };
    });

    const headers = Object.keys(rows[0]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = String(row[header] ?? "");
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `danh-sach-danh-gia-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchKeyword("");
    setRatingFilter("all");
    setSentimentFilter("all");
    setSortOption("newest");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-10 py-9 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-amber-400" />

          <p className="mt-5 font-semibold text-white">
            Đang phân tích dữ liệu đánh giá...
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Vui lòng chờ trong giây lát
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fef3c7_0,_#f8fafc_32%,_#eef2ff_100%)] py-8">
        <div className="mx-auto max-w-7xl px-4">
          {/* HERO */}
          <section className="relative mb-6 overflow-hidden rounded-[32px] bg-slate-950 px-6 py-7 text-white shadow-[0_30px_100px_rgba(15,23,42,0.28)] sm:px-8 sm:py-9">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                  <span>✦</span>
                  Trung tâm kiểm duyệt
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Quản lý đánh giá
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Theo dõi trải nghiệm giao dịch, phát hiện phản hồi tiêu cực và
                  kiểm soát chất lượng cộng đồng trên sàn.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  ⇩ Xuất CSV
                </button>

                <button
                  type="button"
                  onClick={loadReviews}
                  className="rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5"
                >
                  ↻ Làm mới dữ liệu
                </button>
              </div>
            </div>
          </section>

          {/* STATS */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="💬"
              label="Tổng đánh giá"
              value={statistics.total}
              subText={`${statistics.withComment} đánh giá có bình luận`}
            />

            <StatCard
              icon="★"
              label="Điểm trung bình"
              value={statistics.averageRating}
              subText="Tính trên toàn bộ giao dịch"
            />

            <StatCard
              icon="🏆"
              label="Đánh giá 5 sao"
              value={statistics.fiveStar}
              subText="Nhóm khách hàng hài lòng nhất"
            />

            <StatCard
              icon="⚠"
              label="Cần chú ý"
              value={statistics.needAttention}
              subText="Phản hồi tiêu cực hoặc từ 1–2 sao"
            />
          </section>

          {/* DISTRIBUTION + FILTER */}
          <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_2.1fr]">
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600">
                    Phân bố chất lượng
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Tỷ lệ số sao
                  </h2>
                </div>

                <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                  {statistics.averageRating} ★
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {distribution.map((item) => (
                  <div
                    key={item.star}
                    className="grid grid-cols-[48px_1fr_48px] items-center gap-3"
                  >
                    <span className="text-sm font-bold text-slate-600">
                      {item.star} ★
                    </span>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>

                    <span className="text-right text-xs font-bold text-slate-400">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
                    Bộ lọc thông minh
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Tìm đúng đánh giá cần xử lý
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="self-start rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Đặt lại bộ lọc
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Tìm kiếm
                  </label>

                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder="User, sách, comment..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Số sao
                  </label>

                  <select
                    value={ratingFilter}
                    onChange={(event) => setRatingFilter(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  >
                    <option value="all">Tất cả số sao</option>
                    <option value="5">5 sao</option>
                    <option value="4">4 sao</option>
                    <option value="3">3 sao</option>
                    <option value="2">2 sao</option>
                    <option value="1">1 sao</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Phân loại
                  </label>

                  <select
                    value={sentimentFilter}
                    onChange={(event) => setSentimentFilter(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  >
                    <option value="all">Tất cả cảm xúc</option>
                    <option value="positive">Tích cực</option>
                    <option value="neutral">Trung lập</option>
                    <option value="negative">Tiêu cực</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Sắp xếp
                  </label>

                  <select
                    value={sortOption}
                    onChange={(event) => setSortOption(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="rating-high">Sao cao nhất</option>
                    <option value="rating-low">Sao thấp nhất</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <p className="font-black text-red-700">{error}</p>

              <button
                type="button"
                onClick={loadReviews}
                className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* RESULT INFO */}
          {!error && (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-500">
                Hiển thị{" "}
                <span className="font-black text-slate-950">
                  {filteredReviews.length}
                </span>{" "}
                đánh giá phù hợp
              </p>

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Trang {currentPage}/{totalPages}
              </p>
            </div>
          )}

          {!error && filteredReviews.length === 0 ? (
            <div className="rounded-[32px] border border-white/80 bg-white/90 py-20 text-center shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="text-6xl">🔎</div>

              <h2 className="mt-4 text-2xl font-black text-slate-900">
                Không tìm thấy đánh giá
              </h2>

              <p className="mt-2 text-slate-500">
                Hãy thay đổi từ khóa hoặc bộ lọc để xem dữ liệu khác.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {paginatedReviews.map((review) => {
                const reviewer = getReviewer(review);
                const seller = getSeller(review);
                const order = getOrder(review);
                const book = getBook(review);
                const sentiment = analyzeReview(review);
                const bookImage = resolveImageUrl(book?.images?.[0]);

                return (
                  <article
                    key={review._id}
                    className={`group relative overflow-hidden rounded-[30px] border bg-white/95 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_100px_rgba(15,23,42,0.12)] ${sentiment.cardClass}`}
                  >
                    <div
                      className={`absolute left-0 top-0 h-full w-1.5 ${sentiment.accentClass}`}
                    />

                    <div className="p-5 sm:p-7">
                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_300px_1fr]">
                        {/* USER */}
                        <div className="xl:border-r xl:border-slate-100 xl:pr-6">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                              Người đánh giá
                            </p>

                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-black ${sentiment.badgeClass}`}
                            >
                              {sentiment.label}
                            </span>
                          </div>

                          <div className="mt-4 flex items-center gap-3">
                            <Avatar user={reviewer} />

                            <div className="min-w-0">
                              <h3 className="truncate font-black text-slate-950">
                                {reviewer?.fullName ||
                                  "Tài khoản không tồn tại"}
                              </h3>

                              <p className="mt-1 truncate text-sm text-slate-500">
                                {reviewer?.email || "Không có email"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                            <p>
                              <span className="font-bold text-slate-950">
                                Trường:
                              </span>{" "}
                              {reviewer?.university || "Chưa cập nhật"}
                            </p>

                            <p>
                              <span className="font-bold text-slate-950">
                                Ngày:
                              </span>{" "}
                              {formatDate(review.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* BOOK */}
                        <div className="xl:border-r xl:border-slate-100 xl:pr-6">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Sản phẩm giao dịch
                          </p>

                          <div className="mt-4 flex gap-4">
                            {bookImage ? (
                              <img
                                src={bookImage}
                                alt={book?.title || "Sách"}
                                className="h-32 w-24 rounded-2xl object-cover shadow-lg ring-1 ring-slate-200 transition duration-300 group-hover:scale-[1.03]"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-32 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-4xl shadow-inner">
                                📕
                              </div>
                            )}

                            <div className="min-w-0">
                              <h3 className="line-clamp-2 font-black leading-6 text-slate-950">
                                {book?.title ||
                                  "Sách đã bị xóa hoặc không tồn tại"}
                              </h3>

                              <p className="mt-2 text-sm text-slate-500">
                                {book?.author || "Chưa cập nhật tác giả"}
                              </p>

                              <p className="mt-3 text-lg font-black text-red-600">
                                {formatMoney(order?.price ?? book?.price)}
                              </p>

                              <p className="mt-2 break-all text-[11px] font-medium text-slate-400">
                                Mã đơn: {order?._id || "Không xác định"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* REVIEW */}
                        <div>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Nội dung đánh giá
                              </p>

                              <div className="mt-2">
                                <StarRating rating={review.rating} />
                              </div>
                            </div>

                            {Number(review.rating) <= 2 && (
                              <span className="self-start rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-black text-white shadow-lg shadow-red-500/20">
                                Cần kiểm tra
                              </span>
                            )}
                          </div>

                          <div className="mt-4 rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 shadow-inner">
                            <p className="min-h-[52px] whitespace-pre-wrap break-words leading-7 text-slate-700">
                              {review.comment?.trim() ||
                                "Người dùng không để lại nội dung bình luận."}
                            </p>
                          </div>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-slate-500">
                              Người bán:{" "}
                              <span className="font-black text-slate-950">
                                {seller?.fullName || "Tài khoản không tồn tại"}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyComment(review)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                              >
                                {copiedReviewId === review._id
                                  ? "✓ Đã sao chép"
                                  : "⧉ Sao chép"}
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedReview(review)}
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-black"
                              >
                                Xem chi tiết →
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* PAGINATION */}
          {!error && filteredReviews.length > PAGE_SIZE && (
            <div className="mt-7 flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row">
              <p className="text-sm font-semibold text-slate-500">
                Mỗi trang hiển thị {PAGE_SIZE} đánh giá
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Trước
                </button>

                <span className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                  {currentPage}/{totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {selectedReview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onClick={() => setSelectedReview(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white shadow-[0_40px_140px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative overflow-hidden bg-slate-950 px-6 py-6 text-white sm:px-8">
              <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                    Hồ sơ đánh giá
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Chi tiết phản hồi giao dịch
                  </h2>

                  <p className="mt-2 break-all text-xs text-slate-400">
                    ID: {selectedReview._id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl transition hover:bg-white/20"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Người đánh giá
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <Avatar
                      user={getReviewer(selectedReview)}
                      size="w-12 h-12"
                    />

                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-950">
                        {getReviewer(selectedReview)?.fullName ||
                          "Không xác định"}
                      </p>

                      <p className="truncate text-sm text-slate-500">
                        {getReviewer(selectedReview)?.email || "Không có email"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Người bán
                  </p>

                  <p className="mt-4 font-black text-slate-950">
                    {getSeller(selectedReview)?.fullName || "Không xác định"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {getSeller(selectedReview)?.email || "Không có email"}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                      Chất lượng giao dịch
                    </p>

                    <div className="mt-2">
                      <StarRating
                        rating={selectedReview.rating}
                        size="text-3xl"
                      />
                    </div>
                  </div>

                  <span
                    className={`self-start rounded-full border px-4 py-2 text-sm font-black ${
                      analyzeReview(selectedReview).badgeClass
                    }`}
                  >
                    {analyzeReview(selectedReview).label}
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Nội dung bình luận
                </p>

                <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6 shadow-inner">
                  <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-800">
                    {selectedReview.comment?.trim() ||
                      "Người dùng không để lại nội dung bình luận."}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Sách được đánh giá
                </p>

                <p className="mt-3 text-lg font-black text-slate-950">
                  {getBook(selectedReview)?.title || "Sách không còn tồn tại"}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-500 sm:grid-cols-2">
                  <p>
                    Tác giả:{" "}
                    <span className="font-bold text-slate-800">
                      {getBook(selectedReview)?.author || "Chưa cập nhật"}
                    </span>
                  </p>

                  <p>
                    Giá trị đơn:{" "}
                    <span className="font-bold text-red-600">
                      {formatMoney(
                        getOrder(selectedReview)?.totalPrice ??
                          getBook(selectedReview)?.price,
                      )}
                    </span>
                  </p>

                  <p>
                    Ngày đăng:{" "}
                    <span className="font-bold text-slate-800">
                      {formatDate(selectedReview.createdAt)}
                    </span>
                  </p>

                  <p className="break-all">
                    Mã đơn:{" "}
                    <span className="font-bold text-slate-800">
                      {getOrder(selectedReview)?._id || "Không xác định"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white/95 px-6 py-5 backdrop-blur sm:flex-row sm:justify-end sm:px-8">
              <button
                type="button"
                onClick={() => handleCopyComment(selectedReview)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                ⧉ Sao chép bình luận
              </button>

              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-black"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManageReviews;
