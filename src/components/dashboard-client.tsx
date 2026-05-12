"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Copy,
  Download,
  FileSearch,
  FolderSync,
  KeyRound,
  Link2,
  Lock,
  Save,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { formatBytes, formatDate } from "@/lib/format";

export type DeviceDto = {
  id: string;
  brand: string;
  model: string;
  aliases: string[];
  chipset: string | null;
};

export type FileDto = {
  id: string;
  alistPath: string;
  filename: string;
  sizeBytes: string | null;
  modifiedAt: string | null;
  brand: string | null;
  model: string | null;
  region: string | null;
  androidVersion: string | null;
  buildNumber: string | null;
  fileType: string;
  status: string;
  tags: string[];
  note: string | null;
  checksum: string | null;
  updatedAt: string;
};

export type ScriptDto = {
  id: string;
  title: string;
  language: "VI" | "EN";
  brand: string | null;
  model: string | null;
  stage: string;
  body: string;
  variables: string[];
  tags: string[];
};

export type LinkDto = {
  id: string;
  kind: string;
  expiresAt: string;
  revokedAt: string | null;
  downloadCount: number;
  createdAt: string;
  files: Array<{ file: FileDto }>;
};

type DashboardProps = {
  actorEmail?: string;
  dbReady: boolean;
  initialDevices: DeviceDto[];
  initialFiles: FileDto[];
  initialScripts: ScriptDto[];
  initialLinks: LinkDto[];
};

const tabs = [
  { id: "files", label: "Files", icon: FileSearch },
  { id: "scripts", label: "Kịch bản", icon: Copy },
  { id: "links", label: "Link", icon: Link2 },
  { id: "safe", label: "Safe", icon: ShieldCheck },
] as const;

const fileTypes = ["ROM", "TOOL", "DRIVER", "PATCH", "GUIDE", "BUNDLE", "OTHER"];
const statuses = ["UNCLASSIFIED", "TESTED", "UNTESTED", "BAD", "ARCHIVED", "MISSING"];
const stages = ["QUOTE", "WARNING", "BACKUP", "DOWNLOADING", "ERROR", "DONE", "SUPPORT", "OTHER"];

export function DashboardClient({
  actorEmail,
  dbReady,
  initialDevices,
  initialFiles,
  initialScripts,
  initialLinks,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("files");
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<FileDto[]>(initialFiles);
  const [scripts, setScripts] = useState<ScriptDto[]>(initialScripts);
  const [links, setLinks] = useState<LinkDto[]>(initialLinks);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileDto | null>(initialFiles[0] ?? null);
  const [message, setMessage] = useState("");
  const [safeCode, setSafeCode] = useState("");
  const [newScript, setNewScript] = useState({
    title: "",
    language: "VI" as "VI" | "EN",
    stage: "OTHER",
    body: "",
    tags: "",
  });
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const brands = useMemo(
    () => Array.from(new Set(initialDevices.map((device) => device.brand))).sort(),
    [initialDevices],
  );

  const stats = useMemo(() => {
    const totalBytes = files.reduce((total, file) => total + Number(file.sizeBytes ?? 0), 0);
    return {
      files: files.length,
      scripts: scripts.length,
      selected: selectedIds.length,
      totalSize: formatBytes(totalBytes),
    };
  }, [files, scripts, selectedIds]);

  function setSelected(id: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id),
    );
  }

  async function runSearch() {
    setMessage("");
    const response = await fetch(`/api/catalog?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      setMessage("Không search được. Kiểm tra đăng nhập hoặc database.");
      return;
    }

    const data = (await response.json()) as { files: FileDto[]; scripts: ScriptDto[] };
    setFiles(data.files);
    setScripts(data.scripts);
    setSelectedIds([]);
    setSelectedFile(data.files[0] ?? null);
  }

  async function createLink(fileIds = selectedIds) {
    if (fileIds.length === 0) {
      setMessage("Chọn ít nhất một file trước khi tạo link.");
      return;
    }

    const response = await fetch("/api/download-links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileIds }),
    });

    if (!response.ok) {
      setMessage("Tạo link thất bại. Kiểm tra database và quyền truy cập.");
      return;
    }

    const data = (await response.json()) as { url: string; expiresAt: string };
    await navigator.clipboard.writeText(data.url);
    setMessage(`Đã copy link 7 ngày: ${data.url}`);
  }

  async function rescanAList() {
    setMessage("Đang quét AList...");
    const response = await fetch("/api/alist/rescan", { method: "POST" });
    if (!response.ok) {
      setMessage("Quét AList thất bại. Kiểm tra ALIST_* env và token.");
      return;
    }

    const data = (await response.json()) as { scanned: number; missing: number };
    setMessage(`Đã quét ${data.scanned} file, đánh dấu missing ${data.missing} file.`);
    await runSearch();
  }

  async function saveFile() {
    if (!selectedFile) {
      return;
    }

    const response = await fetch(`/api/files/${selectedFile.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(selectedFile),
    });

    if (!response.ok) {
      setMessage("Lưu metadata thất bại.");
      return;
    }

    const data = (await response.json()) as { file: FileDto };
    setFiles((current) => current.map((file) => (file.id === data.file.id ? data.file : file)));
    setSelectedFile(data.file);
    setMessage("Đã lưu metadata file.");
  }

  async function createScript() {
    const response = await fetch("/api/scripts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(newScript),
    });

    if (!response.ok) {
      setMessage("Tạo kịch bản thất bại.");
      return;
    }

    const data = (await response.json()) as { script: ScriptDto };
    setScripts((current) => [data.script, ...current]);
    setNewScript({ title: "", language: "VI", stage: "OTHER", body: "", tags: "" });
    setMessage("Đã thêm kịch bản.");
  }

  async function createSafeCode() {
    const response = await fetch("/api/safe-sessions", { method: "POST" });
    if (!response.ok) {
      setMessage("Không tạo được Safe Mode code.");
      return;
    }

    const data = (await response.json()) as { code: string; expiresAt: string };
    setSafeCode(data.code);
    setMessage(`Safe Mode code hết hạn lúc ${formatDate(data.expiresAt)}.`);
  }

  async function revokeLink(id: string) {
    const response = await fetch(`/api/download-links/${id}/revoke`, { method: "POST" });
    if (!response.ok) {
      setMessage("Thu hồi link thất bại.");
      return;
    }

    setLinks((current) =>
      current.map((link) => (link.id === id ? { ...link, revokedAt: new Date().toISOString() } : link)),
    );
    setMessage("Đã thu hồi link.");
  }

  function renderScript(script: ScriptDto) {
    return script.body.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => variables[key] || `{${key}}`);
  }

  async function copyScript(script: ScriptDto) {
    await navigator.clipboard.writeText(renderScript(script));
    setMessage(`Đã copy: ${script.title}`);
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-600 text-white">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">ROM Manager</h1>
              <p className="text-sm text-zinc-600">files.choimaytau.com · {actorEmail ?? "admin"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm hover:bg-zinc-50"
              href="/"
              target="_blank"
            >
              <Lock className="h-4 w-4" />
              Safe Mode
            </a>
            <button
              className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm hover:bg-zinc-50"
              onClick={() => signOut({ callbackUrl: "/login" })}
              type="button"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4">
        {!dbReady ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Database chưa kết nối. UI đang hiển thị dữ liệu mẫu; hãy cấu hình DATABASE_URL rồi chạy migration/seed.
          </div>
        ) : null}

        {message ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
            {message}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Files" value={stats.files} />
          <Metric label="Kịch bản" value={stats.scripts} />
          <Metric label="Đã chọn" value={stats.selected} />
          <Metric label="Dung lượng kết quả" value={stats.totalSize} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                className="h-11 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    startTransition(runSearch);
                  }
                }}
                placeholder="Search model, region, build, tag, script..."
                value={query}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {brands.slice(0, 6).map((brand) => (
                <button
                  className="h-9 rounded-md border border-zinc-300 px-3 text-sm hover:bg-zinc-50"
                  key={brand}
                  onClick={() => {
                    setQuery(brand);
                    startTransition(runSearch);
                  }}
                  type="button"
                >
                  {brand}
                </button>
              ))}
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={isPending}
                onClick={() => startTransition(runSearch)}
                type="button"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium ${
                  activeTab === tab.id
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "files" ? (
          <FilesPanel
            files={files}
            selectedFile={selectedFile}
            selectedIds={selectedIds}
            setSelected={setSelected}
            setSelectedFile={setSelectedFile}
            setSelectedFileState={setSelectedFile}
            createLink={createLink}
            saveFile={saveFile}
            rescanAList={rescanAList}
          />
        ) : null}

        {activeTab === "scripts" ? (
          <ScriptsPanel
            copyScript={copyScript}
            createScript={createScript}
            newScript={newScript}
            renderScript={renderScript}
            scripts={scripts}
            setNewScript={setNewScript}
            setVariables={setVariables}
            variables={variables}
          />
        ) : null}

        {activeTab === "links" ? (
          <LinksPanel links={links} revokeLink={revokeLink} />
        ) : null}

        {activeTab === "safe" ? (
          <SafePanel createSafeCode={createSafeCode} safeCode={safeCode} />
        ) : null}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FilesPanel({
  files,
  selectedIds,
  selectedFile,
  setSelected,
  setSelectedFile,
  setSelectedFileState,
  createLink,
  saveFile,
  rescanAList,
}: {
  files: FileDto[];
  selectedIds: string[];
  selectedFile: FileDto | null;
  setSelected: (id: string, checked: boolean) => void;
  setSelectedFile: (file: FileDto) => void;
  setSelectedFileState: (file: FileDto | null) => void;
  createLink: (fileIds?: string[]) => void;
  saveFile: () => void;
  rescanAList: () => void;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
            onClick={() => createLink()}
            type="button"
          >
            <Link2 className="h-4 w-4" />
            Tạo link 7 ngày
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm hover:bg-zinc-50"
            onClick={rescanAList}
            type="button"
          >
            <FolderSync className="h-4 w-4" />
            Rescan AList
          </button>
        </div>
        {files.map((file) => (
          <article
            className={`rounded-lg border bg-white p-4 shadow-sm ${
              selectedFile?.id === file.id ? "border-blue-400" : "border-zinc-200"
            }`}
            key={file.id}
          >
            <div className="flex gap-3">
              <input
                aria-label={`Chọn ${file.filename}`}
                checked={selectedIds.includes(file.id)}
                className="mt-1 h-4 w-4"
                onChange={(event) => setSelected(file.id, event.target.checked)}
                type="checkbox"
              />
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => setSelectedFile(file)}
                type="button"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h2 className="truncate text-sm font-semibold">{file.filename}</h2>
                  <span className="w-fit rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                    {file.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-600">
                  {file.brand ?? "Unknown"} {file.model ?? ""} · {file.fileType} ·{" "}
                  {formatBytes(file.sizeBytes)} · {file.region ?? "no-region"}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">{file.alistPath}</p>
              </button>
              <button
                className="h-9 w-9 rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                onClick={() => createLink([file.id])}
                title="Tạo link tải"
                type="button"
              >
                <Download className="mx-auto h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Metadata</h2>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
            onClick={saveFile}
            type="button"
          >
            <Save className="h-4 w-4" />
            Lưu
          </button>
        </div>
        {selectedFile ? (
          <div className="grid gap-3">
            <Readonly label="Filename" value={selectedFile.filename} />
            <Input label="Brand" value={selectedFile.brand ?? ""} onChange={(value) => setSelectedFileState({ ...selectedFile, brand: value })} />
            <Input label="Model" value={selectedFile.model ?? ""} onChange={(value) => setSelectedFileState({ ...selectedFile, model: value })} />
            <Input label="Region" value={selectedFile.region ?? ""} onChange={(value) => setSelectedFileState({ ...selectedFile, region: value })} />
            <Input label="Android" value={selectedFile.androidVersion ?? ""} onChange={(value) => setSelectedFileState({ ...selectedFile, androidVersion: value })} />
            <Input label="Build" value={selectedFile.buildNumber ?? ""} onChange={(value) => setSelectedFileState({ ...selectedFile, buildNumber: value })} />
            <Select label="Type" value={selectedFile.fileType} options={fileTypes} onChange={(value) => setSelectedFileState({ ...selectedFile, fileType: value })} />
            <Select label="Status" value={selectedFile.status} options={statuses} onChange={(value) => setSelectedFileState({ ...selectedFile, status: value })} />
            <Input label="Tags" value={selectedFile.tags.join(", ")} onChange={(value) => setSelectedFileState({ ...selectedFile, tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
            <Textarea label="Note" value={selectedFile.note ?? ""} onChange={(value) => setSelectedFileState({ ...selectedFile, note: value })} />
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Chọn một file để sửa metadata.</p>
        )}
      </aside>
    </section>
  );
}

function ScriptsPanel({
  scripts,
  variables,
  setVariables,
  renderScript,
  copyScript,
  newScript,
  setNewScript,
  createScript,
}: {
  scripts: ScriptDto[];
  variables: Record<string, string>;
  setVariables: (value: Record<string, string>) => void;
  renderScript: (script: ScriptDto) => string;
  copyScript: (script: ScriptDto) => void;
  newScript: { title: string; language: "VI" | "EN"; stage: string; body: string; tags: string };
  setNewScript: (value: { title: string; language: "VI" | "EN"; stage: string; body: string; tags: string }) => void;
  createScript: () => void;
}) {
  const allVariables = Array.from(new Set(scripts.flatMap((script) => script.variables))).slice(0, 10);

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Biến kịch bản</h2>
        <div className="grid gap-3">
          {allVariables.map((name) => (
            <Input
              key={name}
              label={name}
              onChange={(value) => setVariables({ ...variables, [name]: value })}
              value={variables[name] ?? ""}
            />
          ))}
        </div>
        <div className="mt-5 grid gap-3 border-t border-zinc-200 pt-4">
          <h3 className="font-semibold">Thêm kịch bản</h3>
          <Input label="Title" value={newScript.title} onChange={(value) => setNewScript({ ...newScript, title: value })} />
          <Select label="Language" value={newScript.language} options={["VI", "EN"]} onChange={(value) => setNewScript({ ...newScript, language: value as "VI" | "EN" })} />
          <Select label="Stage" value={newScript.stage} options={stages} onChange={(value) => setNewScript({ ...newScript, stage: value })} />
          <Input label="Tags" value={newScript.tags} onChange={(value) => setNewScript({ ...newScript, tags: value })} />
          <Textarea label="Body" value={newScript.body} onChange={(value) => setNewScript({ ...newScript, body: value })} />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
            onClick={createScript}
            type="button"
          >
            <Save className="h-4 w-4" />
            Lưu kịch bản
          </button>
        </div>
      </aside>

      <div className="grid gap-3">
        {scripts.map((script) => (
          <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" key={script.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">{script.title}</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {script.language} · {script.stage} · {script.tags.join(", ") || "no-tags"}
                </p>
              </div>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800"
                onClick={() => copyScript(script)}
                type="button"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
              {renderScript(script)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LinksPanel({ links, revokeLink }: { links: LinkDto[]; revokeLink: (id: string) => void }) {
  return (
    <section className="grid gap-3">
      {links.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600">Chưa có link.</div>
      ) : null}
      {links.map((link) => (
        <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" key={link.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                {link.kind} · {link.files.length} file
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Hết hạn {formatDate(link.expiresAt)} · tải {link.downloadCount} lần ·{" "}
                {link.revokedAt ? "đã thu hồi" : "đang hoạt động"}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500">
                {link.files.map((item) => item.file.filename).join(", ")}
              </p>
            </div>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              disabled={Boolean(link.revokedAt)}
              onClick={() => revokeLink(link.id)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              Thu hồi
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function SafePanel({ createSafeCode, safeCode }: { createSafeCode: () => void; safeCode: string }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Safe Mode máy khách</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Tạo mã 6 số, mở /safe trên máy khách, nhập mã để chỉ search/copy/tạo link tạm.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"
          onClick={createSafeCode}
          type="button"
        >
          <KeyRound className="h-4 w-4" />
          Tạo mã
        </button>
      </div>
      {safeCode ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-sm text-emerald-900">Mã Safe Mode</p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-widest text-emerald-950">{safeCode}</p>
        </div>
      ) : null}
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        className="h-10 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-blue-500"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input className="h-10 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm" readOnly value={value} />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <select
        className="h-10 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-blue-500"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <textarea
        className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
