import { useEffect, useRef, useState, type CSSProperties } from "react";
import { signedUrl } from "@/lib/supabase";

type SignedMediaProps = {
  path: string; bucket?: string; type: "photo" | "video"; alt: string; className?: string;
  loading?: "eager" | "lazy"; decoding?: "async" | "auto" | "sync"; controls?: boolean;
  autoPlay?: boolean; muted?: boolean; playsInline?: boolean; preload?: "none" | "metadata" | "auto";
  style?: CSSProperties;
};

/** Signs private media paths on demand and renews an expired URL once. */
export function SignedMedia({
  path, bucket = "profile-media", type, alt, className, loading = "lazy",
  decoding = "async", controls = false, autoPlay = false, muted = false,
  playsInline = true, preload = "metadata", style,
}: SignedMediaProps) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const retryCount = useRef(0);

  useEffect(() => {
    let cancelled = false;
    retryCount.current = 0;
    setUrl("");
    setFailed(false);
    void signedUrl(path, bucket).then((nextUrl) => {
      if (!cancelled) setUrl(nextUrl);
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => { cancelled = true; };
  }, [path, bucket]);

  async function renew() {
    if (retryCount.current >= 1) { setFailed(true); return; }
    retryCount.current += 1;
    setUrl("");
    try { setUrl(await signedUrl(path, bucket)); }
    catch { setFailed(true); }
  }

  if (failed) return (
    <span className={`signed-media-fallback${className ? ` ${className}` : ""}`} role="img" aria-label={alt}>
      Mídia indisponível
    </span>
  );
  if (!url) return (
    <span className={`signed-media-fallback is-loading${className ? ` ${className}` : ""}`} aria-hidden="true">
      Carregando mídia…
    </span>
  );

  return type === "photo" ? (
    <img className={className} style={style} src={url} alt={alt} loading={loading} decoding={decoding} onError={() => void renew()} />
  ) : (
    <video key={url} className={className} style={style} src={url} controls={controls} autoPlay={autoPlay}
      muted={muted} playsInline={playsInline} preload={preload} aria-label={alt} onError={() => void renew()} />
  );
}
