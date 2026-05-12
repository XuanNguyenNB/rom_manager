"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { KeyRound, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loginWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/admin",
    });

    setBusy(false);

    if (result?.ok) {
      window.location.href = result.url ?? "/admin";
      return;
    }

    setMessage("Email hoặc mật khẩu admin không đúng.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 text-zinc-950">
      <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-600 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Admin Login</h1>
            <p className="text-sm text-zinc-600">Chỉ dành cho quản trị kho ROM.</p>
          </div>
        </div>

        <form className="grid gap-3" onSubmit={loginWithPassword}>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">Email</span>
            <input
              autoComplete="email"
              className="h-10 rounded-md border border-zinc-300 px-3 outline-none focus:border-blue-500"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700">Mật khẩu admin</span>
            <input
              autoComplete="current-password"
              className="h-10 rounded-md border border-zinc-300 px-3 outline-none focus:border-blue-500"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            <LogIn className="h-4 w-4" />
            Đăng nhập admin
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
          <div className="h-px flex-1 bg-zinc-200" />
          hoặc
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <button
          className="flex h-11 w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          onClick={() => signIn("google", { callbackUrl: "/admin" })}
          type="button"
        >
          Đăng nhập bằng Google
        </button>

        {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}

        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Khách không cần đăng nhập. Trang khách nằm tại{" "}
          <Link className="font-medium text-blue-700" href="/">
            files.choimaytau.com
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
