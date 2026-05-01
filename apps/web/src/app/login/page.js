"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form);
      router.push("/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-2 text-sm text-gray-600">
          Continue to your team workspace.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-4">
          <Input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />

          <Input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <Button type="submit" disabled={loading} className="mt-6 w-full">
          {loading ? "Logging in..." : "Login"}
        </Button>

        <p className="mt-4 text-center text-sm text-gray-600">
          No account?{" "}
          <Link href="/register" className="font-medium text-black">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}