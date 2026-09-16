/**
 * Demo data: an admin account (only if none exists) and a "Tidewater Coffee" brand guideline built
 * from the full template. Strategy, Logo, Colour, Typography, Icons, Banners and Downloads are filled
 * in; the other chapters stay empty, so they appear in the editor but not to clients.
 *
 *   npm run seed              create the demo portal if it isn't there yet
 *   npm run seed -- --force   delete and rebuild it
 */
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { hashPassword } from "../src/lib/auth/password";
import { serializeBlockData } from "../src/lib/blocks";
import { db, sqlClient } from "../src/lib/db";
import {
  admins,
  agencies,
  assets,
  blocks,
  colors,
  fonts,
  pages,
  portals,
  type AssetVariant,
  type BlockType,
} from "../src/lib/db/schema";
import { storeFile } from "../src/lib/files";
import { guessPlatform } from "../src/lib/naming";
import { deletePrefix } from "../src/lib/storage";
import { guideTemplate } from "../src/lib/templates";
import { newId } from "../src/lib/utils";

const DEMO_ADMIN = { email: "demo@brandportal.local", password: "demo-admin-1234", name: "Demo Admin" };
const DEMO_SLUG = "tidewater";
const PORTAL_PASSWORD = "tidewater-demo";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const C = {
  deepSea: "#0F3D3E",
  foam: "#F4EFE6",
  crema: "#C8A27A",
  espresso: "#3B2A20",
  tide: "#2F8F83",
  coral: "#E76F51",
};

/* ---------- Artwork ---------- */

type MarkColors = { bg: string; wave: string; accent: string; steam: string };
const DARK_MARK: MarkColors = { bg: C.deepSea, wave: C.foam, accent: C.crema, steam: C.crema };
const LIGHT_MARK: MarkColors = { bg: C.foam, wave: C.deepSea, accent: C.tide, steam: C.tide };

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;

// 120×120 mark: steam over two waves inside a circle.
const mark = ({ bg, wave, accent, steam }: MarkColors) => `
  <circle cx="60" cy="60" r="56" fill="${bg}"/>
  <path d="M46 42c0-5 4-7 4-12M60 42c0-5 4-7 4-12M74 42c0-5 4-7 4-12" fill="none" stroke="${steam}" stroke-width="4" stroke-linecap="round"/>
  <path d="M24 62c6-6 12-6 18 0s12 6 18 0 12-6 18 0 12 6 18 0" fill="none" stroke="${wave}" stroke-width="7" stroke-linecap="round"/>
  <path d="M24 80c6-6 12-6 18 0s12 6 18 0 12-6 18 0 12 6 18 0" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>`;

const wordmark = (x: number, y: number, fg: string, sub: string, anchor: "start" | "middle" = "start") => `
  <text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Georgia, 'Times New Roman', serif" font-size="58" font-weight="700" letter-spacing="-1" fill="${fg}">Tidewater</text>
  <text x="${anchor === "start" ? x + 3 : x}" y="${y + 32}" text-anchor="${anchor}" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="6" fill="${sub}">COFFEE CO.</text>`;

const logos = {
  primary: svg(540, 140, `<g transform="translate(10 10)">${mark(DARK_MARK)}</g>${wordmark(150, 80, C.deepSea, C.tide)}`),
  reversed: svg(540, 140, `<g transform="translate(10 10)">${mark(LIGHT_MARK)}</g>${wordmark(150, 80, C.foam, C.crema)}`),
  stacked: svg(360, 290, `<g transform="translate(120 10)">${mark(DARK_MARK)}</g>${wordmark(180, 200, C.deepSea, C.tide, "middle")}`),
  mark: svg(120, 120, mark(DARK_MARK)),
};

const ICONS: [name: string, category: string, paths: string][] = [
  ["Coffee cup", "Menu", '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v3M12 3v3"/>'],
  ["Coffee bean", "Menu", '<ellipse cx="12" cy="12" rx="6" ry="8.5" transform="rotate(40 12 12)"/><path d="M8 17c2.5-1.5 2-4.5 4-6s3.5-2.5 4-5"/>'],
  ["Cold brew", "Menu", '<path d="M7 3h10l-1.5 18h-7L7 3Z"/><path d="M7.5 8h9M10 12l1.5 1.5M13 15l1 1"/>'],
  ["Leaf", "Values", '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l8-8"/>'],
  ["Wave", "Values", '<path d="M2 9q2.5-3 5 0t5 0 5 0 5 0"/><path d="M2 15q2.5-3 5 0t5 0 5 0 5 0"/>'],
  ["Sun", "Values", '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
  ["Location", "Store", '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>'],
  ["Opening hours", "Store", '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
  ["Shopping bag", "Store", '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'],
  ["Mobile order", "Store", '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>'],
  ["Delivery", "Store", '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/>'],
  ["Favourite", "Account", '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10Z"/>'],
  ["Rewards", "Account", '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>'],
  ["Gift card", "Account", '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1"/>'],
];

const iconSvg = (paths: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${C.deepSea}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

function bannerSvg(width: number, height: number, withText = true) {
  const w = (f: number) => Math.round(width * f);
  const h = (f: number) => Math.round(height * f);
  const waves = `
    <path d="M0 ${h(0.74)} C ${w(0.25)} ${h(0.64)} ${w(0.55)} ${h(0.88)} ${width} ${h(0.7)} V ${height} H 0 Z" fill="${C.tide}" opacity=".6"/>
    <path d="M0 ${h(0.86)} C ${w(0.3)} ${h(0.78)} ${w(0.62)} ${h(0.97)} ${width} ${h(0.84)} V ${height} H 0 Z" fill="${C.crema}"/>`;

  let content = "";
  if (withText) {
    const headlineAttrs = `font-family="Georgia, 'Times New Roman', serif" font-weight="700" fill="${C.foam}"`;
    const subAttrs = `font-family="Helvetica, Arial, sans-serif" font-weight="700" fill="${C.crema}"`;
    if (width / height > 1.8) {
      const size = h(0.34);
      const mx = w(0.06);
      const my = h(0.14);
      const fs = Math.round(Math.min(height * 0.19, width * 0.05));
      const tx = mx + size + w(0.03);
      content = `
        <g transform="translate(${mx} ${my}) scale(${size / 120})">${mark(LIGHT_MARK)}</g>
        <text x="${tx}" y="${Math.round(my + size * 0.58)}" font-size="${fs}" ${headlineAttrs}>Tide in, cup up.</text>
        <text x="${tx + 2}" y="${Math.round(my + size * 0.95)}" font-size="${Math.round(fs * 0.3)}" letter-spacing="${Math.round(fs * 0.08)}" ${subAttrs}>TIDEWATER COFFEE CO.</text>`;
    } else {
      const size = w(0.26);
      const fs = w(0.085);
      const top = h(height > width ? 0.3 : 0.16);
      const cx = w(0.5);
      content = `
        <g transform="translate(${cx - size / 2} ${top}) scale(${size / 120})">${mark(LIGHT_MARK)}</g>
        <text x="${cx}" y="${Math.round(top + size + fs * 1.3)}" text-anchor="middle" font-size="${fs}" ${headlineAttrs}>Tide in, cup up.</text>
        <text x="${cx}" y="${Math.round(top + size + fs * 2.05)}" text-anchor="middle" font-size="${Math.round(fs * 0.3)}" letter-spacing="${Math.round(fs * 0.08)}" ${subAttrs}>TIDEWATER COFFEE CO.</text>`;
    }
  }
  return svg(width, height, `<rect width="${width}" height="${height}" fill="${C.deepSea}"/>${waves}${content}`);
}

const example = (bg: string, inner: string) => svg(600, 400, `<rect width="600" height="400" fill="${bg}"/>${inner}`);
const stripes = Array.from(
  { length: 18 },
  (_, i) => `<rect x="${i * 44 - 120}" y="-120" width="22" height="640" fill="${C.coral}" opacity=".35" transform="rotate(20 300 200)"/>`,
).join("");

const examples = {
  clearSpace: example(
    C.foam,
    `<rect x="190" y="90" width="220" height="220" fill="none" stroke="${C.tide}" stroke-width="2" stroke-dasharray="8 8"/><g transform="translate(240 140)">${mark(DARK_MARK)}</g>`,
  ),
  reversed: example(C.deepSea, `<g transform="translate(50 130)">${mark(LIGHT_MARK)}</g>${wordmark(190, 200, C.foam, C.crema)}`),
  stretched: example(C.foam, `<g transform="translate(300 200) scale(1.9 0.8) translate(-60 -60)">${mark(DARK_MARK)}</g>`),
  busy: example(
    C.crema,
    `${stripes}<g transform="translate(240 140)">${mark({ bg: C.foam, wave: C.crema, accent: "#E9D8C0", steam: C.crema })}</g>`,
  ),
};

/** A tiny, valid single-page PDF using the built-in Helvetica font. */
function simplePdf(lines: string[]) {
  const escape = (text: string) => text.replace(/[\\()]/g, (c) => `\\${c}`);
  const stream = [
    "BT",
    "/F1 22 Tf",
    "72 740 Td",
    `(${escape(lines[0])}) Tj`,
    "/F1 12 Tf",
    ...lines.slice(1).flatMap((line) => ["0 -28 Td", `(${escape(line)}) Tj`]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

const fileSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-");

/* ---------- Seeding ---------- */

type Items = {
  asset(
    name: string,
    filename: string,
    data: string | Uint8Array,
    extra?: { variant?: AssetVariant; groupLabel?: string; description?: string },
  ): Promise<void>;
  color(name: string, hex: string, pantone: string, usage?: string): Promise<void>;
  googleFont(family: string, weights: string, usage?: string): Promise<void>;
};
type SeedBlock = { type: BlockType; data?: Record<string, unknown>; fill?: (items: Items) => Promise<void> };
type SeedPage = { intro: string; buttonLabel?: string; blocks: SeedBlock[] };

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "1") {
    throw new Error("Demo seed is disabled. Use a development database and set ALLOW_DEMO_SEED=1 explicitly.");
  }
  const force = process.argv.includes("--force");

  let [admin] = await db.select().from(admins).limit(1);
  let createdAdmin = false;
  if (!admin) {
    const agencyId = newId();
    await db.insert(agencies).values({ id: agencyId, name: "Northstar Studio" });
    [admin] = await db
      .insert(admins)
      .values({
        id: newId(),
        agencyId,
        email: DEMO_ADMIN.email,
        name: DEMO_ADMIN.name,
        passwordHash: await hashPassword(DEMO_ADMIN.password),
      })
      .returning();
    createdAdmin = true;
  }
  const agencyId = admin.agencyId;

  const existing = await db.query.portals.findFirst({ where: eq(portals.slug, DEMO_SLUG) });
  if (existing && !force) {
    console.log(`Demo portal already exists at ${APP_URL}/p/${DEMO_SLUG}. Run "npm run seed -- --force" to rebuild it.`);
    return;
  }
  if (existing) {
    await db.delete(portals).where(eq(portals.id, existing.id));
    await deletePrefix(`portals/${existing.id}`);
  }

  const portalId = newId();
  await db.insert(portals).values({
    id: portalId,
    agencyId,
    clientName: "Tidewater Coffee",
    slug: DEMO_SLUG,
    tagline: "Small-batch coffee, roasted by the sea.",
    accentColor: C.deepSea,
    guideTitle: "Tidewater Visual Identity\nBrand Guidelines 2026",
    accessMode: "password",
    passwordHash: await hashPassword(PORTAL_PASSWORD),
    isPublished: true,
  });

  const upload = (name: string, data: string | Uint8Array) =>
    storeFile({ agencyId, portalId, name, data: typeof data === "string" ? Buffer.from(data) : data });
  const png = (source: string) => sharp(Buffer.from(source)).png().toBuffer();

  const logoFile = await upload("tidewater-logo.svg", logos.primary);
  await db.update(portals).set({ logoFileId: logoFile.id }).where(eq(portals.id, portalId));

  function itemsFor(blockId: string, type: BlockType): Items {
    let position = 0;
    return {
      async asset(name, filename, data, extra = {}) {
        const file = await upload(filename, data);
        await db.insert(assets).values({
          id: newId(),
          portalId,
          blockId,
          fileId: file.id,
          name,
          description: extra.description ?? "",
          variant: extra.variant ?? "default",
          groupLabel:
            extra.groupLabel ?? (type === "banners" && file.width && file.height ? guessPlatform(file.width, file.height) : ""),
          position: position++,
        });
      },
      async color(name, hex, pantone, usage = "") {
        await db.insert(colors).values({ id: newId(), portalId, blockId, name, hex, pantone, usage, position: position++ });
      },
      async googleFont(family, weights, usage = "") {
        await db.insert(fonts).values({ id: newId(), portalId, blockId, family, source: "google", weights, usage, position: position++ });
      },
    };
  }

  const content: Record<string, SeedPage> = {
    strategy: {
      intro:
        "Great coffee brands grow from the inside out. Everything we make, from the roast to the cup to the words on the bag, should feel warm, unhurried and a little salty.",
      blocks: [
        {
          type: "text",
          data: {
            size: "lg",
            label: "Tide in, cup up",
            sublabel: "Brand Concept",
            body: "Our identity takes its rhythm from the tide: two waves for the coast we roast beside, and a curl of steam for the cup in your hand.\n\nEvery element should feel calm and considered, never loud.",
          },
        },
        {
          type: "text",
          data: {
            size: "lg",
            label: "Coffee worth slowing down for",
            sublabel: "Mission",
            body: "We roast small batches of seasonal coffee and serve it with the care of a neighbourhood café, in our shops and at home.",
          },
        },
        { type: "text", data: { size: "lg", label: "Why we exist", sublabel: "Purpose", body: "Make the first ten minutes of the day the best ten minutes." } },
        { type: "text", data: { size: "lg", label: "Where we're going", sublabel: "Vision", body: "The coastal café everyone wishes was on their street." } },
        {
          type: "cards",
          data: {
            size: "lg",
            label: "How we work",
            sublabel: "Brand Values",
            columns: 3,
            items: [
              { title: "Craft", body: "We roast in small batches and taste every one. If it isn't good enough to serve, it isn't good enough to sell." },
              { title: "Warmth", body: "Regulars, first-timers and online customers all get the same friendly welcome and the same patience." },
              { title: "Place", body: "We're proud of our stretch of coast: local suppliers, local faces and the sea in everything we make." },
              { title: "Honesty", body: "Clear prices, clear sourcing and plain words. No jargon on the bag or on the board." },
              { title: "Patience", body: "Good coffee takes time. So do good relationships with growers, staff and customers." },
              { title: "Care", body: "For the people who grow our beans, the planet they grow on, and the cup in front of you." },
            ],
          },
        },
        {
          type: "text",
          data: {
            size: "lg",
            label: "How we show up in the world",
            sublabel: "Personality",
            body: "Warm, Unhurried, Salty, Curious, Kind\n\nWe write like a friendly barista who knows the tide tables: short sentences, plain words and the occasional wink.",
          },
        },
        { type: "text", data: { size: "lg", label: "Core Emotion", sublabel: "How customers feel", body: "Calm, Welcomed, Awake, Looked after" } },
      ],
    },
    logo: {
      intro:
        "The Tidewater logo pairs our tide mark with a warm serif wordmark. Use the versions below exactly as supplied, with room to breathe and enough contrast to read clearly.",
      buttonLabel: "Download Logos",
      blocks: [
        {
          type: "media",
          data: { divider: false, columns: 1, background: "dark", downloadable: false },
          fill: (i) => i.asset("Reversed logo", "tidewater-reversed-hero.svg", logos.reversed, { variant: "light" }),
        },
        {
          type: "media",
          data: {
            label: "Logo",
            body: "Our logo is the visual shorthand for the brand. Use it on packaging, signage, the website and anywhere people meet us for the first time.",
            columns: 1,
          },
          fill: (i) => i.asset("Primary logo", "tidewater-primary.svg", logos.primary),
        },
        {
          type: "media",
          data: {
            label: "Brand mark",
            body: "The tide mark can stand alone where space is tight or the brand is already clear: app icons, social avatars and cup sleeves.",
            columns: 1,
          },
          fill: (i) => i.asset("Brand mark", "tidewater-mark.svg", logos.mark),
        },
        {
          type: "media",
          data: { label: "Logo suite", body: "Alternate versions for different spaces and formats.", columns: 3, aspect: "3/2" },
          fill: async (i) => {
            await i.asset("Primary logo", "tidewater-primary.svg", logos.primary);
            await i.asset("Stacked logo", "tidewater-stacked.svg", logos.stacked);
            await i.asset("Reversed logo", "tidewater-reversed.svg", logos.reversed, { variant: "light" });
          },
        },
        {
          type: "media",
          data: {
            label: "Clear space and misuse",
            body: "Keep clear space around the logo equal to the height of the steam lines. Never stretch it, recolor it or place it on busy backgrounds.",
            columns: 2,
            aspect: "3/2",
            background: "white",
            fit: "cover",
            downloadable: false,
          },
          fill: async (i) => {
            await i.asset("Give the logo room to breathe", "do-clear-space.svg", examples.clearSpace, {
              variant: "do",
              description: "Clear space equals the height of the steam lines.",
            });
            await i.asset("Use the reversed logo on dark colors", "do-reversed.svg", examples.reversed, {
              variant: "do",
              description: "Use the reversed logo on Deep Sea.",
            });
            await i.asset("Don't stretch the logo", "dont-stretch.svg", examples.stretched, {
              variant: "dont",
              description: "Don't stretch or squash the logo.",
            });
            await i.asset("Don't use busy backgrounds", "dont-busy.svg", examples.busy, {
              variant: "dont",
              description: "Don't place it on busy, low-contrast backgrounds.",
            });
          },
        },
      ],
    },
    colour: {
      intro: "Our palette comes straight from the coast: deep water, sea foam and the warm crema on a fresh espresso.",
      blocks: [
        {
          type: "text",
          data: {
            label: "The basics",
            body: "Lead with **Foam** for about 60% of any layout, support with **Deep Sea** for 30%, and save **Crema**, **Tide** and **Coral** for accents.\n\n### Colour selection\n\n> **Screen**\n> Use HEX or RGB values in Figma, on the web and in slides.\n\n> **Print**\n> Use CMYK or Pantone values for packaging, menus and signage.",
          },
        },
        {
          type: "colors",
          data: { label: "Core Brand Colours" },
          fill: async (i) => {
            await i.color("Foam", C.foam, "9224 C", "Main background color. Use generously.");
            await i.color("Deep Sea", C.deepSea, "5463 C", "Headlines, buttons and backgrounds.");
            await i.color("Espresso", C.espresso, "4625 C", "Body text on light backgrounds.");
          },
        },
        {
          type: "colors",
          data: { label: "Accent Colours", height: "short" },
          fill: async (i) => {
            await i.color("Crema", C.crema, "7508 C", "Warm highlights and illustration.");
            await i.color("Tide", C.tide, "7473 C", "Links and supporting graphics.");
            await i.color("Coral", C.coral, "7416 C", "Promotions and seasonal specials only.");
          },
        },
        {
          type: "pairings",
          data: {
            label: "Colour Pairings",
            body: "Always make sure there's enough contrast between colors. Use these combinations as a guide.",
            items: [
              { background: C.deepSea, foreground: C.foam },
              { background: C.foam, foreground: C.deepSea },
              { background: C.espresso, foreground: C.crema },
              { background: C.foam, foreground: C.espresso },
              { background: C.crema, foreground: C.espresso },
              { background: C.tide, foreground: "#FFFFFF" },
              { background: C.deepSea, foreground: C.crema },
              { background: C.coral, foreground: C.espresso },
            ],
          },
        },
      ],
    },
    typography: {
      intro: "Fraunces gives our headlines warmth and character. Inter keeps menus, labels and longer reads clear.",
      buttonLabel: "Download Fonts",
      blocks: [
        {
          type: "typeface",
          data: { divider: false },
          fill: async (i) => {
            await i.googleFont("Fraunces", "600", "Headlines, pull quotes and packaging.");
            await i.googleFont("Inter", "400", "Body copy, menus and interface text.");
          },
        },
        {
          type: "typescale",
          data: {
            label: "Weights & styles",
            body: "Set display type in Fraunces with tight spacing. Everything else is Inter Regular.",
            font: "Fraunces",
            items: [
              { text: "Tide in, cup up.", label: "Display · Semibold", size: 88, weight: 600 },
              { text: "Small-batch coffee, roasted by the sea.", label: "Headline · Regular", size: 40, weight: 400 },
              { text: "Seasonal single origins and our house blend, roasted every Tuesday.", label: "Subtitle · Regular", size: 22, weight: 400 },
            ],
          },
        },
        {
          type: "text",
          data: {
            label: "Setting type",
            body: "Range text left, keep lines under 70 characters, and avoid orphans and widows.\n\nUse sentence case everywhere, including headlines and buttons.",
          },
        },
      ],
    },
    icons: {
      intro: "Line icons for menus, signage and the app. Copy the SVG code or download PNGs.",
      blocks: [
        {
          type: "icons",
          data: { label: "Icon set", body: "Drawn on a 24px grid with a 1.75px stroke. Keep them in Deep Sea or Foam." },
          fill: async (i) => {
            for (const [name, category, paths] of ICONS) await i.asset(name, `${fileSlug(name)}.svg`, iconSvg(paths), { groupLabel: category });
          },
        },
      ],
    },
    banners: {
      intro: "Ready-to-post artwork for every channel, sized for each platform.",
      blocks: [
        {
          type: "banners",
          data: { divider: false },
          fill: async (i) => {
            const banners: [string, number, number][] = [
              ["LinkedIn cover", 1584, 396],
              ["X header", 1500, 500],
              ["Instagram post", 1080, 1080],
              ["Instagram story", 1080, 1920],
              ["Facebook cover", 820, 312],
              ["Email header", 1200, 400],
            ];
            for (const [name, width, height] of banners) {
              await i.asset(name, `${fileSlug(name)}.png`, await png(bannerSvg(width, height)), {
                groupLabel: guessPlatform(width, height) || "Email",
              });
            }
          },
        },
      ],
    },
    downloads: {
      intro: "Templates, documents and source files.",
      blocks: [
        {
          type: "files",
          data: { divider: false },
          fill: (i) =>
            i.asset(
              "Brand one-pager",
              "tidewater-brand-one-pager.pdf",
              simplePdf([
                "Tidewater Coffee Co. - Brand one-pager",
                "Primary colors: Deep Sea #0F3D3E, Foam #F4EFE6, Crema #C8A27A",
                "Typography: Fraunces for headlines, Inter for body copy",
                "Logo: keep clear space equal to the steam lines on every side",
                "Voice: warm, unhurried and a little salty",
                "Questions? hello@tidewater.example",
              ]),
              { description: "Print-friendly summary of the brand" },
            ),
        },
      ],
    },
  };

  for (const [position, template] of guideTemplate().entries()) {
    const seeded = content[template.slug];
    const pageId = newId();
    await db.insert(pages).values({
      id: pageId,
      portalId,
      slug: template.slug,
      title: template.title,
      intro: seeded?.intro ?? "",
      buttonLabel: seeded ? (seeded.buttonLabel ?? "") : (template.buttonLabel ?? ""),
      position,
    });
    const pageBlocks: SeedBlock[] = seeded?.blocks ?? template.blocks;
    for (const [blockPosition, block] of pageBlocks.entries()) {
      const blockId = newId();
      await db.insert(blocks).values({
        id: blockId,
        portalId,
        pageId,
        type: block.type,
        data: serializeBlockData(block.type, block.data ?? {}),
        position: blockPosition,
      });
      if (block.fill) await block.fill(itemsFor(blockId, block.type));
    }
  }

  console.log("\nDemo data ready.\n");
  console.log(`  Admin dashboard   ${APP_URL}/login`);
  if (createdAdmin) console.log(`                    ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
  else console.log(`                    (sign in with your existing admin account: ${admin.email})`);
  console.log(`  Client portal     ${APP_URL}/p/${DEMO_SLUG}`);
  console.log(`                    password: ${PORTAL_PASSWORD}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => sqlClient.end());
