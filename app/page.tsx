import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Leistungen } from "@/components/Leistungen";
import { Referenzen } from "@/components/Referenzen";
import { Arbeitsweise } from "@/components/Arbeitsweise";
import { Reviews } from "@/components/Reviews";
import { Einsatzgebiet } from "@/components/Einsatzgebiet";
import { Galerie } from "@/components/Galerie";
import { RecruitingTeaser } from "@/components/RecruitingTeaser";
import { WhatsappFloat } from "@/components/WhatsappFloat";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ overflowX: "clip" }}>
      <Navbar />
      <Hero />
      <Leistungen />
      <Referenzen />
      <Arbeitsweise />
      <Einsatzgebiet />
      <Reviews />
      <Galerie />
      <RecruitingTeaser />
      <Footer />
      <WhatsappFloat />
    </main>
  );
}
