import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime?: number;
  checks?: {
    database: { status: 'ok' | 'error'; latencyMs?: number; error?: string };
    memory: { status: 'ok' | 'warning'; usedMB: number; totalMB: number };
  };
}

const startTime = Date.now();

// GET /api/health - Health check endpoint
// Returns minimal info for unauthenticated requests (security best practice)
// Returns detailed info for authenticated users
export async function GET() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Always perform basic health check
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const { error } = await supabase.from('sites').select('id').limit(1);
    const latencyMs = Date.now() - dbStart;

    if (error) {
      overallStatus = 'unhealthy';
    } else if (latencyMs > 500) {
      overallStatus = 'degraded';
    }
  } catch {
    overallStatus = 'unhealthy';
  }

  // For unauthenticated requests, return minimal info only
  if (!isAuthenticated) {
    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
      },
      {
        status: overallStatus === 'unhealthy' ? 503 : 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }

  // For authenticated users, return detailed health info
  const checks: HealthStatus['checks'] = {
    database: { status: 'ok' },
    memory: { status: 'ok', usedMB: 0, totalMB: 0 },
  };

  // Re-check database with detailed info
  try {
    const dbStart = Date.now();
    const { error } = await supabase.from('sites').select('id').limit(1);
    const latencyMs = Date.now() - dbStart;

    if (error) {
      checks.database = { status: 'error', error: error.message };
    } else {
      checks.database = { status: 'ok', latencyMs };
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  // Check memory usage (Node.js)
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memory = process.memoryUsage();
    const usedMB = Math.round(memory.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memory.heapTotal / 1024 / 1024);
    const usagePercent = (memory.heapUsed / memory.heapTotal) * 100;

    checks.memory = {
      status: usagePercent > 90 ? 'warning' : 'ok',
      usedMB,
      totalMB,
    };
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
  };

  // Return appropriate status code
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
