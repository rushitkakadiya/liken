import type { Look } from "@/lib/auth";

export function colorNameFor(
  name: string | undefined,
  family: string | undefined,
  garment: string,
): string {
  if (name?.trim()) return name.trim();
  if (family?.trim()) return family.trim();
  return garment.trim();
}

export function enrichLookColorNames(look: Look): Look {
  return {
    ...look,
    topColorName: colorNameFor(look.topColorName, look.topColorFamily, look.top),
    bottomColorName: colorNameFor(look.bottomColorName, look.bottomColorFamily, look.bottom),
  };
}
