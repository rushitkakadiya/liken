import type { Look } from "./auth";
import { enrichLookColorNames } from "./lookColors";

type PaletteItem = {
  top: string;
  bottom: string;
  topColor: string;
  bottomColor: string;
  topColorName: string;
  bottomColorName: string;
  topColorFamily: string;
  bottomColorFamily: string;
  explanation: string;
};

const palettes: Record<string, PaletteItem[]> = {
  Casual: [
    {
      top: "Oxford Shirt",
      bottom: "Chinos",
      topColor: "#1f2a44",
      bottomColor: "#d8c3a5",
      topColorName: "Midnight Navy",
      bottomColorName: "Sand Beige",
      topColorFamily: "Blue",
      bottomColorFamily: "Neutral",
      explanation: "Navy gives clean contrast while beige keeps the look soft and balanced.",
    },
    {
      top: "Crew Neck Tee",
      bottom: "Linen Trousers",
      topColor: "#4b5320",
      bottomColor: "#f5ecd9",
      topColorName: "Olive Drab",
      bottomColorName: "Soft Cream",
      topColorFamily: "Green",
      bottomColorFamily: "Neutral",
      explanation: "Earthy tones suit warm undertones beautifully for relaxed weekends.",
    },
  ],
  Office: [
    {
      top: "Dress Shirt",
      bottom: "Tailored Trousers",
      topColor: "#f5f5f5",
      bottomColor: "#2b2b2b",
      topColorName: "Crisp White",
      bottomColorName: "Charcoal Grey",
      topColorFamily: "Neutral",
      bottomColorFamily: "Grey",
      explanation: "Timeless contrast that reads sharp, confident and professional.",
    },
    {
      top: "Button-Down Shirt",
      bottom: "Slim Trousers",
      topColor: "#c9dbe8",
      bottomColor: "#1c2a44",
      topColorName: "Powder Blue",
      bottomColorName: "Deep Navy",
      topColorFamily: "Blue",
      bottomColorFamily: "Blue",
      explanation: "Blue-on-blue balances polish with personality.",
    },
  ],
  "Date Night": [
    {
      top: "Knit Polo",
      bottom: "Dark Wash Jeans",
      topColor: "#0f0f0f",
      bottomColor: "#1b2845",
      topColorName: "Onyx Black",
      bottomColorName: "Dark Indigo",
      topColorFamily: "Black",
      bottomColorFamily: "Blue",
      explanation: "Monochrome dark feels effortlessly modern and sharp.",
    },
    {
      top: "Silk Shirt",
      bottom: "Tailored Trousers",
      topColor: "#5a1a2b",
      bottomColor: "#0d0d0d",
      topColorName: "Deep Maroon",
      bottomColorName: "Jet Black",
      topColorFamily: "Red",
      bottomColorFamily: "Black",
      explanation: "Maroon adds warmth and intimacy without trying too hard.",
    },
  ],
  Wedding: [
    {
      top: "Embroidered Kurta",
      bottom: "Linen Trousers",
      topColor: "#f5ecd9",
      bottomColor: "#d8c3a5",
      topColorName: "Ivory Cream",
      bottomColorName: "Sand Beige",
      topColorFamily: "Neutral",
      bottomColorFamily: "Neutral",
      explanation: "Soft warm neutrals photograph beautifully in golden hour ceremonies.",
    },
    {
      top: "Silk Shirt",
      bottom: "Formal Trousers",
      topColor: "#0f6e4f",
      bottomColor: "#0d0d0d",
      topColorName: "Emerald Green",
      bottomColorName: "Jet Black",
      topColorFamily: "Green",
      bottomColorFamily: "Black",
      explanation: "Jewel-tone emerald reads festive and refined for evening celebrations.",
    },
  ],
  Party: [
    {
      top: "Silk Shirt",
      bottom: "Slim Trousers",
      topColor: "#0d0d0d",
      bottomColor: "#0d0d0d",
      topColorName: "Onyx Black",
      bottomColorName: "Onyx Black",
      topColorFamily: "Black",
      bottomColorFamily: "Black",
      explanation: "All-black reads bold, modern and effortless.",
    },
    {
      top: "Graphic Tee",
      bottom: "Black Jeans",
      topColor: "#5e1f2b",
      bottomColor: "#0d0d0d",
      topColorName: "Burgundy Wine",
      bottomColorName: "Jet Black",
      topColorFamily: "Red",
      bottomColorFamily: "Black",
      explanation: "Rich burgundy adds depth under low party lighting.",
    },
  ],
  Interview: [
    {
      top: "Dress Shirt",
      bottom: "Suit Trousers",
      topColor: "#f5f5f5",
      bottomColor: "#1c2a44",
      topColorName: "Crisp White",
      bottomColorName: "Deep Navy",
      topColorFamily: "Neutral",
      bottomColorFamily: "Blue",
      explanation: "Clean, classic and quietly confident — the safest power combo.",
    },
    {
      top: "Poplin Shirt",
      bottom: "Tailored Trousers",
      topColor: "#cfcfcf",
      bottomColor: "#2b2b2b",
      topColorName: "Light Grey",
      bottomColorName: "Charcoal Grey",
      topColorFamily: "Grey",
      bottomColorFamily: "Grey",
      explanation: "Tonal greys feel modern and approachable without losing authority.",
    },
  ],
};

export function generateOutfit(occasion: string): Look {
  const pool = palettes[occasion] || palettes.Casual;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const score = 88 + Math.floor(Math.random() * 11);
  return enrichLookColorNames({
    id: crypto.randomUUID(),
    ...pick,
    occasion,
    score,
    createdAt: Date.now(),
  });
}
