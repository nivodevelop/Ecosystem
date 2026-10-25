import { fileUrl } from "@/lib/urls";

export function AppIcon({ path, title, size = 40 }: { path: string | null; title: string; size?: number }) {
  const url = fileUrl(path);
  const style = { width: size, height: size, borderRadius: size * 0.24 };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className="shrink-0 object-cover ring-1 ring-white/10" />;
  }
  return (
    <div
      style={{ ...style, fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center bg-gradient-to-br from-panel-3 to-line-strong font-semibold text-muted ring-1 ring-white/10"
    >
      {title.slice(0, 1).toUpperCase()}
    </div>
  );
}
