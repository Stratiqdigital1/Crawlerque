import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Function to fetch traffic data (replace this with your actual API or data source)
const fetchTrafficData = async (projectId: string) => {
  try {
    // Mock function: Replace this with actual traffic-fetching logic
    // Example: Fetch traffic from Google Analytics, SEMrush, etc.
    const trafficData = {
      pageViews: 1000, // Example data
      uniqueVisitors: 500,
      bounceRate: 40,  // Example metric
    };
    return trafficData;
  } catch (error) {
    console.error("Failed to fetch traffic data:", error);
    return null;
  }
};

export async function GET() {
  try {
    const project = await prisma.project.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!project) {
      return NextResponse.json({
        success: false,
        error: "No project found",
      });
    }

    // Fetch prompts related to the project
    const prompts = Array.isArray(project.prompts)
  ? (project.prompts as any[])
  : [];

    // Fetch traffic data for the current project
    const trafficData = await fetchTrafficData(project.id);

    // Send both the prompts and traffic data in the response
    return NextResponse.json({
      success: true,
      prompts,
      traffic: trafficData,  // Include traffic data here
    });
  } catch (error) {
    console.error("Prompts API error:", error);

    return NextResponse.json({
      success: false,
      error: "Failed to fetch prompts",
    });
  }
}