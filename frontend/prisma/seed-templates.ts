import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const mdmediaTemplates = [
  {
    code: "SMS_CAMPAIGN",
    name: "SMS Campaign Services",
    description: "Comprehensive SMS marketing campaign solutions for customer engagement",
    type: "SMS_CAMPAIGN",
    category: "MARKETING",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with dynamic form configuration",
    createdBy: 1
  },
  {
    code: "WHATSAPP_CAMPAIGN",
    name: "WhatsApp Campaign Management",
    description: "Business WhatsApp marketing and engagement platform with automated messaging",
    type: "WHATSAPP_CAMPAIGN",
    category: "MARKETING",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with bot automation features",
    createdBy: 1
  },
  {
    code: "DIGITAL_ADVERTISING",
    name: "Digital Advertising Solutions",
    description: "Complete digital marketing and advertising campaign management",
    type: "DIGITAL_ADVERTISING",
    category: "MARKETING",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with multiple ad platforms",
    createdBy: 1
  },
  {
    code: "MESSAGING_SERVICES",
    name: "Messaging Platform Services",
    description: "Omni-channel messaging services including SMS, WhatsApp, and enterprise messaging",
    type: "MESSAGING_SERVICES",
    category: "PRODUCT",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with integration requirements",
    createdBy: 1
  },
  {
    code: "DATA_ANALYTICS_SOLUTION",
    name: "Data Analytics & Business Intelligence",
    description: "Comprehensive data analytics and BI solutions for business intelligence",
    type: "DATA_ANALYTICS_SOLUTION",
    category: "PRODUCT",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with BI analytics tools",
    createdBy: 1
  },
  {
    code: "ADEXCELERATE",
    name: "AdXcelerate Programmatic Advertising",
    description: "Programmatic advertising and real-time bidding platform solution",
    type: "ADEXCELERATE",
    category: "PRODUCT",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with DSP/SSP platforms",
    createdBy: 1
  },
  {
    code: "MEDIA_PLACEMENT",
    name: "Media Placement & Buying Services",
    description: "Media planning, buying, and placement services across various channels",
    type: "MEDIA_PLACEMENT",
    category: "SERVICE",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with media channel options",
    createdBy: 1
  },
  {
    code: "CREATIVE_ACTIVATION",
    name: "Creative Design & Activation Services",
    description: "Creative content design, production, and campaign activation services",
    type: "CREATIVE_ACTIVATION",
    category: "SERVICE",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with creative deliverables",
    createdBy: 1
  },
  {
    code: "CONTENT_SERVICES",
    name: "Content Creation & Management Services",
    description: "Content strategy, creation, management, and distribution services",
    type: "CONTENT_SERVICES",
    category: "SERVICE",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with content platforms",
    createdBy: 1
  },
  {
    code: "COMMERCIAL_PRINTING",
    name: "Commercial Printing & Production Services",
    description: "Commercial printing, production, and distribution services",
    type: "COMMERCIAL_PRINTING",
    category: "SERVICE",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with printing specifications",
    createdBy: 1
  },
  {
    code: "SMARTCARD_PRINTING",
    name: "Smart Card Printing & Personalization Services",
    description: "Smart card design, printing, personalization, and production services",
    type: "SMARTCARD_PRINTING",
    category: "SERVICE",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with card technologies",
    createdBy: 1
  },
  {
    code: "PROJECT_ACCOUNT",
    name: "Project Account Management Services",
    description: "End-to-end project account management and implementation services",
    type: "PROJECT_ACCOUNT",
    category: "PROJECT",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with project timeline",
    createdBy: 1
  },
  {
    code: "DIGIPOP",
    name: "Digital Pop Advertising Network",
    description: "Digital Point of Purchase advertising network and platform",
    type: "DIGIPOP",
    category: "PRODUCT",
    version: "1.0",
    isActive: true,
    requiredFields: "20 mandatory fields with ad format types",
    createdBy: 1
  }
]

async function main() {
  try {
    console.log("🌱 Seeding MDMEDIA Templates...")
    
    for (const template of mdmediaTemplates) {
      const existing = await prisma.template.findUnique({
        where: { code: template.code }
      })
      
      if (!existing) {
        await prisma.template.create({
          data: template
        })
        console.log(`✅ Created template: ${template.name} (${template.code})`)
      }
    }
    
    console.log("✅ Templates seeding completed successfully!")
  } catch (error) {
    console.error("❌ Error seeding templates:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
