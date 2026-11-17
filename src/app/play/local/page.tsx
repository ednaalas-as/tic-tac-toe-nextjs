import type { Metadata } from "next";
import { LocalMode } from "@/features/local/LocalMode";

export const metadata: Metadata = { title: "Local multiplayer" };

export default function LocalPage() {
  return <LocalMode />;
}
