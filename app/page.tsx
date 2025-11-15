import { VoiceAgent } from '@/components/voice-agent';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/urban-buzz-logo.png" 
              alt="Urban Buzz AI" 
              width={48} 
              height={48}
              className="h-12 w-12"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">Urban Buzz AI</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Urban Navigation</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <VoiceAgent />
      </div>
    </main>
  );
}
