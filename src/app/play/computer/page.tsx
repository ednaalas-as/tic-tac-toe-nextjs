import type { Metadata } from "next";
import { ComputerMode } from "@/features/computer/ComputerMode";

export const metadata: Metadata = { title: "Player vs Computer" };

export default function ComputerPage() {
  return <ComputerMode />;
}
