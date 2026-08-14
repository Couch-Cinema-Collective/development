import "./globals.css";

export const metadata = {
  title: "Couch Cinema Collective",
  description:
    "A film society with an awards night. Nominate, watch, vote — season one is coming.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
