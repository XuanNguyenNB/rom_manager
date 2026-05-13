"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Download,
  FileSearch,
  FolderSync,
  Link2,
  Lock,
  Save,
  Search,
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
  initialLinks: LinkDto[];
};

const tabs = [
  { id: "files", label: "Files", icon: FileSearch },
  { id: "links", label: "Links", icon: Link2 },
] as const;

const fileTypes = ["ROM", "TOOL", "DRIVER", "PATCH", "GUIDE", "BUNDLE", "OTHER"];
const statuses = ["UNCLASSIFIED", "TESTED", "UNTESTED", "BAD", "ARCHIVED", "MISSING"];

export function DashboardClient({
  actorEmail,
  dbReady,
  initialDevices,
  initialFiles,
  initialLinks,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("files");
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<FileDto[]>(initialFiles);
  const [links, setLinks] = useState<LinkDto[]>(initialLinks);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileDto | null>(initialFiles[0] ?? null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const brands = useMemo(
    () => Array.from(new Set(initialDevices.map((device) => device.brand))).sort(),
    [initialDevices],
  );

  const stats = useMemo(() => {
    const totalBytes = files.reduce((total, file) => total + Number(file.sizeBytes ?? 0), 0);
    const activeLinks = links.filter((link) => !link.revokedAt && new Date(link.expiresAt) > new Date()).length;

    return {
      files: files.length,
      selected: selectedIds.length,
      activeLinks,
      totalSize: formatBytes(totalBytes),
    };
  }, [files, links, selectedIds]);

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

    const data = (await response.json()) as { files: FileDto[] };
    setFiles(data.files);
    setSelectedIds([]);
    setSelectedFile(data.files[0] ?? null);

    if (data.files.length === 0) {
      setMessage("Không tìm thấy file phù hợp.");
    }
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
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(`Tạo link thất bại: ${data?.error ?? "kiểm tra database và quyền truy cập."}`);
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
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(`Quét AList thất bại: ${data?.error ?? "kiểm tra ALIST_* env và token."}`);
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
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(`Lưu metadata thất bại: ${data?.error ?? "kiểm tra dữ liệu file."}`);
      return;
    }

    const data = (await response.json()) as { file: FileDto };
    setFiles((current) => current.map((file) => (file.id === data.file.id ? data.file : file)));
    setSelectedFile(data.file);
    setMessage("Đã lưu metadata file.");
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
              Public lookup
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
          <Metric label="Đã chọn" value={stats.selected} />
          <Metric label="Link còn hạn" value={stats.activeLinks} />
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
                placeholder="Search model, region, build, filename, tag..."
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

        {activeTab === "links" ? <LinksPanel links={links} revokeLink={revokeLink} /> : null}
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

        {files.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
            Chưa có file. Hãy cấu hình AList rồi bấm Rescan AList.
          </div>
        ) : null}

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
              <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedFile(file)} type="button">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h2 className="truncate text-sm font-semibold">{file.filename}</h2>
                  <span className="w-fit rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                    {file.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-600">
                  {file.brand ?? "Unknown"} {file.model ?? ""} · {file.fileType} · {formatBytes(file.sizeBytes)} ·{" "}
                  {file.region ?? "no-region"}
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
            <Readonly label="AList path" value={selectedFile.alistPath} />
            <Input
              label="Brand"
              value={selectedFile.brand ?? ""}
              onChange={(value) => setSelectedFileState({ ...selectedFile, brand: value })}
            />
            <Input
              label="Model"
              value={selectedFile.model ?? ""}
              onChange={(value) => setSelectedFileState({ ...selectedFile, model: value })}
            />
            <Input
              label="Region"
              value={selectedFile.region ?? ""}
              onChange={(value) => setSelectedFileState({ ...selectedFile, region: value })}
            />
            <Input
              label="Android"
              value={selectedFile.androidVersion ?? ""}
              onChange={(value) => setSelectedFileState({ ...selectedFile, androidVersion: value })}
            />
            <Input
              label="Build"
              value={selectedFile.buildNumber ?? ""}
              onChange={(value) => setSelectedFileState({ ...selectedFile, buildNumber: value })}
            />
            <Select
              label="Type"
              value={selectedFile.fileType}
              options={fileTypes}
              onChange={(value) => setSelectedFileState({ ...selectedFile, fileType: value })}
            />
            <Select
              label="Status"
              value={selectedFile.status}
              options={statuses}
              onChange={(value) => setSelectedFileState({ ...selectedFile, status: value })}
            />
            <Input
              label="Tags"
              value={selectedFile.tags.join(", ")}
              onChange={(value) =>
                setSelectedFileState({
                  ...selectedFile,
                  tags: value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
            />
            <Textarea
              label="Note"
              value={selectedFile.note ?? ""}
              onChange={(value) => setSelectedFileState({ ...selectedFile, note: value })}
            />
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Chọn một file để sửa metadata.</p>
        )}
      </aside>
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
            <div className="min-w-0">
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
