const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"]);

// Accepts watch, share, and embed URL shapes and returns a canonical embed
// URL, or null if the host/format isn't a supported YouTube video link.
export function toYouTubeEmbedUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (!YOUTUBE_HOSTS.has(url.hostname)) return null;

  let videoId: string | null = null;
  if (url.hostname === "youtu.be") {
    videoId = url.pathname.slice(1).split("/")[0] || null;
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else if (url.pathname.startsWith("/embed/")) {
    videoId = url.pathname.split("/")[2] || null;
  } else if (url.pathname.startsWith("/shorts/")) {
    videoId = url.pathname.split("/")[2] || null;
  }

  if (!videoId || !/^[\w-]{11}$/.test(videoId)) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}
