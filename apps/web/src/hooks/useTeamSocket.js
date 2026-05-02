"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

export function useTeamSocket(teamId, onTeamUpdate, user, onNotification) {
  const [onlineMembers, setOnlineMembers] = useState([]);

  useEffect(() => {
    if (!teamId || !user?.id) return;

    const socket = getSocket();

    socket.emit("team:join", {
      teamId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl
      }
    });

    socket.on("team:presence", setOnlineMembers);

    socket.on("notification:created", notification => {
      if (onNotification) {
        onNotification(notification);
      }
    });

    socket.on("goal:created", onTeamUpdate);
    socket.on("goal:updated", onTeamUpdate);
    socket.on("goal:deleted", onTeamUpdate);

    socket.on("milestone:created", onTeamUpdate);
    socket.on("milestone:updated", onTeamUpdate);
    socket.on("milestone:deleted", onTeamUpdate);
    socket.on("goal-update:created", onTeamUpdate);

    socket.on("announcement:created", onTeamUpdate);
    socket.on("announcement:updated", onTeamUpdate);
    socket.on("announcement:deleted", onTeamUpdate);
    socket.on("announcement-comment:created", onTeamUpdate);
    socket.on("announcement-comment:deleted", onTeamUpdate);
    socket.on("announcement-reaction:updated", onTeamUpdate);

    socket.on("action-item:created", onTeamUpdate);
    socket.on("action-item:updated", onTeamUpdate);
    socket.on("action-item:deleted", onTeamUpdate);

    return () => {
      socket.emit("team:leave", teamId);

      socket.off("team:presence", setOnlineMembers);
      socket.off("notification:created");

      socket.off("goal:created", onTeamUpdate);
      socket.off("goal:updated", onTeamUpdate);
      socket.off("goal:deleted", onTeamUpdate);

      socket.off("milestone:created", onTeamUpdate);
      socket.off("milestone:updated", onTeamUpdate);
      socket.off("milestone:deleted", onTeamUpdate);
      socket.off("goal-update:created", onTeamUpdate);

      socket.off("announcement:created", onTeamUpdate);
      socket.off("announcement:updated", onTeamUpdate);
      socket.off("announcement:deleted", onTeamUpdate);
      socket.off("announcement-comment:created", onTeamUpdate);
      socket.off("announcement-comment:deleted", onTeamUpdate);
      socket.off("announcement-reaction:updated", onTeamUpdate);

      socket.off("action-item:created", onTeamUpdate);
      socket.off("action-item:updated", onTeamUpdate);
      socket.off("action-item:deleted", onTeamUpdate);
    };
  }, [teamId, user, onTeamUpdate, onNotification]);

  return {
    onlineMembers
  };
}