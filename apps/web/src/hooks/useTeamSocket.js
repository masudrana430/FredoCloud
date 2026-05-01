"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

export function useTeamSocket(teamId, onTeamUpdate) {
  useEffect(() => {
    if (!teamId) return;

    const socket = getSocket();

    socket.emit("team:join", teamId);

    socket.on("goal:created", onTeamUpdate);
    socket.on("goal:updated", onTeamUpdate);
    socket.on("goal:deleted", onTeamUpdate);

    socket.on("announcement:created", onTeamUpdate);
    socket.on("announcement:updated", onTeamUpdate);
    socket.on("announcement:deleted", onTeamUpdate);

    socket.on("action-item:created", onTeamUpdate);
    socket.on("action-item:updated", onTeamUpdate);
    socket.on("action-item:deleted", onTeamUpdate);

    return () => {
      socket.emit("team:leave", teamId);

      socket.off("goal:created", onTeamUpdate);
      socket.off("goal:updated", onTeamUpdate);
      socket.off("goal:deleted", onTeamUpdate);

      socket.off("announcement:created", onTeamUpdate);
      socket.off("announcement:updated", onTeamUpdate);
      socket.off("announcement:deleted", onTeamUpdate);

      socket.off("action-item:created", onTeamUpdate);
      socket.off("action-item:updated", onTeamUpdate);
      socket.off("action-item:deleted", onTeamUpdate);
    };
  }, [teamId, onTeamUpdate]);
}