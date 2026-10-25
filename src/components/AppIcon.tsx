import { fileUrl } from "@/lib/urls";

export function AppIcon({ path, title, size = 40 }: { path: string | null; title: string; size?: number }) {
  const url = fileUrl(path);
  const style = { width: size, height: size, borderRadius: size * 0.22 };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className="shrink-0 border border-gray-200 object-cover" />;
  }
  return (
    <div style={style} className="flex shrink-0 items-center justify-center bg-gray-200 text-sm font-semibold text-gray-500">
      {title.slice(0, 1).toUpperCase()}
    </div>
  );
}
