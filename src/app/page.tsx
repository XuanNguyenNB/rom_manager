import Link from "next/link";
import { SafeClient } from "@/components/safe-client";

export default function Home() {
  return (
    <>
      <SafeClient />
      <Link
        className="fixed bottom-3 right-3 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50"
        href="/admin"
      >
        Admin
      </Link>
    </>
  );
}
