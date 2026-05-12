import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileArchive, ShieldAlert } from "lucide-react";
import { getActiveLink } from "@/lib/download-links";
import { formatBytes, formatDate } from "@/lib/format";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PackagePage({ params }: PageProps) {
  const { token } = await params;
  const link = await getActiveLink(token);

  if (!link) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950">
      <section className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <FileArchive className="mt-1 h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold">Gói file tải về</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Link hết hạn lúc {formatDate(link.expiresAt)}. Nếu file yêu cầu mật khẩu giải nén,
                người hỗ trợ sẽ gửi riêng.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Không đóng trình duyệt khi đang tải ROM lớn. Nếu tải lỗi, mở lại link này trước khi hết hạn.</p>
          </div>
        </div>

        <div className="grid gap-3">
          {link.files.map(({ file }) => (
            <div key={file.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-medium">{file.filename}</h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    {file.brand ?? "Unknown"} {file.model ?? ""} · {file.fileType} ·{" "}
                    {formatBytes(file.sizeBytes)}
                  </p>
                </div>
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
                  href={`/d/${token}?file=${file.id}`}
                >
                  <Download className="h-4 w-4" />
                  Tải file
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
