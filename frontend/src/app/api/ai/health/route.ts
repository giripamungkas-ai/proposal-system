import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai/ai-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Unauthorized'
        },
        { status: 401 }
      )
    }

    // Perform AI health check
    const healthResult = await aiService.healthCheck()

    // Check API keys status
    const providerStatus = aiService.getProviderStatus()

    // Get usage statistics
    const usageStats = await aiService.getUsageStats()

    return NextResponse.json({
      status: 'success',
      data: {
        ai_health: healthResult,
        providers: providerStatus,
        usage: usageStats,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      },
      message: 'AI health check completed successfully'
    })

  } catch (error) {
    console.error('AI health check error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to perform AI health check',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
```

## 🛠️ **Step 4: Test AI Manager Integration**
