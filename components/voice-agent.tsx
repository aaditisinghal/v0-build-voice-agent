'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline/next'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-muted animate-pulse rounded-lg" />,
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

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for playback
    if (typeof window !== 'undefined' && !audioElementRef.current) {
      audioElementRef.current = document.createElement('audio');
      audioElementRef.current.autoplay = true;
    }
  }, []);

  async function startVoiceSession() {
    try {
      setStatus('connecting');
      setError(null);
      setConversation([]);

      console.log('[v0] Fetching ephemeral key...');
      
      // Get ephemeral key from API route
      const tokenResponse = await fetch('/api/realtime-token');
      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        throw new Error(data.error || 'Failed to get realtime token');
      }
      
      const { ephemeral_key } = await tokenResponse.json();
      console.log('[v0] Got ephemeral key');

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Set up audio element to play remote audio
      if (audioElementRef.current) {
        pc.ontrack = (e) => {
          console.log('[v0] Received remote audio track');
          if (audioElementRef.current) {
            audioElementRef.current.srcObject = e.streams[0];
          }
        };
      }

      // Add local audio track
      console.log('[v0] Requesting microphone access...');
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(ms.getTracks()[0]);
      console.log('[v0] Added local audio track');

      // Set up data channel for receiving events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;
      
      dc.onopen = () => {
        console.log('[v0] Data channel opened');
        // Send session update with instructions
        const sessionUpdate = {
          type: 'session.update',
          session: {
            instructions: `You are an onboarding specialist for ProfitWise, an AI financial co-pilot for small and medium businesses. Your role is to have a natural, conversational interview to understand the business in depth.

Your Personality:
- Warm, professional, and genuinely curious about their business
- Patient and thoughtful - you listen carefully
- Approachable but knowledgeable about business and finance
- Speak at a moderate, conversational pace

Your Task:
Conduct a comprehensive business discovery conversation covering:

1. Basic Business Information
   - Business name and what they do
   - Industry/sector
   - Years in operation
   - Legal structure

2. Business Scale & Operations
   - Number of employees
   - Annual revenue range (be sensitive - offer ranges)
   - Primary revenue streams
   - Key expenses and cost drivers

3. Current Financial Management
   - How they currently handle bookkeeping
   - What tools or software they use
   - Pain points in current processes
   - How often they review financial reports

4. Business Goals & Challenges
   - Short-term goals (next 6-12 months)
   - Long-term vision (2-5 years)
   - Biggest financial challenges
   - What keeps them up at night

5. Decision Making & Cash Flow
   - How they make financial decisions
   - Cash flow management approach
   - Planning for taxes and major expenses
   - Forecasting or budgeting processes

Conversation Guidelines:
- Start with a warm greeting and explain you'll have a conversation to understand their business
- Ask ONE question at a time - wait for their complete answer
- Listen actively and ask natural follow-up questions
- If they give short answers, probe gently
- Validate their experiences
- Keep questions conversational, not interrogative
- After covering key areas, summarize and thank them
- NEVER mention that you're an AI
- Aim for 10-15 minutes of conversation`,
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
        console.log('[v0] Sent session update');
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

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to OpenAI Realtime API
      console.log('[v0] Sending offer to OpenAI...');
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
      console.log('[v0] Received answer from OpenAI');
      
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      setStatus('connected');
      console.log('[v0] Connected successfully!');
    } catch (e: any) {
      console.error('[v0] Error starting voice session:', e);
      setStatus('error');
      setError(e?.message ?? 'Unknown error occurred');
      
      // Clean up on error
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

  // Function to send text messages
  async function sendTextMessage() {
    if (!textInput.trim() || !dataChannelRef.current) return;

    try {
      const userMessage: ConversationItem = {
        role: 'user',
        content: textInput,
        timestamp: new Date(),
      };
      
      setConversation((prev) => [...prev, userMessage]);

      // Send text input to the assistant
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
      
      // Trigger response
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
    <div className="space-y-6">
      <Card className="p-8 bg-black border-white/10">
        <div className="flex flex-col items-center gap-6">
          <div className="w-full h-[400px] rounded-lg overflow-hidden">
            {isConnected ? (
              <Spline scene="https://prod.spline.design/XZNkMopNCClgYiQ9/scene.splinecode" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                {status === 'connecting' ? (
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                ) : (
                  <p className="text-white/50">Start conversation to activate</p>
                )}
              </div>
            )}
          </div>

          {/* Status text */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-white">
              {status === 'idle' && 'Ready to begin'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'connected' && (isListening ? 'Listening...' : 'Speak or type')}
              {status === 'error' && 'Connection error'}
            </h2>
            <p className="text-white/70 text-balance">
              {status === 'idle' &&
                'Click start to begin your onboarding conversation with our AI assistant'}
              {status === 'connecting' &&
                'Please allow microphone access when prompted'}
              {status === 'connected' &&
                'Talk naturally or type your message below'}
              {status === 'error' && error}
            </p>
          </div>

          {/* Action button */}
          <Button
            size="lg"
            onClick={isConnected ? stopVoiceSession : startVoiceSession}
            disabled={status === 'connecting'}
            className="min-w-[200px] bg-primary text-white hover:bg-primary/90"
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
                className="flex-1 bg-black border-white/20 text-white placeholder:text-white/50"
              />
              <Button
                onClick={sendTextMessage}
                disabled={!textInput.trim()}
                size="icon"
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Conversation transcript */}
      {conversation.length > 0 && (
        <Card className="p-6 bg-black border-white/10">
          <h3 className="text-lg font-semibold mb-4 text-white">Conversation</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {conversation.map((item, index) => (
              <div
                key={index}
                className={`flex ${
                  item.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    item.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {item.role === 'user' ? 'You' : 'ProfitWise'}
                  </p>
                  <p className="text-sm">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
