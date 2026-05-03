import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ThemeToggle from "@/components/theme/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export const metadata = {
  metadataBase: new URL("https://web-production-ef8eb.up.railway.app"),
  title: {
    default: "Collaborative Team Hub",
    template: "%s | Collaborative Team Hub"
  },
  description:
    "A real-time collaborative workspace platform for teams to manage goals, milestones, announcements, action items, analytics, and audit logs.",
  applicationName: "Collaborative Team Hub",
  keywords: [
    "Collaborative Team Hub",
    "FredoCloud",
    "team workspace",
    "goals",
    "announcements",
    "action items",
    "Socket.io",
    "Next.js"
  ],
  authors: [
    {
      name: "Masud Rana"
    }
  ],
  creator: "Masud Rana",
  publisher: "Masud Rana",
  icons: {
    icon: "/fredocloud_logo.jpg",
    shortcut: "/fredocloud_logo.jpg",
    apple: "/fredocloud_logo.jpg",
  },
  openGraph: {
    title: "Collaborative Team Hub",
    description:
      "Manage team goals, milestones, announcements, action items, analytics, and audit logs in one real-time workspace.",
    url: "https://web-production-ef8eb.up.railway.app",
    siteName: "Collaborative Team Hub",
    images: [
      {
        url: "/fredocloud_logo.jpg",
        width: 1200,
        height: 630,
        alt: "Collaborative Team Hub"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Collaborative Team Hub",
    description:
      "A real-time collaborative workspace platform for goals, announcements, action items, analytics, and audit logs.",
    images: ["/fredocloud_logo.jpg"]
  }
};


export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
