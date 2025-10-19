import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardCard from "@/components/DashboardCard";
import ProposalTable from "@/components/ProposalTable";
import DashboardCharts from "@/components/DashboardCharts";
import {
  BarChart3,
  FileText,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch dashboard data based on user role
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      projects: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          requestedBy: {
            select: { name: true, email: true },
          },
          proposals: {
            select: { status: true },
          },
        },
      },
    },
  });

  // Fetch statistics
  const [
    totalProjects,
    totalProposals,
    pendingProjects,
    approvedProjects,
    recentProjects,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.proposal.count(),
    prisma.project.count({
      where: {
        status: {
          in: [
            "PENDING_SALES_MANAGER_APPROVAL",
            "PENDING_PO_COMPLETION",
            "PENDING_BS_PROPOSAL",
          ],
        },
      },
    }),
    prisma.project.count({ where: { status: "PROPOSAL_FINALIZED" } }),
    prisma.project.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: {
          select: { name: true, email: true },
        },
        proposals: {
          select: { status: true },
        },
      },
    }),
  ]);

  // Calculate status distribution for charts
  const statusStats = await prisma.project.groupBy({
    by: ["status"],
    _count: {
      id: true,
    },
  });

  // Prepare chart data
  const chartData = {
    pipeline: {
      labels: statusStats.map((s) => s.status.replace(/_/g, " ")),
      datasets: [
        {
          label: "Projects by Status",
          data: statusStats.map((s) => s._count.id),
          backgroundColor: [
            "rgba(99, 102, 241, 0.8)",
            "rgba(34, 197, 94, 0.8)",
            "rgba(251, 146, 60, 0.8)",
            "rgba(239, 68, 68, 0.8)",
            "rgba(168, 85, 247, 0.8)",
            "rgba(236, 72, 153, 0.8)",
            "rgba(14, 165, 233, 0.8)",
          ],
          borderColor: [
            "rgba(99, 102, 241, 1)",
            "rgba(34, 197, 94, 1)",
            "rgba(251, 146, 60, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(168, 85, 247, 1)",
            "rgba(236, 72, 153, 1)",
            "rgba(14, 165, 233, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    status: {
      labels: ["Draft", "In Review", "Approved", "Rejected", "Closed"],
      datasets: [
        {
          label: "Proposals by Status",
          data: [
            statusStats.find((s) => s.status === "DRAFT")?._count.id || 0,
            statusStats.find((s) => s.status.includes("PENDING"))?._count.id ||
              0,
            statusStats.find((s) => s.status === "PROPOSAL_FINALIZED")?._count
              .id || 0,
            statusStats.find((s) => s.status.includes("REJECTED"))?._count.id ||
              0,
            statusStats.find((s) => s.status === "CLOSED")?._count.id || 0,
          ],
          backgroundColor: [
            "rgba(156, 163, 175, 0.8)",
            "rgba(251, 146, 60, 0.8)",
            "rgba(34, 197, 94, 0.8)",
            "rgba(239, 68, 68, 0.8)",
            "rgba(107, 114, 128, 0.8)",
          ],
          borderColor: [
            "rgba(156, 163, 175, 1)",
            "rgba(251, 146, 60, 1)",
            "rgba(34, 197, 94, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(107, 114, 128, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    timeline: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "Submitted",
          data: [3, 5, 8, 12, 15, 18],
          borderColor: "rgba(99, 102, 241, 1)",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "Approved",
          data: [1, 3, 5, 8, 12, 15],
          borderColor: "rgba(34, 197, 94, 1)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
  };

  // Transform projects data for ProposalTable
  const proposalData = recentProjects.map((project) => ({
    id: project.id,
    title: project.projectName,
    status: project.status,
    budget: project.budgetEstimate,
    createdAt: project.createdAt.toISOString(),
    requestedBy: project.requestedBy,
    projectCode: project.projectCode,
    deadline: project.endDate?.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user?.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Here's what's happening with your proposals today.
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            New Project
          </button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Total Projects"
          value={totalProjects}
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          change={{
            value: 12,
            type: "increase",
            period: "from last month",
          }}
          badge={{
            text: "Active",
            variant: "default",
          }}
          onClick={() => console.log("Navigate to projects")}
        />

        <DashboardCard
          title="Total Proposals"
          value={totalProposals}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          change={{
            value: 8,
            type: "increase",
            period: "from last month",
          }}
          onClick={() => console.log("Navigate to proposals")}
        />

        <DashboardCard
          title="Pending Review"
          value={pendingProjects}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          change={{
            value: -3,
            type: "decrease",
            period: "from last week",
          }}
          badge={{
            text: "Action Required",
            variant: "secondary",
          }}
          onClick={() => console.log("Navigate to pending items")}
        />

        <DashboardCard
          title="Approved Projects"
          value={approvedProjects}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          change={{
            value: 15,
            type: "increase",
            period: "from last month",
          }}
          badge={{
            text: "Success",
            variant: "secondary",
          }}
          onClick={() => console.log("Navigate to approved projects")}
        />
      </div>

      {/* Charts */}
      <DashboardCharts data={chartData} />

      {/* Recent Proposals Table */}
      <ProposalTable
        proposals={proposalData}
        onView={(proposal) => console.log("View proposal:", proposal)}
        onEdit={(proposal) => console.log("Edit proposal:", proposal)}
        onDownload={(proposal) => console.log("Download proposal:", proposal)}
      />

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Team Members"
          value="8"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="Active users this month"
        />

        <DashboardCard
          title="Avg. Response Time"
          value="2.5 days"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          change={{
            value: -20,
            type: "increase",
            period: "improvement",
          }}
        />

        <DashboardCard
          title="Alerts"
          value="3"
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
          badge={{
            text: "New",
            variant: "destructive",
          }}
          description="Requires attention"
          onClick={() => console.log("Navigate to alerts")}
        />
      </div>
    </div>
  );
}
