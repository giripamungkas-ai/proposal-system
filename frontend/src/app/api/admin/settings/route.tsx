import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// System Settings & Admin Tools API
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin permissions
    const userRole = session.user.role as string
    if (!['ADMIN', 'SALES_MANAGER', 'BS_MANAGER'].includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Mock system settings for now
    const systemSettings = {
      ai: {
        openai_api_key: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        glm_api_key: process.env.GLM_API_KEY ? 'configured' : 'not_configured',
        openai_model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        glm_model: process.env.GLM_MODEL || 'glm-4-6',
        max_tokens: process.env.OPENAI_MAX_TOKENS || '4000',
        temperature: process.env.OPENAI_TEMPERATURE || '0.7',
        fallback_strategy: process.env.AI_FALLBACK_STRATEGY || 'auto'
      },
      email: {
        smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtp_port: process.env.SMTP_PORT || '587',
        smtp_user: process.env.SMTP_USER || 'not_configured',
        smtp_pass: process.env.SMTP_PASS ? 'configured' : 'not_configured',
        email_from: process.env.EMAIL_FROM || 'noreply@mdmedia.id'
      },
      security: {
        secret_key: process.env.SECRET_KEY ? 'configured' : 'not_configured',
        encryption_key: process.env.ENCRYPTION_KEY ? 'configured' : 'not_configured',
        session_timeout: '24h',
        password_policy: 'strong',
        two_factor_auth: 'disabled'
      },
      storage: {
        max_file_size: process.env.MAX_FILE_SIZE || '10485760',
        upload_dir: process.env.UPLOAD_DIR || './public/uploads',
        allowed_types: process.env.ALLOWED_FILE_TYPES || '.pdf,.doc,.docx,.txt,.jpg,.png,.xlsx,.zip',
        backup_enabled: true,
        backup_retention: '90 days'
      },
      system: {
        app_name: process.env.APP_NAME || 'MDMEDIA Strategic Proposal System',
        app_version: process.env.APP_VERSION || 'R0.3',
        environment: process.env.NODE_ENV || 'development',
        debug_mode: process.env.DEBUG === 'true',
        log_level: process.env.LOG_LEVEL || 'info'
      },
      ui: {
        theme: 'light',
        language: 'en',
        timezone: 'Asia/Jakarta',
        date_format: 'DD/MM/YYYY',
        currency: 'IDR'
      },
      integration: {
        next_public_api_url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
        database_url: process.env.DATABASE_URL || 'configured',
        external_apis: []
      }
    }

    // Filter by category if specified
    let filteredSettings = systemSettings
    if (category && systemSettings[category as keyof typeof systemSettings]) {
      filteredSettings = { [category]: systemSettings[category as keyof typeof systemSettings] }
    }

    return NextResponse.json({
      status: 'success',
      data: {
        settings: filteredSettings,
        categories: Object.keys(systemSettings)
      },
      message: 'System settings retrieved successfully'
    })

  } catch (error) {
    console.error('Admin settings API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve system settings',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin permissions
    const userRole = session.user.role as string
    if (!['ADMIN', 'SALES_MANAGER', 'BS_MANAGER'].includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { category, key, value, type = 'string', isRequired = false, isEncrypted = false } = body

    if (!category || !key) {
      return NextResponse.json(
        { status: 'error', message: 'Category and key are required' },
        { status: 400 }
      )
    }

    // Create setting (store in audit log for now)
    const setting = {
      category,
      key,
      value,
      type,
      isRequired,
      isEncrypted,
      metadata: JSON.stringify({
        updatedBy: session.user.name,
        updatedAt: new Date().toISOString(),
        previousValue: null
      }),
      createdById: parseInt(session.user.id),
      createdBy: session.user.name,
      createdAt: new Date()
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'system_setting_updated',
        meta: JSON.stringify(setting),
        resourceType: 'system_setting'
      }
    })

    // In production, this would update a system_settings table
    // For now, we'll simulate the update
    const updatedSetting = {
      category,
      key,
      value,
      type,
      isRequired,
      isEncrypted,
      updatedAt: new Date(),
      updatedBy: session.user.name
    }

    return NextResponse.json({
      status: 'success',
      data: {
        setting: updatedSetting
      },
      message: 'System setting updated successfully'
    })

  } catch (error) {
    console.error('Admin settings update error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update system setting',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin permissions
    const userRole = session.user.role as string
    if (!['ADMIN', 'SALES_MANAGER', 'BS_MANAGER'].includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const settingId = parseInt(searchParams.get('id') as string)
    const body = await request.json()

    if (!settingId) {
      return NextResponse.json(
        { status: 'error', message: 'Setting ID is required' },
        { status: 400 }
      )
    }

    // Update setting (store in audit log for now)
    const updateData = {
      metadata: JSON.stringify({
        updatedBy: session.user.name,
        updatedAt: new Date().toISOString(),
        previousValue: body.previousValue
      }),
      updatedAt: new Date()
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'system_setting_updated',
        meta: JSON.stringify({
          settingId,
          updateData,
          action: 'update'
        }),
        resourceType: 'system_setting'
      }
    })

    // In production, this would update a system_settings table
    const updatedSetting = {
      id: settingId,
      ...updateData,
      updatedBy: session.user.name
    }

    return NextResponse.json({
      status: 'success',
      data: {
        setting: updatedSetting
      },
      message: 'System setting updated successfully'
    })

  } catch (error) {
    console.error('Admin settings update error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update system setting',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin permissions
    const userRole = session.user.role as string
    if (!['ADMIN', 'SALES_MANAGER', 'BS_MANAGER'].includes(userRole)) {
      return NextResponse.json(
        { status: 'error', message: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const settingId = parseInt(searchParams.get('id') as string)

    if (!settingId) {
      return NextResponse.json(
        { status: 'error', message: 'Setting ID is required' },
        { status: 400 }
      )
    }

    // Delete setting (store in audit log for now)
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: 'system_setting_deleted',
        meta: JSON.stringify({
          settingId,
          action: 'delete'
        }),
        resourceType: 'system_setting'
      }
    })

    return NextResponse.json({
      status: 'success',
      data: {
        deletedSettingId: settingId
      },
      message: 'System setting deleted successfully'
    })

  } catch (error) {
    console.error('Admin settings deletion error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete system setting',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
```

### **🔹 Step 4: AI Weekly Report API (Bab 16)**
