import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { origin, destination, waypoints = [] } = await req.json();

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouteService API key not configured' },
        { status: 500 }
      );
    }

    const coordinates = [
      [origin.lng, origin.lat],
      ...waypoints.map((wp: any) => [wp.lng, wp.lat]),
      [destination.lng, destination.lat],
    ];

    console.log('[v0] Fetching route from OpenRouteService API with coordinates:', coordinates);

    const orsUrl = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
    
    const response = await fetch(orsUrl, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates,
        instructions: true,
        units: 'mi',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[v0] OpenRouteService API error:', errorText);
      throw new Error(`OpenRouteService API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('[v0] Route fetched successfully from OpenRouteService');

    const feature = data.features[0];
    const geometry = feature.geometry.coordinates; // Array of [lng, lat] points
    const segments = feature.properties.segments;

    const directions: any[] = [];
    segments.forEach((segment: any) => {
      segment.steps.forEach((step: any) => {
        if (step.type !== 11) { // Type 11 is arrival
          directions.push({
            instruction: step.instruction,
            distance: step.distance,
            duration: step.duration,
            type: step.type,
          });
        }
      });
    });

    return NextResponse.json({
      geometry, // Path coordinates
      directions, // Turn-by-turn instructions
      distance: feature.properties.segments[0].distance,
      duration: feature.properties.segments[0].duration,
    });
  } catch (error: any) {
    console.error('[v0] Route API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch route' },
      { status: 500 }
    );
  }
}
