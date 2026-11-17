import type { Metadata } from "next";
import { OnlineLobby } from "@/features/online/OnlineLobby";

export const metadata: Metadata = { title: "Online multiplayer" };

export default function OnlinePage() {
  return <OnlineLobby />;
}
