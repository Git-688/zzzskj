import './globals.css';
export const metadata = { title: '站长专属空间' };

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}