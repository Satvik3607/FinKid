import './globals.css';

export const metadata = {
  title: 'FinKid — Learn Money Skills!',
  description:
    'FinKid is a fun, friendly chatbot that teaches kids and teens about saving, investing, and managing money.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-800 antialiased">
        {children}
      </body>
    </html>
  );
}
