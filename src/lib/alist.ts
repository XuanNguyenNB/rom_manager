import { env } from "@/lib/env";

type AListResponse<T> = {
  code: number;
  message: string;
  data: T;
};

type AListLoginData = {
  token: string;
};

type AListItem = {
  name: string;
  size?: number;
  is_dir?: boolean;
  modified?: string;
};

type AListListData = {
  content?: AListItem[];
  total?: number;
};

type AListGetData = {
  raw_url?: string;
  name?: string;
};

export type ScannedAListFile = {
  alistPath: string;
  filename: string;
  sizeBytes?: bigint;
  modifiedAt?: Date;
};

let cachedToken: string | null = env.alistToken || null;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function joinAListPath(parent: string, child: string) {
  const cleanParent = parent === "/" ? "" : parent.replace(/\/+$/, "");
  return `${cleanParent}/${child}`.replace(/\/+/g, "/");
}

function encodeAListPath(path: string) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function parseAListResponse<T>(response: Response, context: string) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${context} failed with status ${response.status}.`);
  }

  try {
    return JSON.parse(text) as AListResponse<T>;
  } catch {
    const preview = text.trim().slice(0, 80);
    throw new Error(`${context} returned non-JSON response. Check ALIST_INTERNAL_URL/base path. Preview: ${preview}`);
  }
}

async function getAListToken() {
  if (cachedToken) {
    return cachedToken;
  }

  if (!env.alistUsername || !env.alistPassword) {
    throw new Error("AList credentials are not configured.");
  }

  const response = await fetch(`${trimTrailingSlash(env.alistInternalUrl)}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: env.alistUsername,
      password: env.alistPassword,
    }),
    cache: "no-store",
  });

  const payload = await parseAListResponse<AListLoginData>(response, "AList login");
  if (!payload.data?.token) {
    throw new Error(`AList login failed: ${payload.message}`);
  }

  cachedToken = payload.data.token;
  return cachedToken;
}

async function alistPost<T>(endpoint: string, body: Record<string, unknown>) {
  const token = await getAListToken();
  const response = await fetch(`${trimTrailingSlash(env.alistInternalUrl)}${endpoint}`, {
    method: "POST",
    headers: {
      authorization: token,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await parseAListResponse<T>(response, `AList request ${endpoint}`);
  if (payload.code !== 200) {
    throw new Error(`AList request ${endpoint} failed: ${payload.message}`);
  }

  return payload.data;
}

export async function listAListDirectory(path: string) {
  const data = await alistPost<AListListData>("/api/fs/list", {
    path,
    page: 1,
    per_page: 0,
    refresh: false,
  });

  return data.content ?? [];
}

export async function scanAListTree(root = env.alistScanRoot) {
  const files: ScannedAListFile[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = await listAListDirectory(current);

    for (const entry of entries) {
      const alistPath = joinAListPath(current, entry.name);

      if (entry.is_dir) {
        stack.push(alistPath);
        continue;
      }

      files.push({
        alistPath,
        filename: entry.name,
        sizeBytes: typeof entry.size === "number" ? BigInt(entry.size) : undefined,
        modifiedAt: entry.modified ? new Date(entry.modified) : undefined,
      });
    }
  }

  return files;
}

export async function getAListDownloadUrl(path: string) {
  if (env.alistPublicDownloadBaseUrl) {
    return `${trimTrailingSlash(env.alistPublicDownloadBaseUrl)}/d${encodeAListPath(path)}`;
  }

  const data = await alistPost<AListGetData>("/api/fs/get", { path });
  if (data.raw_url) {
    return data.raw_url;
  }

  throw new Error("AList did not return a downloadable URL. Configure ALIST_PUBLIC_DOWNLOAD_BASE_URL.");
}
