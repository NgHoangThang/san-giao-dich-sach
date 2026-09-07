import { useCallback, useEffect, useRef, useState } from "react";

import api from "../services/api";

// ======================================================
// HOOK DÙNG CHUNG CHO CÁC TRANG DUYỆT SÁCH
// ------------------------------------------------------
// ĐÃ THÊM: trước đây mỗi trang (Trang chủ, Tất cả sách, Sách giá tốt,
// Sách mới đăng, Giáo trình nổi bật) tự gọi GET /api/books KHÔNG kèm
// tham số nào, rồi tự lọc/sắp xếp bằng JS trên đúng 10 cuốn mặc định
// backend trả về -> sách cũ hơn 10 cuốn mới nhất không bao giờ hiện
// ra được dù chọn lọc/sắp xếp gì. Hook này chuyển lọc/sắp xếp/phân
// trang sang xử lý thật ở server (đúng theo tham số getAllBooks đã
// hỗ trợ), dùng chung cho mọi trang thay vì lặp lại 5 lần.
// ======================================================

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  condition: "",
  sort: "newest",
  minPrice: undefined,
  maxPrice: undefined,
  recency: "",
};

export const useBookCatalog = ({
  initialFilters = {},
  pageSize = 10,
  debounceMs = 350,
} = {}) => {
  // Cố định giá trị filter ban đầu ngay từ lần render đầu tiên — dùng
  // để reset đúng về mặc định riêng của từng trang (VD Sách giá tốt
  // reset về sort "price-low" chứ không phải "newest").
  const initialFiltersRef = useRef({ ...DEFAULT_FILTERS, ...initialFilters });
  const initial = initialFiltersRef.current;

  const [search, setSearch] = useState(initial.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.search);
  const [category, setCategory] = useState(initial.category);
  const [condition, setCondition] = useState(initial.condition);
  const [sort, setSort] = useState(initial.sort);
  const [minPrice, setMinPrice] = useState(initial.minPrice);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice);
  const [recency, setRecency] = useState(initial.recency);

  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // Đánh số thứ tự request — bỏ qua response đến muộn không còn khớp
  // filter hiện tại (giờ là fetch mạng thật, không còn lọc tức thời
  // trong bộ nhớ như trước).
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [search, debounceMs]);

  const buildParams = useCallback(
    (pageToFetch) => {
      const params = {
        page: pageToFetch,
        limit: pageSize,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (category) params.category = category;
      if (condition) params.condition = condition;
      if (sort) params.sort = sort;
      if (Number.isFinite(minPrice)) params.minPrice = minPrice;
      if (Number.isFinite(maxPrice)) params.maxPrice = maxPrice;
      if (recency) params.recency = recency;

      return params;
    },
    [debouncedSearch, category, condition, sort, minPrice, maxPrice, recency, pageSize],
  );

  const fetchPage = useCallback(
    async (pageToFetch, { replace }) => {
      const seq = requestSeqRef.current + 1;

      requestSeqRef.current = seq;

      if (replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError("");

      try {
        const response = await api.get("/api/books", {
          params: buildParams(pageToFetch),
        });

        if (seq !== requestSeqRef.current) {
          return;
        }

        const nextBooks = Array.isArray(response.data?.books)
          ? response.data.books
          : [];

        const pagination = response.data?.pagination || {};

        setBooks((previous) =>
          replace ? nextBooks : [...previous, ...nextBooks],
        );

        setTotalCount(pagination.totalCount || 0);
        setTotalPages(pagination.totalPages || 1);
        setPage(pageToFetch);
      } catch (requestError) {
        if (seq !== requestSeqRef.current) {
          return;
        }

        console.error("Lỗi tải danh sách sách:", requestError);

        setError(
          requestError.response?.data?.message ||
            "Không thể tải danh sách sách.",
        );

        if (replace) {
          setBooks([]);
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [buildParams],
  );

  // Đổi bất kỳ filter nào -> quay về trang 1, thay hẳn danh sách
  useEffect(() => {
    fetchPage(1, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, condition, sort, minPrice, maxPrice, recency]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || page >= totalPages) {
      return;
    }

    fetchPage(page + 1, { replace: false });
  }, [loading, loadingMore, page, totalPages, fetchPage]);

  const setPriceRange = useCallback((min, max) => {
    setMinPrice(min);
    setMaxPrice(max);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch(initial.search);
    setCategory(initial.category);
    setCondition(initial.condition);
    setSort(initial.sort);
    setMinPrice(initial.minPrice);
    setMaxPrice(initial.maxPrice);
    setRecency(initial.recency);
  }, [initial]);

  const reload = useCallback(() => {
    fetchPage(page, { replace: true });
  }, [fetchPage, page]);

  return {
    books,
    loading,
    loadingMore,
    error,
    totalCount,
    hasMore: page < totalPages,

    filters: { search, category, condition, sort, minPrice, maxPrice, recency },

    setSearch,
    setCategory,
    setCondition,
    setSort,
    setPriceRange,
    setRecency,
    resetFilters,
    loadMore,
    reload,
  };
};
