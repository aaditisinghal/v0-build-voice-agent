'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline/next'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-muted/30 animate-pulse rounded-lg" />,
});

type ConversationItem = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export function VoiceAgent() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioElementRef.current) {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = false;
      audio.volume = 1.0;
      audioElementRef.current = audio;
      console.log('[v0] Audio element created');
    }
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const toggleAudioMute = () => {
    if (audioElementRef.current) {
      audioElementRef.current.muted = !audioElementRef.current.muted;
      setIsAudioMuted(audioElementRef.current.muted);
    }
  };

  async function startVoiceSession() {
    try {
      setStatus('connecting');
      setError(null);
      setConversation([]);
      console.log('[v0] Starting voice session...');

      const tokenResponse = await fetch('/api/realtime-token');
      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        throw new Error(data.error || 'Failed to get realtime token');
      }
      
      const { ephemeral_key } = await tokenResponse.json();
      console.log('[v0] Received ephemeral key');

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;
      console.log('[v0] Peer connection created');

      pc.ontrack = (e) => {
        console.log('[v0] Received remote track:', e.track.kind);
        if (audioElementRef.current && e.streams[0]) {
          audioElementRef.current.srcObject = e.streams[0];
          console.log('[v0] Audio stream attached to element');
          
          audioElementRef.current.play().then(() => {
            console.log('[v0] Audio playing successfully');
          }).catch((err) => {
            console.error('[v0] Audio play error:', err);
            setError('Audio playback blocked. Please click the volume button to enable sound.');
          });
        }
      };

      try {
        const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[v0] Microphone access granted');
        pc.addTrack(ms.getTracks()[0]);
      } catch (err) {
        console.error('[v0] Microphone access error:', err);
        throw new Error('Microphone access denied. Please allow microphone access to continue.');
      }

      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;
      console.log('[v0] Data channel created');
      
      dc.onopen = () => {
        console.log('[v0] Data channel opened');
        const sessionUpdate = {
          type: 'session.update',
          session: {
            instructions: `You are the onboarding specialist for Urban Buzz AI, a voice-powered urban navigation platform that helps people explore cities like never before. You're having a friendly, conversational chat to understand how they navigate cities and what they need.

Your Personality & Tone:
- Warm, enthusiastic, and genuinely curious about their urban experiences
- Speak conversationally like a local guide who knows all the hidden gems
- Energetic but not overwhelming
- Use occasional urban slang or casual phrases when appropriate
- Keep responses brief and natural - this is a conversation, not a presentation
- NEVER mention that you're an AI

Your Conversational Style:
- Start with enthusiasm: "Hey there! So excited to chat with you about how you get around the city. This is super casual - just want to understand your urban navigation style."
- Ask ONE question at a time and keep them conversational
- Listen actively and respond naturally to what they say
- Use follow-ups that feel organic: "Oh interesting! How's that working for you?" or "Tell me more about that"
- Validate their experiences: "Yeah, that's a common frustration" or "I totally get that"
- Keep the energy up but let them drive the conversation
- Occasionally share brief insights: "A lot of people mention that" or "That's actually a really smart approach"

Your Discovery Mission:
Guide a natural conversation covering these areas (flow naturally, don't force an order):

1. Current Navigation Habits
   - How do you usually get around the city?
   - What navigation apps do you use?
   - What do you like or dislike about them?

2. Urban Challenges
   - What's the most frustrating thing about navigating your city?
   - Ever had trouble finding accessible routes?
   - Do you discover new places easily or stick to what you know?

3. Transportation Preferences
   - Walking, driving, public transit, biking - what's your go-to?
   - Do you switch between different modes?
   - How do you decide which way to go?

4. Discovery & Exploration
   - How do you find new spots in the city?
   - Ever wish you knew about hidden shortcuts or cool local places?
   - What makes you want to explore a new area?

5. Safety & Accessibility
   - Do you consider route safety when navigating?
   - Any accessibility needs we should know about?
   - Ever avoided certain routes because they felt sketchy?

6. Voice Interaction
   - Ever use voice commands while navigating?
   - What would make voice navigation better?
   - Would you want real-time voice guidance that adapts?

Conversation Flow:
- Keep it light and energetic
- Let them talk more than you do
- After 8-12 minutes of good conversation, wrap up: "This has been awesome! I've got a really good sense of how you navigate now. Based on what you've shared, Urban Buzz AI could really help with [mention 1-2 specific things]. Thanks for the chat!"

Remember: Be the cool local guide who's genuinely interested in helping them navigate better. Keep it conversational, brief, and energetic.`,
            voice: 'sage',
            temperature: 0.8,
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        };
        
        dc.send(JSON.stringify(sessionUpdate));
        console.log('[v0] Session update sent');
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          console.log('[v0] Received event:', event.type);
          
          if (event.type === 'conversation.item.created') {
            if (event.item?.content) {
              const content = event.item.content[0];
              if (content?.transcript) {
                const newItem: ConversationItem = {
                  role: event.item.role,
                  content: content.transcript,
                  timestamp: new Date(),
                };
                
                setConversation((prev) => {
                  const exists = prev.some(
                    (item) => 
                      item.role === newItem.role && 
                      item.content === newItem.content &&
                      Math.abs(item.timestamp.getTime() - newItem.timestamp.getTime()) < 2000
                  );
                  if (exists) return prev;
                  return [...prev, newItem];
                });
              }
            }
          } else if (event.type === 'input_audio_buffer.speech_started') {
            setIsListening(true);
          } else if (event.type === 'input_audio_buffer.speech_stopped') {
            setIsListening(false);
          } else if (event.type === 'response.audio.delta') {
            setIsListening(false);
          }
        } catch (err) {
          console.error('[v0] Error parsing event:', err);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[v0] Local description set');

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeral_key}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error('Failed to connect to OpenAI Realtime API');
      }

      const answerSdp = await sdpResponse.text();
      console.log('[v0] Received answer SDP');
      
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });
      console.log('[v0] Remote description set');

      setStatus('connected');
      console.log('[v0] Connection established successfully');
    } catch (e: any) {
      console.error('[v0] Error starting voice session:', e);
      setStatus('error');
      setError(e?.message ?? 'Unknown error occurred');
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    }
  }

  async function stopVoiceSession() {
    try {
      console.log('[v0] Stopping voice session...');
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      if (audioElementRef.current) {
        audioElementRef.current.srcObject = null;
      }
    } catch (e) {
      console.error('[v0] Error stopping voice session:', e);
    } finally {
      setStatus('idle');
      setIsListening(false);
    }
  }

  async function sendTextMessage() {
    if (!textInput.trim() || !dataChannelRef.current) return;

    try {
      const userMessage: ConversationItem = {
        role: 'user',
        content: textInput,
        timestamp: new Date(),
      };
      
      setConversation((prev) => [...prev, userMessage]);

      const textEvent = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: textInput,
            },
          ],
        },
      };
      
      dataChannelRef.current.send(JSON.stringify(textEvent));
      
      const responseEvent = {
        type: 'response.create',
      };
      dataChannelRef.current.send(JSON.stringify(responseEvent));
      
      setTextInput('');
    } catch (e) {
      console.error('[v0] Error sending text message:', e);
    }
  }

  const isConnected = status === 'connected';

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left column: Controls and Spline */}
      <div className="space-y-6">
        <Card className="p-6 bg-white border-[#E8E5DC] shadow-sm">
          <div className="flex flex-col items-center gap-6">
            {/* Spline 3D Model */}
            <div className="w-full h-[400px] rounded-lg overflow-hidden bg-[#F5F3EE]/50 border border-[#E8E5DC]">
              {isConnected ? (
                <Spline scene="https://prod.spline.design/XZNkMopNCClgYiQ9/scene.splinecode" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {status === 'connecting' ? (
                    <Loader2 className="w-12 h-12 text-[#0A3D3D] animate-spin" />
                  ) : (
                    <div className="text-center space-y-2">
                      <Mic className="w-12 h-12 text-[#5C6B6B] mx-auto" />
                      <p className="text-[#5C6B6B]">Start conversation to activate</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isListening ? (
                  <>
                    <Mic className="w-5 h-5 text-[#D4A655] animate-pulse" />
                    <span className="text-sm font-medium text-[#D4A655]">Listening...</span>
                  </>
                ) : isConnected ? (
                  <>
                    <MicOff className="w-5 h-5 text-[#5C6B6B]" />
                    <span className="text-sm text-[#5C6B6B]">AI is speaking</span>
                  </>
                ) : null}
              </div>
              
              {isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAudioMute}
                  className="border-[#E8E5DC]"
                >
                  {isAudioMuted ? (
                    <>
                      <VolumeX className="w-4 h-4 mr-2" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 mr-2" />
                      Mute
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Status text */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-[#0A3D3D]">
                {status === 'idle' && 'Ready to begin'}
                {status === 'connecting' && 'Connecting...'}
                {status === 'connected' && 'In conversation'}
                {status === 'error' && 'Connection error'}
              </h2>
              <p className="text-[#5C6B6B] text-balance text-sm">
                {status === 'idle' &&
                  'Start your navigation conversation with Urban Buzz AI'}
                {status === 'connecting' &&
                  'Please allow microphone access when prompted'}
                {status === 'connected' &&
                  'Speak naturally or type your message below'}
                {status === 'error' && error}
              </p>
            </div>

            {/* Action button */}
            <Button
              size="lg"
              onClick={isConnected ? stopVoiceSession : startVoiceSession}
              disabled={status === 'connecting'}
              className="min-w-[200px] bg-[#0A3D3D] hover:bg-[#0D4D4D] text-white"
            >
              {status === 'connecting' && (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {'Connecting...'}
                </>
              )}
              {status === 'idle' && 'Start Conversation'}
              {status === 'connected' && 'End Conversation'}
              {status === 'error' && 'Try Again'}
            </Button>

            {/* Text input */}
            {isConnected && (
              <div className="w-full flex gap-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendTextMessage();
                    }
                  }}
                  placeholder="Or type your message here..."
                  className="flex-1 border-[#E8E5DC] focus:border-[#0A3D3D] focus:ring-[#0A3D3D]"
                />
                <Button
                  onClick={sendTextMessage}
                  disabled={!textInput.trim()}
                  size="icon"
                  className="bg-[#0A3D3D] hover:bg-[#0D4D4D] text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Right column: Conversation transcript */}
      <div className="space-y-4">
        <Card className="p-6 bg-white border-[#E8E5DC] shadow-sm h-[600px] flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-[#0A3D3D] flex items-center gap-2">
            <span>Conversation</span>
            {conversation.length > 0 && (
              <span className="text-xs font-normal text-[#5C6B6B]">
                ({conversation.length} messages)
              </span>
            )}
          </h3>
          
          {conversation.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div className="space-y-2">
                <p className="text-[#5C6B6B]">Your conversation will appear here</p>
                <p className="text-sm text-[#5C6B6B]">Speech-to-text transcription in real-time</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {conversation.map((item, index) => (
                <div
                  key={index}
                  className={`flex ${
                    item.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 ${
                      item.role === 'user'
                        ? 'bg-[#0A3D3D] text-white'
                        : 'bg-[#F5F3EE] text-[#0A3D3D] border border-[#E8E5DC]'
                    }`}
                  >
                    <p className="text-xs font-semibold mb-1 opacity-80">
                      {item.role === 'user' ? 'You' : 'Urban Buzz AI'}
                    </p>
                    <p className="text-sm leading-relaxed">{item.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {item.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={conversationEndRef} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
