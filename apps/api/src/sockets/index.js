import { Server } from "socket.io";

let io;

const teamPresence = new Map();

function getTeamPresence(teamId) {
  const members = teamPresence.get(teamId);

  if (!members) {
    return [];
  }

  return Array.from(members.values()).map(member => ({
    id: member.id,
    name: member.name,
    email: member.email,
    avatarUrl: member.avatarUrl
  }));
}

function addPresence(teamId, user, socketId) {
  if (!teamPresence.has(teamId)) {
    teamPresence.set(teamId, new Map());
  }

  const members = teamPresence.get(teamId);
  const existingMember = members.get(user.id);

  if (existingMember) {
    existingMember.socketIds.add(socketId);
    members.set(user.id, existingMember);
    return;
  }

  members.set(user.id, {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    socketIds: new Set([socketId])
  });
}

function removePresence(teamId, userId, socketId) {
  const members = teamPresence.get(teamId);

  if (!members) return;

  const existingMember = members.get(userId);

  if (!existingMember) return;

  existingMember.socketIds.delete(socketId);

  if (existingMember.socketIds.size === 0) {
    members.delete(userId);
  } else {
    members.set(userId, existingMember);
  }

  if (members.size === 0) {
    teamPresence.delete(teamId);
  }
}

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true
    }
  });

  io.on("connection", socket => {
    console.log("Socket connected:", socket.id);

    socket.data.joinedTeams = new Map();

    socket.on("team:join", payload => {
      const teamId =
        typeof payload === "string" ? payload : payload?.teamId;

      const user = typeof payload === "string" ? null : payload?.user;

      if (!teamId) return;

      socket.join(`team:${teamId}`);

      if (user?.id) {
        socket.join(`user:${user.id}`);

        socket.data.joinedTeams.set(teamId, user);

        addPresence(teamId, user, socket.id);

        io.to(`team:${teamId}`).emit(
          "team:presence",
          getTeamPresence(teamId)
        );
      }

      console.log(`Socket ${socket.id} joined team:${teamId}`);
    });

    socket.on("team:leave", teamId => {
      socket.leave(`team:${teamId}`);

      const user = socket.data.joinedTeams.get(teamId);

      if (user?.id) {
        removePresence(teamId, user.id, socket.id);
        socket.data.joinedTeams.delete(teamId);

        io.to(`team:${teamId}`).emit(
          "team:presence",
          getTeamPresence(teamId)
        );
      }

      console.log(`Socket ${socket.id} left team:${teamId}`);
    });

    socket.on("disconnect", () => {
      for (const [teamId, user] of socket.data.joinedTeams.entries()) {
        removePresence(teamId, user.id, socket.id);

        io.to(`team:${teamId}`).emit(
          "team:presence",
          getTeamPresence(teamId)
        );
      }

      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }

  return io;
}