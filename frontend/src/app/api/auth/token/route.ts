import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "../[...nextauth]/route";

export async function GET(req: NextRequest) {
  const secret = authOptions.secret as string;

  const token = await getToken({ req, secret, raw: true });

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ token });
}
