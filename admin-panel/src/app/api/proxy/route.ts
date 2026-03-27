import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}

async function proxyRequest(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetPath = searchParams.get('path');

  if (!targetPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Get the base API URL from environment or fallback
  const BE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://admin.foryou-realestate.com/api';
  
  // Clean target path (remove leading slash if present)
  const cleanPath = targetPath.startsWith('/') ? targetPath.substring(1) : targetPath;
  const targetUrl = `${BE_URL}/${cleanPath}`;

  console.log(`[Proxy] Forwarding to: ${targetUrl}`);

  // Prepare headers, forwarding Authorization if present
  const headers = new Headers();
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }
  headers.set('Content-Type', 'application/json');

  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      // For POST/PUT/PATCH, forward the body
      body: ['POST', 'PUT', 'PATCH'].includes(request.method) 
        ? await request.text() 
        : undefined,
    };

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error(`[Proxy Error] ${error.message}`);
    return NextResponse.json(
      { error: 'Proxy failed to reach backend', details: error.message },
      { status: 502 }
    );
  }
}
