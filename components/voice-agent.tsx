'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Map } from 'lucide-react';
import Script from 'next/script';
import { NavigationMap } from './navigation-map';

type ConversationItem = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type RoutePoint = {
  lat: number;
  lng: number;
  label?: string;
};

type RouteData = {
  origin?: RoutePoint;
  destination?: RoutePoint;
  waypoints?: RoutePoint[];
};

export function VoiceAgent() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [routeData, setRouteData] = useState<RouteData>({});
  const [showDirections, setShowDirections] = useState(false);
  const [splineLoaded, setSplineLoaded] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
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
      setRouteData({});
      setShowDirections(false);

      console.log('[v0] Fetching ephemeral key...');
      
      const tokenResponse = await fetch('/api/realtime-token');
      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        throw new Error(data.error || 'Failed to get realtime token');
      }
      
      const { ephemeral_key } = await tokenResponse.json();
      console.log('[v0] Got ephemeral key');

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      if (audioElementRef.current) {
        pc.ontrack = (e) => {
          console.log('[v0] Received remote audio track');
          if (audioElementRef.current) {
            audioElementRef.current.srcObject = e.streams[0];
          }
        };
      }

      console.log('[v0] Requesting microphone access...');
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(ms.getTracks()[0]);
      console.log('[v0] Added local audio track');

      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;
      
      dc.onopen = () => {
        console.log('[v0] Data channel opened');
        const sessionUpdate = {
          type: 'session.update',
          session: {
            instructions: `You are an enthusiastic navigation assistant for Urban Buzz AI, helping people navigate cities with voice-powered, real-time directions.

Your Personality:
- Energetic, helpful, and conversational
- Quick and clear with directions
- Encouraging and reassuring
- Natural and friendly tone
- Speak like a helpful friend giving directions

Your Role:
You provide REAL-TIME navigation assistance and directions. When users ask for directions:

1. Ask for their starting point and destination
2. Provide clear, step-by-step directions
3. Use landmarks for easier navigation
4. When you have specific coordinates or locations, USE THE generate_map FUNCTION to display the route visually

IMPORTANT: Whenever you provide directions between two locations, you MUST call the generate_map function with:
- origin: {lat, lng, label} for starting point
- destination: {lat, lng, label} for destination
- waypoints: optional array of {lat, lng, label} for points along the route

Example:
User: "How do I get from Times Square to Central Park?"
You: "Great! Let me show you on the map. [CALL generate_map with Times Square and Central Park coordinates] Now, here's how you'll get there: Head north on 7th Avenue..."

Conversation Style:
- Start by asking their current location and destination
- Give ONE clear direction at a time
- Use conversational phrases: "Alright, head straight for about 2 blocks"
- Check in: "Do you see the park on your left?"
- Be supportive: "You're doing great! Almost there"
- Always generate a map when giving directions
- NEVER mention you're an AI`,
            voice: 'sage',
            temperature: 0.8,
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
            tools: [
              {
                type: 'function',
                name: 'generate_map',
                description: 'Display a navigation map with route from origin to destination. Call this whenever providing directions between two locations.',
                parameters: {
                  type: 'object',
                  properties: {
                    origin: {
                      type: 'object',
                      properties: {
                        lat: { type: 'number', description: 'Latitude of starting point' },
                        lng: { type: 'number', description: 'Longitude of starting point' },
                        label: { type: 'string', description: 'Name/description of starting point' },
                      },
                      required: ['lat', 'lng'],
                    },
                    destination: {
                      type: 'object',
                      properties: {
                        lat: { type: 'number', description: 'Latitude of destination' },
                        lng: { type: 'number', description: 'Longitude of destination' },
                        label: { type: 'string', description: 'Name/description of destination' },
                      },
                      required: ['lat', 'lng'],
                    },
                    waypoints: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          lat: { type: 'number' },
                          lng: { type: 'number' },
                          label: { type: 'string' },
                        },
                      },
                      description: 'Optional waypoints along the route',
                    },
                  },
                  required: ['origin', 'destination'],
                },
              },
            ],
          },
        };
        
        dc.send(JSON.stringify(sessionUpdate));
        console.log('[v0] Sent session update with map function');
      };

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          console.log('[v0] Received event:', event.type);
          
          if (event.type === 'response.function_call_arguments.done') {
            try {
              console.log('[v0] Function call completed:', event);
              const callId = event.call_id;
              const name = event.name;
              const args = JSON.parse(event.arguments);
              
              if (name === 'generate_map') {
                console.log('[v0] Generating map with args:', args);
                setRouteData({
                  origin: args.origin,
                  destination: args.destination,
                  waypoints: args.waypoints || [],
                });

                if (dataChannelRef.current) {
                  const resultEvent = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: callId,
                      output: JSON.stringify({ 
                        success: true, 
                        message: 'Map displayed successfully with route' 
                      }),
                    },
                  };
                  dataChannelRef.current.send(JSON.stringify(resultEvent));
                  
                  const responseCreate = {
                    type: 'response.create',
                  };
                  dataChannelRef.current.send(JSON.stringify(responseCreate));
                  console.log('[v0] Sent function result and requested response');
                }
              }
            } catch (err) {
              console.error('[v0] Error handling function call:', err);
            }
          }
          
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
    <div className="space-y-6">
      <Script
        src="https://unpkg.com/@splinetool/viewer@1.11.4/build/spline-viewer.js"
        type="module"
        onLoad={() => setSplineLoaded(true)}
      />

      {showDirections && (routeData.origin || routeData.destination) && (
        <NavigationMap
          origin={routeData.origin}
          destination={routeData.destination}
          waypoints={routeData.waypoints}
          onClose={() => setShowDirections(false)}
        />
      )}

      <div className="w-full h-[500px] rounded-lg overflow-hidden bg-black relative">
        <spline-viewer 
          url="https://prod.spline.design/BzGhv2K1X4p0Muz4/scene.splinecode"
          className="w-full h-full"
        />
        {/* Black overlay to hide "Built with Spline" watermark in bottom right */}
        <div className="absolute bottom-0 right-0 w-48 h-16 bg-black pointer-events-none" />
      </div>

      <Card className="p-6 bg-card border-border shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {status === 'idle' && 'Ready to begin'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'connected' && (isListening ? 'Listening...' : 'Speak or type')}
              {status === 'error' && 'Connection error'}
            </h2>
            <p className="text-sm text-muted-foreground text-balance">
              {status === 'idle' &&
                'Click start to begin your navigation conversation with Urban Buzz AI'}
              {status === 'connecting' &&
                'Please allow microphone access when prompted'}
              {status === 'connected' &&
                'Talk naturally or type your message below'}
              {status === 'error' && error}
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <Button
              size="lg"
              onClick={isConnected ? stopVoiceSession : startVoiceSession}
              disabled={status === 'connecting'}
              className="min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90"
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

            {(routeData.origin || routeData.destination) && (
              <Button
                size="lg"
                onClick={() => setShowDirections(!showDirections)}
                variant="outline"
                className="min-w-[200px] border-primary text-primary hover:bg-primary/10"
              >
                <Map className="mr-2 h-5 w-5" />
                {showDirections ? 'Hide Directions' : 'Show Directions'}
              </Button>
            )}
          </div>

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
                className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                onClick={sendTextMessage}
                disabled={!textInput.trim()}
                size="icon"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {conversation.length > 0 && (
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Conversation</h3>
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
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {item.role === 'user' ? 'You' : 'Urban Buzz'}
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
