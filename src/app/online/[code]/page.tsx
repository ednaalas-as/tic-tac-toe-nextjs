import type { Metadata } from "next";
import { Suspense, use } from "react";
import { OnlineRoom } from "@/features/online/OnlineRoom";
import { RoomMessage } from "@/features/online/RoomMessage";

export const metadata: Metadata = { title: "Online room" };

/** Reads the async route params inside Suspense (required with Cache Components). */
function RoomFromParams({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <OnlineRoom code={code} />;
}

export default function OnlineRoomPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<RoomMessage reason="loading" />}>
      <RoomFromParams params={params} />
    </Suspense>
  );
}
