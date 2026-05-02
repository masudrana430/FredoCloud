import { create } from "zustand";
import { api } from "@/lib/api";

export const useTeamStore = create(set => ({
  teams: [],
  activeTeam: null,
  loading: false,

  fetchTeams: async () => {
    set({ loading: true });

    try {
      const res = await api.get("/api/teams");

      set({
        teams: res.data.teams,
        loading: false
      });

      return res.data.teams;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  createTeam: async formData => {
    const res = await api.post("/api/teams", formData);

    set(state => ({
      teams: [res.data.team, ...state.teams]
    }));

    return res.data.team;
  },

  updateTeam: async (teamId, formData) => {
    const res = await api.patch(`/api/teams/${teamId}`, formData);

    set(state => ({
      teams: state.teams.map(team =>
        team.id === teamId ? res.data.team : team
      ),
      activeTeam:
        state.activeTeam?.id === teamId ? res.data.team : state.activeTeam
    }));

    return res.data.team;
  },

  inviteMember: async (teamId, formData) => {
    const res = await api.post(`/api/teams/${teamId}/invite`, formData);

    set(state => ({
      activeTeam: state.activeTeam
        ? {
            ...state.activeTeam,
            members: [...state.activeTeam.members, res.data.member]
          }
        : state.activeTeam
    }));

    return res.data.member;
  },

  updateMemberRole: async (teamId, userId, role) => {
    const res = await api.patch(`/api/teams/${teamId}/members/${userId}/role`, {
      role
    });

    set(state => ({
      activeTeam: state.activeTeam
        ? {
            ...state.activeTeam,
            members: state.activeTeam.members.map(member =>
              member.userId === userId ? res.data.member : member
            )
          }
        : state.activeTeam
    }));

    return res.data.member;
  },

  removeMember: async (teamId, userId) => {
    await api.delete(`/api/teams/${teamId}/members/${userId}`);

    set(state => ({
      activeTeam: state.activeTeam
        ? {
            ...state.activeTeam,
            members: state.activeTeam.members.filter(
              member => member.userId !== userId
            )
          }
        : state.activeTeam
    }));
  },

  fetchTeamById: async teamId => {
    set({ loading: true });

    try {
      const res = await api.get(`/api/teams/${teamId}`);

      set({
        activeTeam: res.data.team,
        loading: false
      });

      return res.data.team;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  clearActiveTeam: () => {
    set({ activeTeam: null });
  }
}));