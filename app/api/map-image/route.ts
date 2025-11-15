import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { origin, destination, routeGeometry } = await req.json();

    if (!origin || !destination || !routeGeometry) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Build path parameter from route geometry
    const pathPoints = routeGeometry.map(([lng, lat]: [number, number]) => `${lat},${lng}`).join('|');
    
    // Build markers
    const startMarker = `color:green|label:A|${origin.lat},${origin.lng}`;
    const endMarker = `color:red|label:B|${destination.lat},${destination.lng}`;
    
    // Build the Google Maps Static API URL
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const params = new URLSearchParams({
      size: '800x500',
      path: `color:0x0A3D3D|weight:5|${pathPoints}`,
      key: apiKey,
    });

    const mapUrl = `${baseUrl}?${params.toString()}&markers=${encodeURIComponent(startMarker)}&markers=${encodeURIComponent(endMarker)}`;

    return NextResponse.json({ mapUrl });
  } catch (error: any) {
    console.error('[v0] Map image API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate map image' },
      { status: 500 }
    );
  }
}
