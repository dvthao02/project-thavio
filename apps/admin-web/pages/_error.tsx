import type { NextPageContext } from 'next';

interface Props {
  statusCode: number;
}

function ErrorPage({ statusCode }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 'bold', margin: '0' }}>{statusCode}</h1>
      <p style={{ color: '#666', marginTop: '1rem' }}>
        {statusCode === 404 ? 'Trang không tồn tại' : 'Đã có lỗi xảy ra'}
      </p>
      <a href="/dashboard" style={{ marginTop: '2rem', color: '#2563eb', textDecoration: 'underline' }}>
        Về trang chủ
      </a>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};

export default ErrorPage;
