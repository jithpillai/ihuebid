import { describe, expect, it } from "vitest";

import { toYouTubeEmbedUrl } from "./embed-validation";

describe("toYouTubeEmbedUrl", () => {
  it("normalizes a standard watch URL", () => {
    expect(toYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("normalizes a shortened youtu.be URL", () => {
    expect(toYouTubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("normalizes an existing embed URL", () => {
    expect(toYouTubeEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("normalizes a shorts URL", () => {
    expect(toYouTubeEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("rejects a non-YouTube host", () => {
    expect(toYouTubeEmbedUrl("https://vimeo.com/12345")).toBeNull();
  });

  it("rejects a malformed URL", () => {
    expect(toYouTubeEmbedUrl("not a url")).toBeNull();
  });

  it("rejects a YouTube URL with no video id", () => {
    expect(toYouTubeEmbedUrl("https://www.youtube.com/watch")).toBeNull();
  });
});
