import type { Metadata } from "next";
import { SessionHistory } from "@/components/history/SessionHistory";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return <SessionHistory />;
}
