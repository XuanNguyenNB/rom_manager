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

function isAuthFailure(code: number, message = "") {
  return code === 401 || code === 403 || /token|expire|auth|login/i.test(message);
}

function parseModifiedAt(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toPublicUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return new URL(value, env.appUrl).toString();
  }

  return value;
}

async function readAListPayload<T>(response: Response, context: string) {
  const text = await response.text();
  let payload: AListResponse<T> | null = null;

  try {
    payload = JSON.parse(text) as AListResponse<T>;
  } catch {
    const preview = text.trim().slice(0, 100);
    throw new Error(`${context} returned non-JSON response. Check ALIST_INTERNAL_URL/base path. Preview: ${preview}`);
  }

  if (!response.ok) {
    throw new Error(`${context} failed with status ${response.status}: ${payload.message}`);
  }

  return payload;
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

  const payload = await readAListPayload<AListLoginData>(response, "AList login");
  if (payload.code !== 200 || !payload.data?.token) {
    throw new Error(`AList login failed: ${payload.message}`);
  }

  cachedToken = payload.data.token;
  return cachedToken;
}

async function alistPost<T>(endpoint: string, body: Record<string, unknown>, allowRetry = true): Promise<T> {
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

  const payload = await readAListPayload<T>(response, `AList request ${endpoint}`);
  if (payload.code === 200) {
    return payload.data;
  }

  if (allowRetry && isAuthFailure(payload.code, payload.message)) {
    cachedToken = null;
    return alistPost<T>(endpoint, body, false);
  }

  throw new Error(`AList request ${endpoint} failed: ${payload.message}`);
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
  const scanRoot = root.startsWith("/") ? root : `/${root}`;
  const files: ScannedAListFile[] = [];
  const stack = [scanRoot];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    let entries: AListItem[];
    try {
      entries = await listAListDirectory(current);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown AList error.";
      if (current === scanRoot) {
        throw new Error(`AList scan root ${scanRoot} is not accessible: ${message}`);
      }
      throw new Error(`AList directory ${current} is not accessible: ${message}`);
    }

    for (const entry of entries) {
      if (!entry.name) {
        continue;
      }

      const alistPath = joinAListPath(current, entry.name);

      if (entry.is_dir) {
        stack.push(alistPath);
        continue;
      }

      files.push({
        alistPath,
        filename: entry.name,
        sizeBytes: typeof entry.size === "number" ? BigInt(entry.size) : undefined,
        modifiedAt: parseModifiedAt(entry.modified),
      });
    }
  }

  return files;
}

export async function getAListDownloadUrl(path: string) {
  const data = await alistPost<AListGetData>("/api/fs/get", { path });
  if (data.raw_url) {
    return toPublicUrl(data.raw_url);
  }

  throw new Error(`AList did not return a signed raw_url for ${path}. Check AList storage download settings.`);
}
