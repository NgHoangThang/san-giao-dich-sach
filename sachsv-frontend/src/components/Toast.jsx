import React, { useEffect } from "react";

// ======================================================
// TOAST — thông báo nhỏ tự biến mất, thay cho alert() gây
// chặn thao tác (phải bấm OK mới làm tiếp được). Chỉ dùng
// cho luồng Giỏ hàng theo yêu cầu, chưa đổi alert() ở nơi
// khác trong web.
// ======================================================
const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = setTimeout(onClose, 2200);

    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  const isError = type === "error";

  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] max-w-xs rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg ${
        isError ? "bg-red-600" : "bg-gray-900"
      }`}
    >
      {message}
    </div>
  );
};

export default Toast;
