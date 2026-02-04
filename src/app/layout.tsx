import type { Metadata } from "next";
import "./globals.css";
import StyledComponentsRegistry from "@/lib/StyledRegistry";

export const metadata: Metadata = {
  title: "Bomba OS | Robot Dashboard",
  description: "Advanced ROS Robot Control Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
