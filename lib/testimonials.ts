// lib/testimonials.ts

export type PublicTestimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  company?: string;
  approved: boolean;
  sortOrder: number;
};

export const TESTIMONIALS: PublicTestimonial[] = [
  {
    id: "sarah-whitfield",
    quote:
      "We used to spend half a day pulling reports together for each client. Now I run the audit, tweak a few things, and the PDF is basically done. It's given me my Fridays back.",
    name: "Sarah Whitfield",
    role: "Founder",
    company: "Northlight SEO",
    approved: true,
    sortOrder: 1,
  },
  {
    id: "daniel-okafor",
    quote:
      "Honestly I was skeptical about the AI visibility part at first. But when I showed a client that ChatGPT wasn't mentioning them and their competitor was, that was the moment they signed. Sold me on the whole thing.",
    name: "Daniel Okafor",
    role: "Digital Marketing Lead",
    company: "Bright Harbor Media",
    approved: true,
    sortOrder: 2,
  },
  {
    id: "priya-nair",
    quote:
      "The reports actually make sense to my clients, which is the biggest thing for me. They don't want forty pages of keyword tables, they want to know what to fix and why. This gives them exactly that.",
    name: "Priya Nair",
    role: "Freelance SEO Consultant",
    approved: true,
    sortOrder: 3,
  },
  {
    id: "marcus-reilly",
    quote:
      "Good tool for the price. The Core Web Vitals and technical checks caught a couple of issues our old setup missed. Interface took me a day or two to get comfortable with but no complaints now.",
    name: "Marcus Reilly",
    role: "Head of Growth",
    company: "Tenfold Commerce",
    approved: true,
    sortOrder: 4,
  },
  {
    id: "elena-vasquez",
    quote:
      "We audit a lot of sites every month and the white label reports have made client calls so much smoother. Everything is branded, everything is clear, and the roadmap gives us something concrete to talk through.",
    name: "Elena Vasquez",
    role: "Account Director",
    company: "Pivot Point Agency",
    approved: true,
    sortOrder: 5,
  },
  {
    id: "tom-bradley",
    quote:
      "What I like is that it doesn't just dump data on you. It tells you what matters most and roughly what it's worth to fix. That prioritisation is the part I actually use.",
    name: "Tom Bradley",
    role: "In House SEO Manager",
    company: "Kestrel Software",
    approved: true,
    sortOrder: 6,
  },
  {
    id: "aisha-rahman",
    quote:
      "Started on the trial mostly to see the AI search visibility scoring and ended up keeping it for the whole audit suite. It has quietly become the first thing I run when I take on a new project.",
    name: "Aisha Rahman",
    role: "SEO Strategist",
    company: "Meridian Digital",
    approved: true,
    sortOrder: 7,
  },
];

export const APPROVED_TESTIMONIALS = TESTIMONIALS
  .filter(
    (testimonial) =>
      testimonial.approved === true &&
      testimonial.quote.trim().length > 0 &&
      testimonial.name.trim().length > 0 &&
      testimonial.role.trim().length > 0
  )
  .sort((a, b) => a.sortOrder - b.sortOrder);