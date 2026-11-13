import type { Metadata } from "next";
import "./globals.css";
import StyledComponentsRegistry from "@/lib/StyledRegistry";

export const metadata: Metadata = {
  title: "Mrayap | Robot Inspection Dashboard",
  description: "Advanced ROS Robot Hazardous Inspection Interface",
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
