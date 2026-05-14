import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="text-2xl font-bold text-foreground mt-2">Không tìm thấy trang</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Đường dẫn này chưa có trong admin hoặc bạn không có quyền truy cập.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex mt-5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Về Dashboard
        </Link>
      </div>
    </div>
  );
}
