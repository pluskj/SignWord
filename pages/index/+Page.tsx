import { useMemo, useState } from "react";
import type { SignWordEntry } from "../../lib/signwordData";
import { Link } from "../../components/Link";

export default function Page({
  entries,
  errorMessage,
  loading,
}: {
  entries: SignWordEntry[];
  errorMessage: string | null;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");

  const levels = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((entry) => {
      if (entry.level) {
        set.add(entry.level);
      }
    });
    return Array.from(set).sort();
  }, [entries]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((entry) => {
      entry.tags.forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (selectedLevel !== "all" && entry.level !== selectedLevel) {
        return false;
      }
      if (selectedTag !== "all" && !entry.tags.includes(selectedTag)) {
        return false;
      }
      if (!term) {
        return true;
      }
      const target = [
        entry.word,
        entry.meaning || "",
        entry.tags.join(" "),
        entry.notes || "",
      ]
        .join(" ")
        .toLowerCase();
      return target.includes(term);
    });
  }, [entries, search, selectedLevel, selectedTag]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1>수어 단어장</h1>
        <p>구글시트에 등록한 단어와 수어 영상을 검색하고 재생할 수 있는 단어장입니다.</p>
      </div>
      {loading && !errorMessage && (
        <div style={{ fontSize: 14, color: "#555" }}>단어 목록을 불러오는 중입니다...</div>
      )}
      {errorMessage && (
        <div
          style={{
            padding: 10,
            borderRadius: 6,
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeeba",
            fontSize: 13,
            color: "#856404",
          }}
        >
          시트에서 데이터를 불러오는 중 오류가 발생했습니다. 시트 탭 이름과 공유 설정을 확인하세요.
          <br />
          상세 메시지: {errorMessage}
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <input
          type="search"
          value={search}
          placeholder="단어, 뜻, 메모, 태그 검색"
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px",
            minWidth: 160,
            padding: "8px 10px",
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        />
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="all">난이도 전체</option>
          {levels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="all">태그 전체</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: 14, color: "#555" }}>
        검색 결과: {filtered.length}개 단어 / 전체 {entries.length}개
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((entry) => (
          <article
            key={entry.wordId}
            style={{
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontWeight: 600 }}>{entry.word}</div>
              {entry.level && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 6px",
                    borderRadius: 999,
                    border: "1px solid #ddd",
                  }}
                >
                  {entry.level}
                </span>
              )}
            </div>
            {entry.meaning && (
              <div style={{ fontSize: 14, color: "#444" }}>{entry.meaning}</div>
            )}
            {entry.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, fontSize: 12 }}>
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: "2px 6px",
                      borderRadius: 999,
                      backgroundColor: "#f5f5f5",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12, color: "#666" }}>
              단어 영상 {entry.wordVideos.length}개, 문장 예제 {entry.sentenceVideos.length}개
            </div>
            <div>
              <Link href={`/word/${entry.wordId}`}>자세히 보기</Link>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1/-1", color: "#666" }}>조건에 맞는 단어가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
