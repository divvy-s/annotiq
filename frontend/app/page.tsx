import { InteractiveBackground } from "@/components/InteractiveBackground";
import { CustomCursor } from "@/components/CustomCursor";
import { ArrowRight, Sparkles, Zap, Brain } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <CustomCursor />
      <InteractiveBackground />
      
      <div className="min-h-screen font-[family-name:var(--font-geist-sans)] text-white relative">
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 glass border-b-0 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Annotiq</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/search" className="hover:text-white transition-colors">Search</Link>
          </div>
          <div className="flex items-center gap-4">
             <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
               Log in
             </Link>
            <button className="bg-white text-black text-sm font-medium px-5 py-2.5 rounded-full hover:bg-indigo-50 transition-colors">
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="pt-48 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 border-indigo-500/30">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-200">The next generation of AI Meeting Intelligence</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter mb-8 leading-tight">
            Unlock the power <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500">
              of your conversations.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mb-12 text-balance leading-relaxed">
            Annotiq automatically transcribes, analyzes, and extracts actionable insights from your meetings so you can focus on what matters most.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 items-center">
            <Link 
              href="/upload"
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start for free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link 
              href="#demo"
              className="px-8 py-4 glass hover:bg-white/10 rounded-full font-medium transition-colors"
            >
              View Demo
            </Link>
          </div>
        </main>

        {/* Features Preview */}
        <section className="py-24 px-6 max-w-7xl mx-auto mt-12">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain className="w-6 h-6 text-purple-400" />,
                title: "AI Summaries",
                description: "Get concise summaries and action items instantly after every meeting."
              },
              {
                icon: <Zap className="w-6 h-6 text-yellow-400" />,
                title: "Semantic Search",
                description: "Find exactly what was said using natural language queries across all transcripts."
              },
              {
                icon: <Sparkles className="w-6 h-6 text-indigo-400" />,
                title: "Smart Chapters",
                description: "Automatically segment your meetings into readable, easy-to-navigate chapters."
              }
            ].map((feature, i) => (
              <div key={i} className="glass p-8 rounded-3xl hover:-translate-y-2 hover:bg-white/10 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
