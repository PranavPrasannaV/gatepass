import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { OrgProvider } from "@/providers/OrgProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopNavBar } from "@/components/TopNavBar";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gatepass — Precision AppSec",
  description: "Precision application security for the AI-native stack",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body className="bg-page">
        <OrgProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col">
              <TopNavBar />
              <main className="flex-1 overflow-auto bg-page">
                <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
              </main>
            </div>
          </div>
        </OrgProvider>
      </body>
    </html>
  );
}
