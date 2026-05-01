"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

export default function SocketTestPage() {
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      setStatus(`Connected: ${socket.id}`);
    });

    socket.on("disconnect", () => {
      setStatus("Disconnected");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Socket Test</h1>
      <p className="mt-4">{status}</p>
    </main>
  );
}