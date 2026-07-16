import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";

export async function requireAdminApi() {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return {
      adminUser: null,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Admin access required.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    adminUser,
    errorResponse: null,
  };
}