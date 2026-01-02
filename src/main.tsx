import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import Layout from "../pages/+Layout";
import IndexPage from "../pages/index/+Page";
import AdminPage from "../pages/admin/+Page";
import WordPage from "../pages/word/@id/+Page";
import { fetchSignWords, type SignWordEntry } from "../lib/signwordData";

type Route =
  | { name: "home" }
  | { name: "admin" }
  | { name: "word"; wordId: string };

function parseRoute(hash: string): Route {
  const raw = hash || "";
  const value = raw.startsWith("#") ? raw.slice(1) : raw;
  const path = value || "/";
  if (path === "/") {
    return { name: "home" };
  }
  if (path === "/admin") {
    return { name: "admin" };
  }
  if (path.startsWith("/word/")) {
    const parts = path.split("/");
    const id = parts[2] || "";
    if (id) {
      return { name: "word", wordId: id };
    }
  }
  return { name: "home" };
}

function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const [entries, setEntries] = useState<SignWordEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => {
      setRoute(parseRoute(window.location.hash));
    };
    window.addEventListener("hashchange", handler);
    return () => {
      window.removeEventListener("hashchange", handler);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchSignWords();
        if (cancelled) {
          return;
        }
        setEntries(list);
        setErrorMessage(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setErrorMessage(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedEntry = useMemo(() => {
    if (route.name !== "word") {
      return undefined;
    }
    return entries.find((entry) => entry.wordId === route.wordId);
  }, [entries, route]);

  let page = null;

  if (route.name === "admin") {
    page = (
      <AdminPage
        entries={entries}
        errorMessage={errorMessage}
        loading={loading}
      />
    );
  } else if (route.name === "word") {
    page = (
      <WordPage
        entry={selectedEntry}
        errorMessage={errorMessage}
        loading={loading}
      />
    );
  } else {
    page = (
      <IndexPage
        entries={entries}
        errorMessage={errorMessage}
        loading={loading}
      />
    );
  }

  return <Layout>{page}</Layout>;
}

const container = document.getElementById("root");

if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

