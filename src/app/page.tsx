import Link from "next/link";
import { FileLookupClient } from "@/components/file-lookup-client";

export default function Home() {
  return (
    <>
      <FileLookupClient />
      <Link
        className="fixed bottom-3 right-3 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50"
        href="/admin"
      >
        Admin
      </Link>
    </>
  );
}
