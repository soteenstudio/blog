export type RevealVariant = "up" | "left" | "right" | "scale" | "fade";

/**
 * Menandai elemen agar dianimasikan saat masuk viewport (lihat skrip di BaseLayout dan global.css).
 * Pakai dengan spread: <li {...reveal(index * 90)} />
 */
export function reveal(delay = 0, variant: RevealVariant = "up") {
  return { "data-reveal": variant, style: `--reveal-delay: ${delay}ms` };
}
