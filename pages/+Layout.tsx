import "./Layout.css";
import { useState } from "react";
import logoUrl from "../assets/logo.svg";
import { Link } from "../components/Link";
import { GOOGLE_SHEET_URL, GOOGLE_DRIVE_FOLDER_URL } from "../lib/signwordConfig";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      id="layout-root"
      className={sidebarOpen ? "sidebar-open" : ""}
      style={{
        display: "flex",
        maxWidth: 1000,
        margin: "auto",
      }}
    >
      <Sidebar>
        <Logo />
        <Link href="/">수어 단어장</Link>
        <Link href="/admin">단어·영상 추가</Link>
        <a href={GOOGLE_SHEET_URL} target="_blank" rel="noreferrer">
          단어 데이터 시트 열기
        </a>
        <a href={GOOGLE_DRIVE_FOLDER_URL} target="_blank" rel="noreferrer">
          수어 영상 드라이브 열기
        </a>
      </Sidebar>
      <Content
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        isSidebarOpen={sidebarOpen}
      >
        {children}
      </Content>
      {sidebarOpen && (
        <div
          id="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="sidebar"
      style={{
        padding: 20,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        lineHeight: "1.6em",
        borderRight: "2px solid #eee",
        backgroundColor: "#fafafa",
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
}

function Content({
  children,
  onToggleSidebar,
  isSidebarOpen,
}: {
  children: React.ReactNode;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}) {
  return (
    <div id="page-container">
      <div
        id="page-content"
        style={{
          padding: 20,
          paddingBottom: 50,
          minHeight: "100vh",
        }}
      >
        <button
          id="mobile-menu-toggle"
          type="button"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          ☰
        </button>
        {children}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div
      style={{
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      <a href="/">
        <img src={logoUrl} height={64} width={64} alt="logo" />
      </a>
      <div
        style={{
          marginTop: 8,
          fontWeight: 600,
        }}
      >
        SignWord
      </div>
    </div>
  );
}
