import { useEffect, useMemo, useRef, useState } from "react";
import type { SignWordEntry } from "../../lib/signwordData";
import { createWord, createVideo, uploadVideoFile } from "../../lib/signwordApi";
import { GOOGLE_DRIVE_FOLDER_URL, GOOGLE_SHEET_URL } from "../../lib/signwordConfig";

function generateId(prefix: string) {
  const now = Date.now().toString(36);
  return `${prefix}${now}`;
}

export default function Page({
  entries,
  errorMessage,
  loading,
}: {
  entries: SignWordEntry[];
  errorMessage: string | null;
  loading: boolean;
}) {
  const [isAuthorized, setIsAuthorized] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("signword_admin_authenticated") === "1";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  function handleLoginSubmit(event: React.FormEvent) {
    event.preventDefault();
    const expectedPassword = "signword-admin";
    if (!passwordInput) {
      setLoginError("비밀번호를 입력하세요.");
      return;
    }
    if (passwordInput !== expectedPassword) {
      setLoginError("비밀번호가 올바르지 않습니다.");
      return;
    }
    setIsAuthorized(true);
    setPasswordInput("");
    setLoginError("");
    if (typeof window !== "undefined") {
      window.localStorage.setItem("signword_admin_authenticated", "1");
    }
  }

  const [wordEntries, setWordEntries] = useState(entries);
  const [wordSearch, setWordSearch] = useState("");

  const [wordForm, setWordForm] = useState({
    word: "",
    wordType: "",
    meaning: "",
    tags: "",
    level: "",
    notes: "",
  });
  const [wordSaving, setWordSaving] = useState(false);
  const [wordMessage, setWordMessage] = useState("");

  const [videoForm, setVideoForm] = useState({
    wordId: "",
    type: "word",
    sentenceText: "",
    videoUrl: "",
    description: "",
    signer: "",
    tags: "",
  });
  const [videoSaving, setVideoSaving] = useState(false);
  const [videoMessage, setVideoMessage] = useState("");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoFile) {
      setVideoFileUrl(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoFileUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  const filteredWordEntries = useMemo(() => {
    const term = wordSearch.trim().toLowerCase();
    if (!term) {
      return wordEntries;
    }
    return wordEntries.filter((entry) => {
      const text = [
        entry.word,
        entry.meaning || "",
        entry.wordId,
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(term);
    });
  }, [wordEntries, wordSearch]);

  async function handleWordSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!wordForm.word.trim()) {
      setWordMessage("단어를 입력하세요.");
      return;
    }
    setWordSaving(true);
    setWordMessage("");
    const wordId = generateId("W");
    try {
      await createWord({
        wordId,
        word: wordForm.word.trim(),
        wordType: wordForm.wordType.trim() || undefined,
        meaning: wordForm.meaning.trim() || undefined,
        tags: wordForm.tags.trim() || undefined,
        level: wordForm.level.trim() || undefined,
        notes: wordForm.notes.trim() || undefined,
      });
      const tagsArray =
        wordForm.tags.trim().length === 0
          ? []
          : wordForm.tags
              .split(/[;,]/)
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0);
      setWordEntries((prev) => [
        ...prev,
        {
          wordId,
          word: wordForm.word.trim(),
          wordType: wordForm.wordType.trim() || undefined,
          meaning: wordForm.meaning.trim() || undefined,
          tags: tagsArray,
          level: wordForm.level.trim() || undefined,
          notes: wordForm.notes.trim() || undefined,
          wordVideos: [],
          sentenceVideos: [],
        },
      ]);
      setVideoForm((prev) => ({
        ...prev,
        wordId,
      }));
      setWordMessage(`단어가 추가되었습니다. word_id: ${wordId}. 잠시 후 새로고침하면 목록에 반영됩니다.`);
      setWordForm({
        word: "",
        wordType: "",
        meaning: "",
        tags: "",
        level: "",
        notes: "",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWordMessage(`오류가 발생했습니다: ${message}`);
    } finally {
      setWordSaving(false);
    }
  }

  async function handleVideoSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!videoForm.wordId) {
      setVideoMessage("연결할 단어를 선택하세요.");
      return;
    }
    if (!videoForm.videoUrl.trim() && !videoFile) {
      setVideoMessage("영상 링크를 입력하거나 로컬 파일을 선택하세요.");
      return;
    }
    setVideoSaving(true);
    setVideoMessage("");
    const videoId = generateId("V");
    try {
      let videoUrl = videoForm.videoUrl.trim();
      let createdAt: string | undefined;
      if (!videoUrl && videoFile) {
        const result = await uploadVideoFile({
          file: videoFile,
          wordId: videoForm.wordId,
          type: videoForm.type === "sentence" ? "sentence" : "word",
          videoId,
        });
        videoUrl = result.videoUrl;
        createdAt = result.createdAt;
      }
      if (!videoUrl) {
        throw new Error("영상 링크를 생성하지 못했습니다.");
      }
      await createVideo({
        videoId,
        type: videoForm.type === "sentence" ? "sentence" : "word",
        wordId: videoForm.wordId,
        sentenceText: videoForm.sentenceText.trim() || undefined,
        videoUrl,
        description: videoForm.description.trim() || undefined,
        signer: videoForm.signer.trim() || undefined,
        tags: videoForm.tags.trim() || undefined,
        createdAt,
      });
      setVideoMessage(
        `영상이 추가되었습니다. video_id: ${videoId}. 잠시 후 새로고침하면 목록에 반영됩니다.`,
      );
      setVideoForm({
        wordId: videoForm.wordId,
        type: videoForm.type,
        sentenceText: "",
        videoUrl: "",
        description: "",
        signer: "",
        tags: "",
      });
      setVideoFile(null);
      setVideoFileUrl(null);
      setStartTime(0);
      setEndTime(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVideoMessage(`오류가 발생했습니다: ${message}`);
    } finally {
      setVideoSaving(false);
    }
  }

  function handleVideoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    setVideoFile(file);
    if (!file) {
      setStartTime(0);
      setEndTime(0);
    }
  }

  function handlePreviewLoadedMetadata(event: React.SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    if (!endTime && video.duration && Number.isFinite(video.duration)) {
      setEndTime(video.duration);
    }
  }

  function handlePreviewTimeUpdate(event: React.SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    if (endTime > 0 && video.currentTime >= endTime) {
      video.pause();
    }
  }

  function handlePreviewSetStart() {
    const video = videoPreviewRef.current;
    if (!video) {
      return;
    }
    const current = video.currentTime || 0;
    setStartTime(current);
    if (!endTime || endTime < current) {
      const duration = video.duration || current;
      setEndTime(duration);
    }
  }

  function handlePreviewSetEnd() {
    const video = videoPreviewRef.current;
    if (!video) {
      return;
    }
    const current = video.currentTime || 0;
    if (current <= startTime) {
      setStartTime(0);
    }
    setEndTime(current);
  }

  function handlePreviewPlaySegment() {
    const video = videoPreviewRef.current;
    if (!video || !videoFileUrl) {
      return;
    }
    const duration = video.duration || 0;
    const safeStart = Math.max(0, Math.min(startTime, duration));
    let safeEnd = endTime;
    if (!safeEnd || safeEnd <= safeStart || safeEnd > duration) {
      safeEnd = duration;
    }
    if (!duration) {
      return;
    }
    if (safeEnd <= safeStart) {
      return;
    }
    if (video.currentTime < safeStart || video.currentTime > safeEnd) {
      video.currentTime = safeStart;
    }
    video.play();
  }

  if (!isAuthorized) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 400,
        }}
      >
        <h1>관리자 로그인</h1>
        <p style={{ fontSize: 14, color: "#555" }}>
          이 페이지는 단어와 수어 영상을 관리하는 관리자 전용 화면입니다.
        </p>
        <form
          onSubmit={handleLoginSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>관리자 비밀번호</span>
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => {
                setPasswordInput(event.target.value);
                if (loginError) {
                  setLoginError("");
                }
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              marginTop: 4,
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #1976d2",
              backgroundColor: "#1976d2",
              color: "white",
              cursor: "pointer",
            }}
          >
            로그인
          </button>
        </form>
        {loginError && (
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: "red",
            }}
          >
            {loginError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1>단어·영상 추가</h1>
        <p style={{ fontSize: 14, color: "#555" }}>
          구글시트와 연결된 단어와 영상을 이 화면에서 추가할 수 있습니다.
        </p>
      </div>

      <section
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <h2>관리 도구</h2>
        <p style={{ fontSize: 13, color: "#555" }}>
          단어 데이터와 수어 영상이 저장된 구글드라이브 폴더를 바로 열 수 있습니다.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginTop: 4,
          }}
        >
          <a href={GOOGLE_SHEET_URL} target="_blank" rel="noreferrer">
            단어 데이터 시트 열기
          </a>
          <a href={GOOGLE_DRIVE_FOLDER_URL} target="_blank" rel="noreferrer">
            수어 영상 드라이브 열기
          </a>
        </div>
      </section>

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
          기존 단어 목록을 불러오는 중 오류가 발생했습니다. 시트 탭 이름과 공유 설정을 확인하세요.
          <br />
          상세 메시지: {errorMessage}
        </div>
      )}

      <section
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2>새 단어 추가</h2>
        <form onSubmit={handleWordSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>단어</span>
            <input
              type="text"
              value={wordForm.word}
              onChange={(e) => setWordForm((prev) => ({ ...prev, word: e.target.value }))}
              required
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>모양</span>
            <input
              type="text"
              value={wordForm.wordType}
              onChange={(e) => setWordForm((prev) => ({ ...prev, wordType: e.target.value }))}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>뜻</span>
            <input
              type="text"
              value={wordForm.meaning}
              onChange={(e) => setWordForm((prev) => ({ ...prev, meaning: e.target.value }))}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>태그 (쉼표로 구분)</span>
            <input
              type="text"
              value={wordForm.tags}
              onChange={(e) => setWordForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="예: 교육, 장소"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>난이도</span>
            <input
              type="text"
              value={wordForm.level}
              onChange={(e) => setWordForm((prev) => ({ ...prev, level: e.target.value }))}
              placeholder="예: 초급, 중급, 고급"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>메모</span>
            <textarea
              value={wordForm.notes}
              onChange={(e) => setWordForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </label>
          <button
            type="submit"
            disabled={wordSaving}
            style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #1976d2",
              backgroundColor: "#1976d2",
              color: "white",
              cursor: "pointer",
            }}
          >
            {wordSaving ? "저장 중..." : "단어 추가"}
          </button>
          {wordMessage && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: wordMessage.startsWith("오류") ? "red" : "#1976d2",
                wordBreak: "break-all",
              }}
            >
              {wordMessage}
            </div>
          )}
        </form>
      </section>

      <section
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2>새 영상 추가</h2>
        <form
          onSubmit={handleVideoSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>단어 검색</span>
            <input
              type="text"
              value={wordSearch}
              onChange={(e) => setWordSearch(e.target.value)}
              placeholder="단어, 뜻, ID로 검색"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>연결할 단어</span>
            <select
              value={videoForm.wordId}
              onChange={(e) => setVideoForm((prev) => ({ ...prev, wordId: e.target.value }))}
              required
            >
              <option value="">단어 선택</option>
              {filteredWordEntries.map((entry) => (
                <option key={entry.wordId} value={entry.wordId}>
                  {entry.word} ({entry.wordId})
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>영상 유형</span>
            <select
              value={videoForm.type}
              onChange={(e) => setVideoForm((prev) => ({ ...prev, type: e.target.value }))}
            >
              <option value="word">단어 수어 영상</option>
              <option value="sentence">문장 예제 영상</option>
            </select>
          </label>
          {videoForm.type === "sentence" && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>문장 텍스트</span>
              <textarea
                value={videoForm.sentenceText}
                onChange={(e) =>
                  setVideoForm((prev) => ({ ...prev, sentenceText: e.target.value }))
                }
                rows={2}
              />
            </label>
          )}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>영상 링크 (구글드라이브 공유 링크)</span>
            <input
              type="url"
              value={videoForm.videoUrl}
              onChange={(e) => setVideoForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
              placeholder="직접 입력하거나 아래에서 파일을 선택하세요"
              required={!videoFile}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>로컬 파일 선택 (미리보기)</span>
            <input type="file" accept="video/*" onChange={handleVideoFileChange} />
          </label>
          {videoFileUrl && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <video
                ref={videoPreviewRef}
                src={videoFileUrl}
                controls
                style={{ width: "100%", maxHeight: 300, backgroundColor: "black" }}
                onLoadedMetadata={handlePreviewLoadedMetadata}
                onTimeUpdate={handlePreviewTimeUpdate}
              />
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    flex: 1,
                  }}
                >
                  <span>시작 시간 (초)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={startTime}
                    onChange={(e) => setStartTime(Number(e.target.value) || 0)}
                  />
                </label>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    flex: 1,
                  }}
                >
                  <span>끝 시간 (초)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={endTime}
                    onChange={(e) => setEndTime(Number(e.target.value) || 0)}
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handlePreviewSetStart}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  현재 시간을 시작으로
                </button>
                <button
                  type="button"
                  onClick={handlePreviewSetEnd}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  현재 시간을 끝으로
                </button>
                <button
                  type="button"
                  onClick={handlePreviewPlaySegment}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: "1px solid #1976d2",
                    backgroundColor: "#1976d2",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 12,
                    marginLeft: "auto",
                  }}
                >
                  구간 재생
                </button>
              </div>
            </div>
          )}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>설명</span>
            <input
              type="text"
              value={videoForm.description}
              onChange={(e) =>
                setVideoForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="예: 기본 속도, 느린 버전 등"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>수어자</span>
            <input
              type="text"
              value={videoForm.signer}
              onChange={(e) => setVideoForm((prev) => ({ ...prev, signer: e.target.value }))}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>태그 (쉼표로 구분)</span>
            <input
              type="text"
              value={videoForm.tags}
              onChange={(e) => setVideoForm((prev) => ({ ...prev, tags: e.target.value }))}
            />
          </label>
          <button
            type="submit"
            disabled={videoSaving}
            style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #1976d2",
              backgroundColor: "#1976d2",
              color: "white",
              cursor: "pointer",
            }}
          >
            {videoSaving ? "저장 중..." : "영상 추가"}
          </button>
          {videoMessage && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: videoMessage.startsWith("오류") ? "red" : "#1976d2",
              }}
            >
              {videoMessage}
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
