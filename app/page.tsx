import { VoiceAgent } from '@/components/voice-agent';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F5F3EE]">
      {/* Header - Urban Buzz AI inspired */}
      <header className="border-b border-[#E8E5DC] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a href="#features" className="text-[#0A3D3D] hover:text-[#D4A655] transition-colors">Features</a>
              <a href="#solutions" className="text-[#0A3D3D] hover:text-[#D4A655] transition-colors">Solutions</a>
              <a href="#pricing" className="text-[#0A3D3D] hover:text-[#D4A655] transition-colors">Pricing</a>
            </nav>
            <button className="px-4 py-2 rounded-lg bg-[#0A3D3D] text-white hover:bg-[#0D4D4D] transition-colors text-sm font-medium">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero section - Urban Buzz AI style */}
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A3D3D]/5 border border-[#0A3D3D]/10 mb-6">
            <svg className="w-4 h-4 text-[#D4A655]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium text-[#0A3D3D]">AI-Powered Financial Intelligence</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-[#0A3D3D] mb-6 leading-tight text-balance">
            Understand Your Business{' '}
            <span className="text-[#D4A655]">Like Never Before</span>
          </h2>
          
          <p className="text-lg text-[#5C6B6B] mb-8 leading-relaxed text-balance">
            Let our AI financial co-pilot have a conversation with you to deeply understand your business needs, challenges, and goals. Get instant, voice-powered guidance that finds insights traditional tools can{"'"}t.
          </p>
        </div>

        {/* Voice agent */}
        <VoiceAgent />

        {/* Info cards - Urban Buzz AI style */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-xl border border-[#E8E5DC] shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#0A3D3D]/5 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#0A3D3D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2 text-[#0A3D3D] text-lg">Voice-First</h3>
            <p className="text-sm text-[#5C6B6B] leading-relaxed">
              Real-time audio conversation with natural speech-to-text. Talk naturally about your business.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-[#E8E5DC] shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#D4A655]/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#D4A655]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2 text-[#0A3D3D] text-lg">Safe & Confidential</h3>
            <p className="text-sm text-[#5C6B6B] leading-relaxed">
              Your business data is secure and private. We never share your information.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-[#E8E5DC] shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#0A3D3D]/5 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#0A3D3D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2 text-[#0A3D3D] text-lg">Instant Insights</h3>
            <p className="text-sm text-[#5C6B6B] leading-relaxed">
              Get personalized financial guidance based on your unique business situation in real-time.
            </p>
          </div>
        </div>

        {/* Expectation section */}
        <div className="mt-12 p-8 bg-white rounded-xl border border-[#E8E5DC] shadow-sm">
          <h3 className="font-semibold mb-4 text-[#0A3D3D] text-xl">What to expect during your conversation:</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4A655]/20 flex items-center justify-center text-[#D4A655] font-semibold text-sm">1</div>
              <p className="text-sm text-[#5C6B6B]">A natural 10-15 minute conversation about your business operations and goals</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4A655]/20 flex items-center justify-center text-[#D4A655] font-semibold text-sm">2</div>
              <p className="text-sm text-[#5C6B6B]">Questions about your finances, challenges, and what success looks like to you</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4A655]/20 flex items-center justify-center text-[#D4A655] font-semibold text-sm">3</div>
              <p className="text-sm text-[#5C6B6B]">No judgment - just understanding your needs and building a personalized plan</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4A655]/20 flex items-center justify-center text-[#D4A655] font-semibold text-sm">4</div>
              <p className="text-sm text-[#5C6B6B]">Switch between speaking and typing anytime during the conversation</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
