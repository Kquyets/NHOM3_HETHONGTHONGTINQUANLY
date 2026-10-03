"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Star, ArrowUpRight } from "@phosphor-icons/react";

export function SuperdesignLanding() {
  const [currentTime, setCurrentTime] = useState("11:11 PM");
  const [scrolledNav, setScrolledNav] = useState(false);
  const heroWrapperRef = useRef<HTMLDivElement>(null);
  const cardUpRef = useRef<HTMLDivElement>(null);
  const cardDownRef = useRef<HTMLDivElement>(null);

  // 1. Clock timer
  useEffect(() => {
    function updateTime() {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    }
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. Scroll effects (Nav, Parallax, Reveal)
  useEffect(() => {
    // Reveal IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      },
    );

    const revealElements = document.querySelectorAll(".reveal");
    revealElements.forEach((el) => observer.observe(el));

    // Scroll listener
    function handleScroll() {
      const scrolled = window.scrollY;

      // Nav state
      setScrolledNav(scrolled > 50);

      // Hero parallax
      if (heroWrapperRef.current && scrolled < 1000) {
        heroWrapperRef.current.style.transform = `translateY(${scrolled * 0.4}px)`;
        heroWrapperRef.current.style.opacity = `${Math.max(0, 1 - scrolled / 600)}`;
      }

      // Card parallax
      if (cardUpRef.current) {
        cardUpRef.current.style.setProperty("--scroll-offset-up", `${scrolled * -0.05}px`);
      }
      if (cardDownRef.current) {
        cardDownRef.current.style.setProperty("--scroll-offset-down", `${scrolled * 0.05}px`);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#FF4500] selection:text-white relative overflow-x-hidden">
      {/* Global Noise Overlay */}
      <div className="noise-overlay" />

      {/* Navigation */}
      <nav
        id="main-nav"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolledNav
            ? "py-4 bg-[#050505]/80 backdrop-blur-md border-b border-white/5"
            : "py-8 bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link href="/" id="nav-logo-link" className="text-2xl font-bold tracking-tighter font-serif text-white hover:text-white">
            Superdesign.
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#expertise"
              id="nav-expertise-link"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-300"
            >
              Expertise
            </a>
            <a
              href="#works"
              id="nav-works-link"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-300"
            >
              Selected Works
            </a>
            <a
              href="#perspectives"
              id="nav-perspectives-link"
              className="text-sm text-gray-400 hover:text-white transition-colors duration-300"
            >
              Perspectives
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm text-gray-300 hover:text-white transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              id="nav-cta-link"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium bg-white text-black hover:scale-105 hover:bg-gray-100 transition-all duration-300 shadow-md"
            >
              Start Project
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20 bg-[#050505]">
        {/* Background Atmosphere - HD Generated Image */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <div className="absolute top-0 left-0 w-full h-full opacity-70 mix-blend-screen">
            <img
              src="/images/hero-atmosphere.jpg"
              alt="HD Atmospheric Background"
              className="w-full h-full object-cover object-center opacity-85"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050505] z-10" />
        </div>

        {/* Floating Surrealist Elements */}
        <div className="absolute -left-[10%] top-[-10%] md:left-[-5%] md:top-[-15%] w-[50vw] md:w-[40vw] max-w-[800px] z-10 pointer-events-none mix-blend-hard-light opacity-80 animate-float-left">
          <img
            src="https://framerusercontent.com/images/KNhiA5A2ykNYqNkj04Hk6BVg5A.png?width=1540&height=1320"
            alt="Hand Reaching"
            className="w-full h-auto object-contain"
          />
        </div>

        <div className="absolute -right-[10%] bottom-[-10%] md:right-[-5%] md:bottom-[-5%] w-[45vw] md:w-[35vw] max-w-[700px] z-10 pointer-events-none mix-blend-hard-light opacity-80 animate-float-right">
          <img
            src="https://framerusercontent.com/images/X89VFCABCEjjZ4oLGa3PjbOmsA.png?width=1542&height=1002"
            alt="Hand Receiving"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Hero Content */}
        <div className="container mx-auto px-6 relative z-20 text-center flex flex-col items-center justify-center h-full">
          <div id="hero-content-wrapper" ref={heroWrapperRef} className="max-w-4xl mx-auto transition-transform duration-75">
            <div className="reveal">
              <h1
                className="text-5xl md:text-7xl font-medium leading-[1.1] tracking-tight mb-6 text-[#ffe0e0] mix-blend-overlay font-serif"
                style={{ textShadow: "0 0 12px rgba(255,255,255,0.71)" }}
              >
                Superdesign. <br />
                <span className="italic font-light text-[#ffe0e0]">The design agent.</span>
              </h1>
            </div>

            <div className="reveal" style={{ transitionDelay: "200ms" }}>
              <p
                className="text-base md:text-lg text-[#ffe0e0]/90 max-w-lg mx-auto mb-16 font-light tracking-wide leading-relaxed mix-blend-overlay"
                style={{ textShadow: "0 0 12px rgba(255,255,255,0.71)" }}
              >
                We turn the unseen into the unforgettable. A design agency for those who dare to disappear to be found.
              </p>
            </div>

            <div className="reveal flex flex-col items-center gap-6" style={{ transitionDelay: "400ms" }}>
              <Link href="/register" className="relative group cursor-pointer inline-block">
                <div className="absolute inset-0 bg-[#FF4500]/20 blur-xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative border border-white/20 bg-white/5 backdrop-blur-sm px-6 py-2 rounded-full flex items-center gap-3 text-xs md:text-sm text-white/80 uppercase tracking-widest hover:bg-white/10 transition-colors duration-300">
                  <span>Enter the Void</span>
                </div>
              </Link>

              <div className="flex items-center gap-4 text-[10px] md:text-xs text-white/40 uppercase tracking-widest mt-8 font-mono">
                <span id="current-time">{currentTime}</span>
                <span className="w-px h-3 bg-white/20" />
                <span>NYC, USA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="expertise" className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center reveal">
            <h2 className="text-3xl md:text-5xl lg:text-6xl leading-tight text-white/90 mb-12 font-serif">
              We design the negative space where your brand truly lives.
            </h2>
            <p className="text-xl md:text-2xl text-gray-500 leading-relaxed font-light">
              Elegance is refusal. We remove the noise so your message resonates with absolute clarity.
            </p>
          </div>

          {/* Logo Grid */}
          <div className="mt-32 grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="reveal font-bold text-xl tracking-widest">VOGUE</div>
            <div className="reveal font-bold text-xl tracking-widest" style={{ transitionDelay: "100ms" }}>
              TESLA
            </div>
            <div className="reveal font-bold text-xl tracking-widest" style={{ transitionDelay: "200ms" }}>
              MOOMA
            </div>
            <div className="reveal font-bold text-xl tracking-widest" style={{ transitionDelay: "300ms" }}>
              AESOP
            </div>
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <section id="works" className="py-40 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="reveal mb-32">
            <h2 className="text-5xl md:text-7xl text-center font-serif">
              Define your <br />
              <span className="italic">digital presence</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Card 1 - Red */}
            <div ref={cardDownRef} className="parallax-card-down">
              <Link
                href="/register"
                className="reveal bg-[#FF4500] rounded-3xl p-8 md:p-12 aspect-[4/5] flex flex-col justify-between shadow-2xl hover:shadow-[0_20px_50px_rgba(255,69,0,0.3)] transition-all duration-500 group cursor-pointer block no-underline text-black hover:text-black"
              >
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-full bg-black/10 flex items-center justify-center group-hover:rotate-45 transition-transform duration-500">
                    <Star size={24} weight="fill" color="#000000" />
                  </div>
                  <span className="text-black font-medium text-sm border border-black/20 px-3 py-1 rounded-full">
                    01
                  </span>
                </div>

                <div>
                  <h3 className="text-4xl md:text-5xl text-black mb-4 leading-none tracking-tight font-serif">
                    Emerging <br />Talent
                  </h3>
                  <p className="text-black/70 text-lg leading-snug">
                    You have the spark. We provide the atmosphere for it to ignite into a blazing reality.
                  </p>
                </div>

                <div className="w-full h-px bg-black/10 mt-8" />
              </Link>
            </div>

            {/* Card 2 - Black */}
            <div ref={cardUpRef} className="parallax-card-up md:mt-24">
              <Link
                href="/login"
                className="reveal bg-[#111] border border-white/10 rounded-3xl p-8 md:p-12 aspect-[4/5] flex flex-col justify-between shadow-2xl group cursor-pointer hover:border-[#FF4500]/50 transition-all duration-500 block no-underline text-white hover:text-white"
                style={{ transitionDelay: "150ms" }}
              >
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <ArrowUpRight size={24} weight="bold" color="#ffffff" />
                  </div>
                  <span className="text-white/50 font-medium text-sm border border-white/10 px-3 py-1 rounded-full">
                    02
                  </span>
                </div>

                <div>
                  <h3 className="text-4xl md:text-5xl text-white mb-4 leading-none tracking-tight font-serif">
                    Evolving <br />Legacy
                  </h3>
                  <p className="text-gray-400 text-lg leading-snug">
                    You've arrived. Now let's make sure you never leave their minds. Permanence is our craft.
                  </p>
                </div>

                <div className="w-full h-px bg-white/10 mt-8" />
              </Link>
            </div>
          </div>
        </div>

        {/* Background Pattern */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #333 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-[#050505] relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
            <div className="w-full md:w-auto">
              <h2 className="text-[10vw] leading-[0.8] tracking-tighter text-white/10 font-bold select-none pointer-events-none font-serif">
                SUPERDESIGN.
              </h2>
            </div>

            <div className="flex flex-col gap-8 text-right">
              <div className="flex flex-col gap-4 text-gray-400">
                <a href="#" id="footer-ig-link" className="hover:text-white transition-colors">
                  Instagram
                </a>
                <a href="#" id="footer-tw-link" className="hover:text-white transition-colors">
                  Twitter
                </a>
                <a href="#" id="footer-li-link" className="hover:text-white transition-colors">
                  LinkedIn
                </a>
              </div>
              <p className="text-sm text-gray-600">© 2024 Superdesign. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
