import { redirect } from "next/navigation";

export const metadata = {
  title: "Customer Stories | Crawler Que",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TestimonialsPage() {
  redirect("/contact");
}
