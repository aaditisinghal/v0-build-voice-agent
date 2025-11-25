import { VoiceAgent } from "@/components/voice-agent"
import Image from "next/image"

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-black">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/profitwis-logo.png" alt="ProfitWise" width={48} height={48} className="h-12 w-10" />
            <div>
              <h1 className="text-xl font-bold text-white">ProfitWise</h1>
              <p className="text-sm text-white/70">AI Financial Co-Pilot for SMBs</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <VoiceAgent />

        <div className="mt-12 p-6 bg-white/5 rounded-lg border border-white/10">
          <h3 className="font-semibold mb-2 text-white">What this conversation is about:</h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li>Getting to know you and your business story</li>
            <li>Understanding your financial landscape and goals</li>
            <li>Discovering how ProfitWise can best support your growth</li>
            <li>Everything shared is completely confidential and secure</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
