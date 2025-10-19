import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mock AI function for offline demo
async function mockParseRFP(content: string) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Extract mock data based on content patterns
  const mockExtractedData = {
    client: extractCompany(content) || "PT. Demo Company",
    deadline:
      extractDate(content) ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    budget: extractBudget(content) || 500000000,
    requirements: [
      "SMS blast service for 100,000 recipients",
      "Delivery rate monitoring dashboard",
      "Real-time reporting API",
      "Message template management",
      "Compliance with Indonesian telecom regulations",
    ],
    scope: [
      "Platform setup and configuration",
      "Message template design",
      "API integration with client system",
      "Testing and validation",
      "Training and documentation",
    ],
    timeline: [
      { phase: "Setup", duration: "3 days" },
      { phase: "Integration", duration: "5 days" },
      { phase: "Testing", duration: "2 days" },
      { phase: "Go-live", duration: "1 day" },
    ],
  };

  return mockExtractedData;
}

// Helper functions for data extraction
function extractCompany(content: string): string | null {
  const companyPatterns = [
    /(?:PT|CV|PT\.)\s+([A-Za-z\s&]+)/gi,
    /(?:company|organization):\s*([A-Za-z\s&]+)/gi,
  ];

  for (const pattern of companyPatterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractDate(content: string): string | null {
  const datePatterns = [
    /(?:deadline|due date):\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
    /(?:deadline|due date):\s*(\d{4}-\d{2}-\d{2})/gi,
  ];

  for (const pattern of datePatterns) {
    const match = content.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractBudget(content: string): number | null {
  const budgetPatterns = [
    /(?:budget|price|cost):\s*Rp?\s*([\d,.]+)/gi,
    /(?:budget|price|cost):\s*\$?\s*([\d,.]+)/gi,
  ];

  for (const pattern of budgetPatterns) {
    const match = content.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/[.,]/g, "");
      const num = parseInt(cleaned);
      return isNaN(num) ? null : num;
    }
  }
  return null;
}

// OpenAI AI function (if API key available)
async function openAIParseRFP(content: string) {
  if (!process.env.OPENAI_API_KEY) {
    return mockParseRFP(content);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert RFP analyst. Extract structured information from the following RFP document and return it as JSON with the following structure:
            {
              "client": "Company name",
              "deadline": "ISO date string",
              "budget": number,
              "requirements": ["requirement1", "requirement2"],
              "scope": ["scope1", "scope2"],
              "timeline": [{"phase": "phase1", "duration": "duration1"}]
            }`,
          },
          {
            role: "user",
            content: content,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI API error");
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI API error, falling back to mock:", error);
    return mockParseRFP(content);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { status: "error", message: "No file uploaded" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.",
        },
        { status: 400 },
      );
    }

    // Read file content
    const buffer = await file.arrayBuffer();
    let content = "";

    // For demo purposes, we'll treat all files as text
    // In production, you'd use proper parsers for PDF/DOC files
    content = new TextDecoder().decode(buffer);

    if (!content.trim()) {
      return NextResponse.json(
        { status: "error", message: "File is empty or could not be read" },
        { status: 400 },
      );
    }

    // Process with AI
    const extractedData = await openAIParseRFP(content);

    // Create project record if client wants
    const { createProject } = await request
      .json()
      .catch(() => ({ createProject: false }));

    let project = null;
    if (createProject) {
      project = await prisma.project.create({
        data: {
          projectCode: `RFP-${Date.now()}`,
          projectName: `${extractedData.client} - RFP`,
          templateKey: "custom",
          requestedById: parseInt(session.user.id),
          status: "DRAFT",
          budgetEstimate: extractedData.budget,
          endDate: new Date(extractedData.deadline),
          rfpForm: {
            create: {
              formData: JSON.stringify(extractedData),
              submittedById: parseInt(session.user.id),
              submittedAt: new Date(),
            },
          },
        },
        include: {
          rfpForm: true,
          requestedBy: true,
        },
      });
    }

    return NextResponse.json({
      status: "success",
      data: {
        extractedData,
        project,
        processingTime: new Date().toISOString(),
      },
      message: "RFP parsed successfully",
    });
  } catch (error) {
    console.error("RFP parsing error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to parse RFP document",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

// Get endpoint to retrieve parsed RFP data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { status: "error", message: "Project ID required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      include: {
        rfpForm: true,
        requestedBy: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { status: "error", message: "Project not found" },
        { status: 404 },
      );
    }

    // Check permissions
    if (
      project.requestedById !== parseInt(session.user.id) &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { status: "error", message: "Access denied" },
        { status: 403 },
      );
    }

    const parsedData = project.rfpForm
      ? JSON.parse(project.rfpForm.formData)
      : null;

    return NextResponse.json({
      status: "success",
      data: {
        project,
        parsedData,
      },
      message: "RFP data retrieved successfully",
    });
  } catch (error) {
    console.error("RFP retrieval error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to retrieve RFP data",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
