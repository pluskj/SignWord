import {
  GOOGLE_SHEET_ID,
  GOOGLE_SHEET_WORDS_NAME,
  GOOGLE_SHEET_VIDEOS_NAME,
  GOOGLE_APPS_SCRIPT_URL,
} from "./signwordConfig";

export type VideoType = "word" | "sentence";

export type WordRow = {
  word_id: string;
  word: string;
  word_type?: string;
  meaning?: string;
  tags?: string;
  level?: string;
  notes?: string;
};

export type VideoRow = {
  video_id: string;
  type: VideoType;
  word_id?: string;
  sentence_text?: string;
  video_url: string;
  description?: string;
  signer?: string;
  tags?: string;
  created_at?: string;
};

export type SignWordVideo = {
  id: string;
  type: VideoType;
  wordId?: string;
  sentenceText?: string;
  url: string;
  previewUrl: string;
  originalUrl: string;
  description: string;
  signer: string;
  tags: string[];
  createdAt?: string;
};

export type SignWordEntry = {
  wordId: string;
  word: string;
  wordType?: string;
  meaning?: string;
  tags: string[];
  level?: string;
  notes?: string;
  wordVideos: SignWordVideo[];
  sentenceVideos: SignWordVideo[];
};

const SHEET_BASE_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;

export async function fetchSignWords(): Promise<SignWordEntry[]> {
  const [wordRows, videoRows] = await Promise.all([
    fetchSheet(GOOGLE_SHEET_WORDS_NAME),
    fetchSheet(GOOGLE_SHEET_VIDEOS_NAME),
  ]);

  const words = wordRows.map(mapWordRow).filter((row) => row.word_id && row.word);
  const videos = videoRows.map(mapVideoRow).filter((row) => row.video_url && row.type);

  const wordMap = new Map<string, SignWordEntry>();

  for (const w of words) {
    const entry: SignWordEntry = {
      wordId: w.word_id,
      word: w.word,
      wordType: w.word_type || undefined,
      meaning: w.meaning || undefined,
      tags: splitTags(w.tags),
      level: w.level || undefined,
      notes: w.notes || undefined,
      wordVideos: [],
      sentenceVideos: [],
    };
    wordMap.set(w.word_id, entry);
  }

  for (const v of videos) {
    const base: SignWordVideo = {
      id: v.video_id || v.video_url,
      type: v.type,
      wordId: v.word_id || undefined,
      sentenceText: v.sentence_text || undefined,
      url: buildPlaybackUrl(v.video_url),
      previewUrl: buildPreviewUrl(v.video_url),
      originalUrl: v.video_url,
      description: v.description || "",
      signer: v.signer || "",
      tags: splitTags(v.tags),
      createdAt: v.created_at || undefined,
    };

    if (v.type === "word" && v.word_id && wordMap.has(v.word_id)) {
      wordMap.get(v.word_id)!.wordVideos.push(base);
    } else if (v.type === "sentence" && v.word_id && wordMap.has(v.word_id)) {
      wordMap.get(v.word_id)!.sentenceVideos.push(base);
    }
  }

  return Array.from(wordMap.values()).sort((a, b) => a.word.localeCompare(b.word));
}

async function fetchSheet(sheetName: string): Promise<Record<string, string>[]> {
  const url = `${SHEET_BASE_URL}${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet ${sheetName}`);
  }
  const text = await response.text();
  return csvToObjects(text);
}

function csvToObjects(csv: string): Record<string, string>[] {
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    return [];
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const objects: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      const key = header[j];
      if (!key) {
        continue;
      }
      const value = row[j] ?? "";
      obj[key] = value.trim();
    }
    const hasValue = Object.values(obj).some((v) => v !== "");
    if (hasValue) {
      objects.push(obj);
    }
  }
  return objects;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function mapWordRow(row: Record<string, string>): WordRow {
  return {
    word_id: row["word_id"] || "",
    word: row["word"] || "",
    word_type: row["word_type"] || undefined,
    meaning: row["meaning"] || undefined,
    tags: row["tags"] || undefined,
    level: row["level"] || undefined,
    notes: row["notes"] || undefined,
  };
}

function mapVideoRow(row: Record<string, string>): VideoRow {
  const typeValue = row["type"] || "";
  const type = typeValue.toLowerCase() === "sentence" ? "sentence" : "word";
  return {
    video_id: row["video_id"] || "",
    type,
    word_id: row["word_id"] || undefined,
    sentence_text: row["sentence_text"] || undefined,
    video_url: row["video_url"] || "",
    description: row["description"] || undefined,
    signer: row["signer"] || undefined,
    tags: row["tags"] || undefined,
    created_at: row["created_at"] || undefined,
  };
}

function splitTags(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function buildPlaybackUrl(url: string): string {
  const fileId = extractDriveFileId(url);
  if (!fileId || !GOOGLE_APPS_SCRIPT_URL) {
    return url;
  }
  const separator = GOOGLE_APPS_SCRIPT_URL.includes("?") ? "&" : "?";
  return `${GOOGLE_APPS_SCRIPT_URL}${separator}action=streamVideo&fileId=${encodeURIComponent(
    fileId,
  )}`;
}

function buildPreviewUrl(url: string): string {
  const fileId = extractDriveFileId(url);
  if (!fileId) {
    return url;
  }
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function extractDriveFileId(url: string): string | undefined {
  if (!url.includes("drive.google.com")) {
    return undefined;
  }

  let fileId = "";

  if (url.includes("drive.google.com/file/d/")) {
    const marker = "/file/d/";
    const start = url.indexOf(marker);
    if (start === -1) {
      return url;
    }
    const after = url.substring(start + marker.length);
    const slashIndex = after.indexOf("/");
    const questionIndex = after.indexOf("?");
    let endIndex = after.length;
    if (slashIndex !== -1 && questionIndex !== -1) {
      endIndex = Math.min(slashIndex, questionIndex);
    } else if (slashIndex !== -1) {
      endIndex = slashIndex;
    } else if (questionIndex !== -1) {
      endIndex = questionIndex;
    }
    fileId = after.substring(0, endIndex);
  } else {
    const idMatch = url.match(/[?&]id=([^&]+)/);
    if (idMatch) {
      fileId = idMatch[1];
    }
  }

  if (!fileId) {
    return undefined;
  }

  return fileId;
}
