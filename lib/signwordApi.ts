import { GOOGLE_APPS_SCRIPT_URL } from "./signwordConfig";
import type { VideoType } from "./signwordData";

export type CreateWordInput = {
  wordId?: string;
  word: string;
  wordType?: string;
  meaning?: string;
  tags?: string;
  level?: string;
  notes?: string;
};

export type CreateVideoInput = {
  videoId?: string;
  type: VideoType;
  wordId: string;
  sentenceText?: string;
  videoUrl: string;
  description?: string;
  signer?: string;
  tags?: string;
  createdAt?: string;
};

export type UploadVideoFileInput = {
  file: File;
  wordId: string;
  type: VideoType;
  videoId: string;
};

export type UploadVideoFileOutput = {
  videoUrl: string;
  fileId?: string;
  createdAt?: string;
};

export async function createWord(input: CreateWordInput) {
  const body = {
    action: "createWord",
    payload: input,
  };
  await postToScript(body);
}

export async function createVideo(input: CreateVideoInput) {
  const body = {
    action: "createVideo",
    payload: input,
  };
  await postToScript(body);
}

export async function uploadVideoFile(
  input: UploadVideoFileInput,
): Promise<UploadVideoFileOutput> {
  const buffer = await input.file.arrayBuffer();
  const bytes = Array.from(new Uint8Array(buffer));
  const body = {
    action: "uploadVideoFile",
    payload: {
      name: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      content: bytes,
      wordId: input.wordId,
      type: input.type,
      videoId: input.videoId,
    },
  };
  if (!GOOGLE_APPS_SCRIPT_URL) {
    throw new Error("Apps Script URL이 설정되어 있지 않습니다.");
  }
  const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    throw new Error(`영상 파일 업로드 응답 파싱 실패: ${text}`);
  }
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    (data as { error?: unknown }).error
  ) {
    throw new Error(`영상 파일 업로드 오류: ${(data as { error?: unknown }).error}`);
  }
  if (!data || typeof data !== "object" || !("videoUrl" in data)) {
    throw new Error(`영상 파일 업로드 응답에 videoUrl이 없습니다: ${text}`);
  }
  const result = data as {
    videoUrl?: string;
    fileId?: string;
    createdAt?: string;
  };
  if (!result.videoUrl) {
    throw new Error(`영상 파일 업로드 응답에 videoUrl이 없습니다: ${text}`);
  }
  return {
    videoUrl: result.videoUrl,
    fileId: result.fileId,
    createdAt: result.createdAt,
  };
}

async function postToScript(body: unknown): Promise<unknown> {
  if (!GOOGLE_APPS_SCRIPT_URL) {
    throw new Error("Apps Script URL이 설정되어 있지 않습니다.");
  }
  const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Apps Script 호출 실패 (${response.status})`);
  }
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    const data = JSON.parse(text);
    if (data && typeof data === "object" && "error" in data && data.error) {
      throw new Error(String((data as { error: unknown }).error));
    }
    return data;
  } catch {
    return undefined;
  }
}
