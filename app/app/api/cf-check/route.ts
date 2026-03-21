// @ts-nocheck
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { verifyCfJwt } from "@/lib/cfAccess";

export async function GET(req: NextRequest) {
  const token =
    req.headers.get("cf-access-jwt-assertion") ||
    req.cookies.get("CF_Authorization")?.value;

  if (!token) return NextResponse.json({ valid: false });

  const result = await verifyCfJwt(token);
  if (!result?.email) return NextResponse.json({ valid: false });

  return NextResponse.json({ valid: true, token, email: result.email });
}
