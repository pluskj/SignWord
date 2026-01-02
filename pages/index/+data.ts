import type { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";
import { fetchSignWords, type SignWordEntry } from "../../lib/signwordData";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(_pageContext: PageContextServer) {
  const config = useConfig();
  try {
    const entries = await fetchSignWords();
    config({
      title: `수어 단어장 (${entries.length}개 단어)`,
    });
    return { entries: entries as SignWordEntry[], errorMessage: null as string | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    config({
      title: "수어 단어장 - 데이터를 불러오지 못했습니다",
    });
    console.error("Failed to load sign words:", message);
    return { entries: [] as SignWordEntry[], errorMessage: message };
  }
}
