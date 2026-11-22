/** Identitas studio. Samakan dengan data/structure.ts di web utama bila berubah. */
export const siteConfig = {
  name: "SoTeen Studio",
  blogLabel: "Blog",
  postsPerPage: 9,
  commentMaxLength: 1000,
  commentsLimit: 200,
} as const;

export type SocialIcon = "linkedin" | "github" | "instagram";

export const socialLinks: { label: string; href: string; icon: SocialIcon }[] = [
  { label: "LinkedIn", href: "#", icon: "linkedin" },
  { label: "GitHub", href: "https://github.com/soteenstudio", icon: "github" },
  { label: "Instagram", href: "https://instagram.com/soteenstudio", icon: "instagram" },
];

export const legalLinks = [
  { id: "privacy", href: "https://policies.soteenstudio.my.id/privacy" },
  { id: "terms", href: "https://policies.soteenstudio.my.id/terms" },
  { id: "cookies", href: "https://policies.soteenstudio.my.id/cookies" },
] as const;

/** Saran untuk kolom profesi (bebas diisi lain). Tidak mengikat. */
export const professionSuggestions = [
  "Game Designer",
  "Systems Engineer",
  "Frontend Developer",
  "Backend Developer",
  "UI/UX Designer",
  "3D Artist",
  "Community Manager",
];
