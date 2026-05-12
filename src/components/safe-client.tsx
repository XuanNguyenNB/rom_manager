"use client";

import { useState } from "react";
import { Copy, KeyRound, Link2, Search, ShieldCheck } from "lucide-react";
import { formatBytes } from "@/lib/format";
import type { FileDto, ScriptDto } from "@/components/dashboard-client";

export function SafeClient() {
  const [code, setCode] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<FileDto[]>([]);
  const [scripts, setScripts] = useState<ScriptDto[]>([]);
  const [message, setMessage] = useState("");

  async function login() {
    const response = await fetch("/api/safe/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      setMessage("Mã không đúng hoặc đã hết hạn.");
      return;
    }

    setLoggedIn(true);
    setMessage("Đã vào Safe Mode.");
  }

  async function search() {
    const response = await fetch(`/api/catalog?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      setMessage("Không search được. Hãy nhập lại mã Safe Mode.");
      setLoggedIn(false);
      return;
    }

    const data = (await response.json()) as { files: FileDto[]; scripts: ScriptDto[] };
    setFiles(data.files);
    setScripts(data.scripts);
  }

  async function createLink(fileId: string) {
    const response = await fetch("/api/download-links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileIds: [fileId] }),
    });

    if (!response.ok) {
      setMessage("Không tạo được link.");
      return;
    }

    const data = (await response.json()) as { url: string };
    await navigator.clipboard.writeText(data.url);
    setMessage(`Đã copy link: ${data.url}`);
  }

  async function copyScript(script: ScriptDto) {
    await navigator.clipboard.writeText(script.body);
    setMessage(`Đã copy: ${script.title}`);
  }

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 text-zinc-950">
        <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Safe Mode</h1>
              <p className="text-sm text-zinc-600">Chỉ search, copy kịch bản và tạo link tạm.</p>
            </div>
          </div>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Mã 6 số</span>
            <input
              className="h-12 rounded-md border border-zinc-300 px-3 text-center font-mono text-xl tracking-widest outline-none focus:border-emerald-500"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              value={code}
            />
          </label>
          <button
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
            onClick={login}
            type="button"
          >
            <KeyRound className="h-4 w-4" />
            Vào Safe Mode
          </button>
          {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950">
      <section className="mx-auto grid max-w-5xl gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                className="h-11 w-full rounded-md border border-zinc-300 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    search();
                  }
                }}
                placeholder="Tìm model, ROM, tool, kịch bản..."
                value={query}
              />
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
              onClick={search}
              type="button"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
          {message ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="grid gap-3">
            <h2 className="font-semibold">Files</h2>
            {files.map((file) => (
              <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" key={file.id}>
                <h3 className="truncate font-medium">{file.filename}</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {file.brand ?? "Unknown"} {file.model ?? ""} · {file.fileType} ·{" "}
                  {formatBytes(file.sizeBytes)}
                </p>
                <button
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800"
                  onClick={() => createLink(file.id)}
                  type="button"
                >
                  <Link2 className="h-4 w-4" />
                  Copy link tải
                </button>
              </article>
            ))}
          </section>
          <section className="grid gap-3">
            <h2 className="font-semibold">Kịch bản</h2>
            {scripts.map((script) => (
              <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" key={script.id}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{script.title}</h3>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm hover:bg-zinc-50"
                    onClick={() => copyScript(script)}
                    type="button"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
                  {script.body}
                </p>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
