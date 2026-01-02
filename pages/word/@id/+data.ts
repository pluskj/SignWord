import type { PageContextServer } from "vike/types";
import { useConfig } from "vike-react/useConfig";
import { fetchSignWords, type SignWordEntry } from "../../../lib/signwordData";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
  const config = useConfig();
  try {
    const entries = await fetchSignWords();
    const entry = entries.find((item) => item.wordId === String(pageContext.routeParams.id));

    if (entry) {
      config({
        title: `${entry.word} - 수어 단어장`,
      });
    } else {
      config({
        title: "단어를 찾을 수 없습니다",
      });
    }

    return { entry: entry as SignWordEntry | undefined, errorMessage: null as string | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to load word entry:", message);
    config({
      title: "단어를 불러오지 못했습니다",
    });
    return { entry: undefined as SignWordEntry | undefined, errorMessage: message };
  }
}
