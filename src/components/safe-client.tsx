"use client";

import { useState } from "react";
import { Copy, Search } from "lucide-react";
import { formatBytes } from "@/lib/format";
import type { FileDto, ScriptDto } from "@/components/dashboard-client";

export function SafeClient() {
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<FileDto[]>([]);
  const [scripts, setScripts] = useState<ScriptDto[]>([]);
  const [message, setMessage] = useState("");

  async function search() {
    setMessage("");
    const response = await fetch(`/api/catalog?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      setMessage("Không search được. Vui lòng thử lại sau.");
      return;
    }

    const data = (await response.json()) as { files: FileDto[]; scripts: ScriptDto[] };
    setFiles(data.files);
    setScripts(data.scripts);

    if (data.files.length === 0 && data.scripts.length === 0) {
      setMessage("Không tìm thấy kết quả phù hợp.");
    }
  }

  async function copyScript(script: ScriptDto) {
    await navigator.clipboard.writeText(script.body);
    setMessage(`Đã copy: ${script.title}`);
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-950">
      <section className="mx-auto grid max-w-5xl gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h1 className="text-lg font-semibold">ROM File Lookup</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Tìm ROM, tool, driver hoặc kịch bản hỗ trợ. Link tải riêng sẽ được gửi theo từng ca.
            </p>
          </div>
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
          <section className="grid h-fit gap-3">
            <h2 className="font-semibold">Files</h2>
            {files.map((file) => (
              <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" key={file.id}>
                <h3 className="truncate font-medium">{file.filename}</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {file.brand ?? "Unknown"} {file.model ?? ""} · {file.fileType} ·{" "}
                  {formatBytes(file.sizeBytes)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {file.region ?? "no-region"} · {file.androidVersion ?? "no-android"} ·{" "}
                  {file.status}
                </p>
              </article>
            ))}
          </section>
          <section className="grid h-fit gap-3">
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
