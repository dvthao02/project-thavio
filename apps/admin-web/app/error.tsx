'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg">
        <p className="text-sm font-semibold text-destructive">Lỗi hệ thống</p>
        <h1 className="text-2xl font-bold text-foreground mt-2">Không thể tải màn hình</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {error.message || 'Đã xảy ra lỗi khi render trang admin.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Tải lại
        </button>
      </div>
    </div>
  );
}
