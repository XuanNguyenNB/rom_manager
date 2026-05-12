"use client";

import { signIn } from "next-auth/react";
import { KeyRound } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 text-zinc-950">
      <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-600 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">ROM Manager</h1>
            <p className="text-sm text-zinc-600">Đăng nhập tài khoản Google quản trị.</p>
          </div>
        </div>
        <button
          className="flex h-11 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          type="button"
        >
          Đăng nhập bằng Google
        </button>
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Email phải nằm trong biến môi trường ADMIN_EMAILS trên VPS.
        </p>
      </section>
    </main>
  );
}
