"use client";

import { io } from "socket.io-client";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      withCredentials: true
    });
  }

  return socket;
}