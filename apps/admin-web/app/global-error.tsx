'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-lg">
            <p className="text-sm font-semibold text-red-600">Lỗi hệ thống</p>
            <h1 className="text-2xl font-bold text-slate-950 mt-2">Admin gặp lỗi khi khởi tạo</h1>
            <p className="text-sm text-slate-600 mt-2">
              {error.message || 'Vui lòng thử tải lại trang.'}
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Tải lại
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
