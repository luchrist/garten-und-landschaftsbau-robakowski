import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Leistungen } from "@/components/Leistungen";
import { Referenzen } from "@/components/Referenzen";
import { AssistentTeaser } from "@/components/AssistentTeaser";
import { Vertrauen } from "@/components/Vertrauen";
import { Reviews } from "@/components/Reviews";
import { Einsatzgebiet } from "@/components/Einsatzgebiet";
import { Galerie } from "@/components/Galerie";
import { RecruitingTeaser } from "@/components/RecruitingTeaser";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ overflowX: "clip" }}>
      <Navbar />
      <Hero />
      <Leistungen />
      <Referenzen />
      <AssistentTeaser />
      <Vertrauen />
      <Einsatzgebiet />
      <Reviews />
      <Galerie />
      <RecruitingTeaser />
      <Footer />
    </main>
  );
}
