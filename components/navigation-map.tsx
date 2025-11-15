'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, Navigation, Clock, MapPin, X } from 'lucide-react';
import Script from 'next/script';
import { getMapsScriptUrl } from '@/app/actions/get-maps-url';

type RoutePoint = {
  lat: number;
  lng: number;
  label?: string;
};

type MapProps = {
  origin?: RoutePoint;
  destination?: RoutePoint;
  waypoints?: RoutePoint[];
  onClose?: () => void;
};

export function NavigationMap({ origin, destination, waypoints = [], onClose }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    steps: Array<{ instruction: string; distance: string; duration: string }>;
  } | null>(null);

  useEffect(() => {
    getMapsScriptUrl()
      .then(url => setScriptUrl(url))
      .catch(err => {
        console.error('[v0] Failed to get Maps script URL:', err);
        setError('Failed to load Google Maps configuration');
      });
  }, []);

  useEffect(() => {
    if (isLoaded && mapRef.current && !mapInstanceRef.current) {
      console.log('[v0] Initializing Google Map...');
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 33.7490, lng: -84.3880 }, // Default to Atlanta
        zoom: 13,
        styles: [
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        polylineOptions: {
          strokeColor: '#0A3D3D',
          strokeWeight: 5,
        },
      });
    }
  }, [isLoaded]);

  useEffect(() => {
    if (origin && destination && isLoaded) {
      console.log('[v0] Origin and destination set, rendering route...', { origin, destination });
      renderRoute();
    }
  }, [origin, destination, waypoints, isLoaded]);

  const renderRoute = async () => {
    if (!origin || !destination || !mapInstanceRef.current || !directionsRendererRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log('[v0] Calculating route with Google Directions Service...');

    try {
      const directionsService = new google.maps.DirectionsService();
      
      const request: google.maps.DirectionsRequest = {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        waypoints: waypoints.map(wp => ({
          location: new google.maps.LatLng(wp.lat, wp.lng),
          stopover: true,
        })),
        travelMode: google.maps.TravelMode.DRIVING,
      };

      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          console.log('[v0] Route calculated successfully');
          directionsRendererRef.current?.setDirections(result);

          const route = result.routes[0];
          const leg = route.legs[0];
          
          const steps = leg.steps.map(step => ({
            instruction: step.instructions.replace(/<[^>]*>/g, ''), // Strip HTML
            distance: step.distance?.text || '',
            duration: step.duration?.text || '',
          }));

          setRouteInfo({
            distance: leg.distance?.text || '',
            duration: leg.duration?.text || '',
            steps,
          });
        } else {
          console.error('[v0] Directions request failed:', status);
          setError(`Failed to calculate route: ${status}`);
        }
        setIsLoading(false);
      });
    } catch (err: any) {
      console.error('[v0] Error rendering route:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const openInGoogleMaps = () => {
    if (origin && destination) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  return (
    <>
      {scriptUrl && (
        <Script
          src={scriptUrl}
          onLoad={() => {
            console.log('[v0] Google Maps API loaded');
            setIsLoaded(true);
          }}
          onError={(e) => {
            console.error('[v0] Failed to load Google Maps API', e);
            setError('Failed to load Google Maps');
          }}
        />
      )}

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="relative w-full max-w-6xl max-h-[90vh] overflow-auto bg-card border-border shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-background border border-border transition-colors"
            aria-label="Close map"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>

          <div className="p-6">
            <div className="mb-4 flex items-center justify-between pr-12">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Navigation Route</h3>
                <p className="text-sm text-muted-foreground">
                  {origin && destination
                    ? `${origin.label || 'Start'} → ${destination.label || 'Destination'}`
                    : 'Your route will appear here'}
                </p>
              </div>
              {origin && destination && (
                <button
                  onClick={openInGoogleMaps}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Open in Google Maps
                </button>
              )}
            </div>

            <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border bg-muted">
              {!scriptUrl ? (
                <div className="w-full h-full flex items-center justify-center text-destructive">
                  Google Maps API key not configured
                </div>
              ) : !isLoaded ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading Google Maps...</span>
                </div>
              ) : isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Calculating route...</span>
                </div>
              ) : error ? (
                <div className="w-full h-full flex items-center justify-center text-destructive">
                  Error: {error}
                </div>
              ) : null}
              
              <div ref={mapRef} className="w-full h-full" />
            </div>

            {routeInfo && (
              <div className="mt-4 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-primary" />
                  <span className="font-medium">{routeInfo.distance}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-medium">{routeInfo.duration}</span>
                </div>
              </div>
            )}

            {routeInfo && routeInfo.steps.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Turn-by-Turn Directions
                </h4>
                <div className="max-h-[300px] overflow-y-auto space-y-3">
                  {routeInfo.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm text-foreground">{step.instruction}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {step.distance} • {step.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {origin && destination && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{origin.label || 'Start'}</p>
                    <p className="text-xs text-muted-foreground">
                      {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
                {waypoints.map((point, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {point.label || `Waypoint ${index + 1}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {destination.label || 'Destination'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
