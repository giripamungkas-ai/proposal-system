import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Role-based folder permissions
const ROLE_PERMISSIONS = {
  SALES: ["attachments"],
  PRODUCT_OWNER: ["attachments", "technical"],
  BUSINESS_SOLUTION: ["attachments", "proposal"],
  BS_MANAGER: ["attachments", "proposal", "technical"],
  PROJECT_MANAGER: ["attachments", "technical", "proposal", "bidding"],
  BIDDING_TEAM: ["attachments", "bidding"],
  ADMIN: ["attachments", "technical", "proposal", "bidding"],
  SALES_MANAGER: ["attachments", "technical", "proposal", "bidding"],
};

// Allowed file types per folder
const FOLDER_FILE_TYPES = {
  attachments: [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".jpg",
    ".png",
    ".zip",
  ],
  technical: [".pdf", ".doc", ".docx", ".txt", ".xlsx", ".csv"],
  proposal: [".pdf", ".doc", ".docx"],
  bidding: [".pdf", ".doc", ".docx", ".xlsx", ".zip"],
};

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function createProjectFolders(projectId: number) {
  const basePath = join(
    process.cwd(),
    "public",
    "uploads",
    `PROJECT_${projectId}`,
  );
  const folders = ["attachments", "technical", "proposal", "bidding"];

  for (const folder of folders) {
    const folderPath = join(basePath, folder);
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true });
    }
  }

  return basePath;
}

async function checkRolePermission(
  userRole: string,
  folder: string,
): Promise<boolean> {
  const allowedFolders =
    ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
  return allowedFolders.includes(folder);
}

async function validateFileType(file: File, folder: string): Promise<boolean> {
  const allowedTypes =
    FOLDER_FILE_TYPES[folder as keyof typeof FOLDER_FILE_TYPES] || [];
  const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
  return allowedTypes.includes(fileExtension);
}

async function addWatermarkToPDF(
  filePath: string,
  projectName: string,
  uploaderName: string,
  status: string,
): Promise<void> {
  // This is a simplified watermark implementation
  // In production, you would use a PDF library like pdf-lib or hummus
  const fs = require("fs");
  const content = fs.readFileSync(filePath, "utf8");

  const watermark = `${status.toUpperCase()} - ${projectName} - ${uploaderName} - ${new Date().toLocaleDateString("id-ID")}`;

  // For demo purposes, we'll just add a text file with watermark info
  // In production, you'd use proper PDF manipulation
  const watermarkPath = filePath.replace(".pdf", "_watermark_info.txt");
  fs.writeFileSync(watermarkPath, `WATERMARK: ${watermark}`);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const projectId = parseInt(formData.get("projectId") as string);
    const folder = formData.get("folder") as string;
    const status = (formData.get("status") as string) || "DRAFT";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { status: "error", message: "No files uploaded" },
        { status: 400 },
      );
    }

    if (!projectId || !folder) {
      return NextResponse.json(
        { status: "error", message: "Project ID and folder are required" },
        { status: 400 },
      );
    }

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { requestedBy: true },
    });

    if (!project) {
      return NextResponse.json(
        { status: "error", message: "Project not found" },
        { status: 404 },
      );
    }

    // Check role-based access
    const userRole = session.user.role as string;
    const hasPermission = await checkRolePermission(userRole, folder);

    // Sales can only access their own projects
    if (
      userRole === "SALES" &&
      project.requestedById !== parseInt(session.user.id)
    ) {
      return NextResponse.json(
        { status: "error", message: "Access denied" },
        { status: 403 },
      );
    }

    if (!hasPermission) {
      return NextResponse.json(
        {
          status: "error",
          message: `Role ${userRole} does not have access to ${folder} folder`,
        },
        { status: 403 },
      );
    }

    // Create project folders if they don't exist
    const basePath = await createProjectFolders(projectId);
    const folderPath = join(basePath, folder);

    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File size exceeds 10MB limit`);
          continue;
        }

        // Validate file type
        const isValidType = await validateFileType(file, folder);
        if (!isValidType) {
          errors.push(
            `${file.name}: File type not allowed for ${folder} folder`,
          );
          continue;
        }

        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
        const uniqueFileName = `${timestamp}_${file.name}`;
        const filePath = join(folderPath, uniqueFileName);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Add watermark to PDF files
        if (fileExtension === ".pdf") {
          await addWatermarkToPDF(
            filePath,
            project.projectName,
            session.user.name || "Unknown",
            status,
          );
        }

        // Save file record to database
        const fileRecord = await prisma.attachment.create({
          data: {
            projectId,
            uploadedById: parseInt(session.user.id),
            filename: file.name,
            filepath: `/uploads/PROJECT_${projectId}/${folder}/${uniqueFileName}`,
            filetype: file.type,
            createdAt: new Date(),
          },
        });

        uploadedFiles.push({
          id: fileRecord.id,
          originalName: file.name,
          filename: uniqueFileName,
          size: file.size,
          type: file.type,
          path: fileRecord.filepath,
          folder,
          uploadedAt: fileRecord.createdAt,
        });
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        errors.push(`${file.name}: Upload failed`);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        action: "files_uploaded",
        meta: JSON.stringify({
          projectId,
          folder,
          fileCount: uploadedFiles.length,
          filenames: uploadedFiles.map((f) => f.originalName),
        }),
        projectId,
      },
    });

    // Trigger notification for file upload
    if (uploadedFiles.length > 0) {
      try {
        await fetch(
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/notifications`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "FILE_UPLOADED",
              data: {
                projectName: project.projectName,
                fileName: uploadedFiles[0].originalName,
                folder,
                uploadedByName: session.user.name,
                fileCount: uploadedFiles.length,
              },
              sendEmail: false,
            }),
          },
        );
      } catch (notificationError) {
        console.error("Failed to trigger notification:", notificationError);
      }
    }

    return NextResponse.json({
      status: "success",
      data: {
        uploadedFiles,
        errors,
        summary: {
          total: files.length,
          successful: uploadedFiles.length,
          failed: errors.length,
        },
      },
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to upload files",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

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
    const projectId = parseInt(searchParams.get("projectId") as string);

    if (!projectId) {
      return NextResponse.json(
        { status: "error", message: "Project ID is required" },
        { status: 400 },
      );
    }

    // Verify project exists and user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        requestedBy: true,
        attachments: {
          include: {
            uploadedBy: {
              select: { name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { status: "error", message: "Project not found" },
        { status: 404 },
      );
    }

    // Check access permissions
    const userRole = session.user.role as string;
    if (
      userRole === "SALES" &&
      project.requestedById !== parseInt(session.user.id)
    ) {
      return NextResponse.json(
        { status: "error", message: "Access denied" },
        { status: 403 },
      );
    }

    // Group files by folder
    const filesByFolder = project.attachments.reduce(
      (acc, file) => {
        const folder = file.filepath.split("/")[3]; // Extract folder from path
        if (!acc[folder]) {
          acc[folder] = [];
        }
        acc[folder].push({
          id: file.id,
          filename: file.filename,
          originalName: file.filename,
          filepath: file.filepath,
          filetype: file.filetype,
          uploadedBy: file.uploadedBy,
          uploadedAt: file.createdAt,
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Filter folders based on user role
    const allowedFolders =
      ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
    const filteredFiles = Object.keys(filesByFolder)
      .filter((folder) => allowedFolders.includes(folder))
      .reduce(
        (acc, folder) => {
          acc[folder] = filesByFolder[folder];
          return acc;
        },
        {} as Record<string, any[]>,
      );

    return NextResponse.json({
      status: "success",
      data: {
        project: {
          id: project.id,
          projectCode: project.projectCode,
          projectName: project.projectName,
          status: project.status,
        },
        files: filteredFiles,
        availableFolders: allowedFolders,
        permissions: {
          canUpload: allowedFolders.length > 0,
          folders: allowedFolders,
        },
      },
      message: "Files retrieved successfully",
    });
  } catch (error) {
    console.error("File list error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to retrieve files",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
