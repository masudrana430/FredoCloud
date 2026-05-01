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