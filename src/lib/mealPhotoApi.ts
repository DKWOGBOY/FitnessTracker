export interface DetectedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export class MealPhotoError extends Error {}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:image/jpeg;base64,AAAA..." - strip the data URL prefix.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Sends a meal photo to the AI for a rough ingredient guess - always meant
 * to be reviewed/edited afterward, never logged automatically (a photo
 * alone can't reveal exact weights). */
export async function analyzeMealPhoto(file: File): Promise<DetectedIngredient[]> {
  const base64 = await fileToBase64(file);
  const res = await fetch("/.netlify/functions/analyze-meal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64, mediaType: file.type }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new MealPhotoError(body.error ?? `Photo analysis failed (${res.status}).`);
  }
  const data = (await res.json()) as DetectedIngredient[];
  return data.filter((d) => d && typeof d.name === "string" && d.name.trim().length > 0);
}
