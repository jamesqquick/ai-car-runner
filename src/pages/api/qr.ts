import type { APIRoute } from "astro";
import qrcode from "qrcode-generator";

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get("url");
  if (!target) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const qr = qrcode(0, "M");
    qr.addData(target);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const cellSize = 4;
    const margin = cellSize;
    const size = moduleCount * cellSize + margin * 2;
    const fill = "#f97316";

    let paths = "";
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          const x = col * cellSize + margin;
          const y = row * cellSize + margin;
          paths += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}"/>`;
        }
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="200" height="200">${paths}</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Failed to generate QR code", { status: 500 });
  }
};
