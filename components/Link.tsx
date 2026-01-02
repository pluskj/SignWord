export function Link({ href, children }: { href: string; children: string }) {
  const currentHash = typeof window !== "undefined" ? window.location.hash : "";
  const currentPath = currentHash.startsWith("#") ? currentHash.slice(1) : "/";
  const isActive = href === "/" ? currentPath === href : currentPath.startsWith(href);
  const target = `#${href}`;
  return (
    <a href={target} className={isActive ? "is-active" : undefined}>
      {children}
    </a>
  );
}
