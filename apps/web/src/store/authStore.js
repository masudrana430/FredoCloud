import { create } from "zustand";
import { api } from "@/lib/api";

export const useAuthStore = create(set => ({
  user: null,
  loading: false,
  initialized: false,

  fetchMe: async () => {
    set({ loading: true });

    try {
      const res = await api.get("/api/auth/me");

      set({
        user: res.data.user,
        loading: false,
        initialized: true
      });

      return res.data.user;
    } catch {
      set({
        user: null,
        loading: false,
        initialized: true
      });

      return null;
    }
  },

  register: async formData => {
    const res = await api.post("/api/auth/register", formData);

    set({
      user: res.data.user
    });

    return res.data.user;
  },

  login: async formData => {
    const res = await api.post("/api/auth/login", formData);

    set({
      user: res.data.user
    });

    return res.data.user;
  },

  logout: async () => {
    await api.post("/api/auth/logout");

    set({
      user: null
    });
  }
}));