const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    if (path === "/") {
      path = "/index.html";
    }

    const filePath = path.startsWith("/") ? `.${path}` : path;

    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();

      if (!exists) {
        return new Response("Not Found", { status: 404 });
      }

      if (filePath.endsWith(".ts")) {
        const result = await Bun.build({
          entrypoints: [filePath],
          format: "esm",
          sourcemap: "inline",
        });
        if (result.success && result.outputs.length > 0) {
          const js = await result.outputs[0].text();
          return new Response(js, {
            headers: { "Content-Type": "application/javascript" },
          });
        }
        return new Response("Build failed", { status: 500 });
      }

      const contentType = getContentType(filePath);
      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    } catch {
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

function getContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: "text/html",
    js: "application/javascript",
    ts: "application/javascript",
    css: "text/css",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
  };
  return types[ext || ""] || "application/octet-stream";
}

console.log(`Server running at http://localhost:${server.port}`);
