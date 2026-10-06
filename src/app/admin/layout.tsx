import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administrace | A M A R É E",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-ivory text-ink">{children}</div>;
}
