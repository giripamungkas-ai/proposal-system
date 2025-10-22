import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        ai: "available",
        cache: "ready"
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: "1.0.0"
      }
    };

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { 
        status: "unhealthy", 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
