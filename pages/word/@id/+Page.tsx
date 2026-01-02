import { useState, useMemo } from "react";
import type { SignWordEntry } from "../../../lib/signwordData";
import { Link } from "../../../components/Link";

export default function Page({
  entry,
  errorMessage,
  loading,
}: {
  entry: SignWordEntry | undefined;
  errorMessage: string | null;
  loading: boolean;
}) {

  const [selectedVideoId, setSelectedVideoId] = useState(
    entry ? entry.wordVideos[0]?.id || entry.sentenceVideos[0]?.id || "" : "",
  );

  const selectedVideo = useMemo(() => {
    if (!entry || !selectedVideoId) {
      return undefined;
    }
    return (
      entry.wordVideos.find((video) => video.id === selectedVideoId) ||
      entry.sentenceVideos.find((video) => video.id === selectedVideoId)
    );
  }, [entry, selectedVideoId]);

  if (!entry && loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h1>단어를 불러오는 중입니다</h1>
        <div>
          <Link href="/">단어 목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  if (!entry && errorMessage) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h1>단어를 불러오는 중 오류가 발생했습니다</h1>
        <div style={{ fontSize: 13, color: "#856404" }}>상세 메시지: {errorMessage}</div>
        <div>
          <Link href="/">단어 목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h1>단어를 찾을 수 없습니다</h1>
        <div>
          <Link href="/">단어 목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Link href="/">← 단어 목록으로</Link>
      </div>
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1>{entry.word}</h1>
        {entry.meaning && <div style={{ fontSize: 16 }}>{entry.meaning}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 14 }}>
          {entry.level && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #ddd",
              }}
            >
              난이도: {entry.level}
            </span>
          )}
          {entry.wordType && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #ddd",
              }}
            >
              모양: {entry.wordType}
            </span>
          )}
          {entry.tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                backgroundColor: "#f5f5f5",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        {entry.notes && (
          <div style={{ fontSize: 14, color: "#555" }}>
            {entry.notes}
          </div>
        )}
      </header>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2>영상 재생</h2>
        {selectedVideo ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                position: "relative",
                paddingTop: "56.25%",
                width: "100%",
                backgroundColor: "black",
              }}
            >
              <iframe
                key={selectedVideo.id}
                src={selectedVideo.previewUrl || selectedVideo.originalUrl}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="영상 재생"
              />
            </div>
            <div style={{ fontSize: 14 }}>
              {selectedVideo.description || "설명이 없습니다."}
            </div>
            <div style={{ fontSize: 12, color: "#666", display: "flex", gap: 8 }}>
              <span>유형: {selectedVideo.type === "word" ? "단어" : "문장 예제"}</span>
              {selectedVideo.signer && <span>수어자: {selectedVideo.signer}</span>}
            </div>
            <div style={{ fontSize: 12 }}>
              <a href={selectedVideo.originalUrl} target="_blank" rel="noreferrer">
                구글드라이브에서 영상 열기
              </a>
            </div>
          </div>
        ) : (
          <div style={{ color: "#666" }}>재생할 수 있는 영상이 없습니다.</div>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2>단어 수어 영상</h2>
        {entry.wordVideos.length === 0 && (
          <div style={{ color: "#666" }}>등록된 단어 수어 영상이 없습니다.</div>
        )}
        {entry.wordVideos.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {entry.wordVideos.map((video) => (
              <li key={video.id} style={{ marginBottom: 4 }}>
                <button
                  type="button"
                  onClick={() => setSelectedVideoId(video.id)}
                  style={{
                    borderRadius: 4,
                    border:
                      video.id === selectedVideoId ? "1px solid #1976d2" : "1px solid #ddd",
                    backgroundColor: video.id === selectedVideoId ? "#e3f2fd" : "white",
                    padding: "6px 8px",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 2 }}>
                    {video.description || "기본 영상"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {video.tags.join(", ")}
                    {video.createdAt && ` · ${video.createdAt}`}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2>문장 예제 영상</h2>
        {entry.sentenceVideos.length === 0 && (
          <div style={{ color: "#666" }}>등록된 문장 예제 영상이 없습니다.</div>
        )}
        {entry.sentenceVideos.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {entry.sentenceVideos.map((video) => (
              <li key={video.id} style={{ marginBottom: 4 }}>
                <button
                  type="button"
                  onClick={() => setSelectedVideoId(video.id)}
                  style={{
                    borderRadius: 4,
                    border:
                      video.id === selectedVideoId ? "1px solid #1976d2" : "1px solid #ddd",
                    backgroundColor: video.id === selectedVideoId ? "#e3f2fd" : "white",
                    padding: "6px 8px",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 2 }}>
                    {video.sentenceText || video.description || "문장 예제"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {video.tags.join(", ")}
                    {video.createdAt && ` · ${video.createdAt}`}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
