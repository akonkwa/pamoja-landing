import "./globals.css";

export const metadata = {
  title: "PAMOJA",
  description: "Agentic LinkedIn network intelligence MVP",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
