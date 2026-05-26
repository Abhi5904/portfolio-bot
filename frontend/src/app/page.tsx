import { SiteNavbar } from "@/components/layout/site-navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/landing/hero";

export default function HomePage() {
  return (
    <>
      <SiteNavbar />
      <main className="flex flex-1 items-center justify-center px-4 pt-14">
        <div className="flex w-full max-w-5xl justify-center py-16 sm:py-24">
          <Hero />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
