import { NextResponse } from "next/server";
import { readFile, access } from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEV_AUTH_COOKIE, isDevAuthSession } from "@/lib/dev-auth";

const ALLOWED_FILES = new Set([
  "budget-tracker-template.xlsx",
  "instruction.html",
  "instruction.pdf",
]);

async function ensureTemplateExists(file: string): Promise<void> {
  if (file !== "budget-tracker-template.xlsx") return;
  const filePath = path.join(process.cwd(), "private", "downloads", file);
  try {
    await access(filePath);
  } catch {
    execSync("node scripts/generate-template.mjs", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  if (!ALLOWED_FILES.has(file)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const devToken = cookieStore.get(DEV_AUTH_COOKIE)?.value;
  const devAuthorized = isDevAuthSession(devToken);

  const supabase = await createClient();
  const user = supabase
    ? (await supabase.auth.getUser()).data.user
    : null;

  if (!user && !devAuthorized) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/account");
    return NextResponse.redirect(loginUrl);
  }

  await ensureTemplateExists(file);

  const filePath = path.join(process.cwd(), "private", "downloads", file);

  try {
    const buffer = await readFile(filePath);
    const contentType = file.endsWith(".xlsx")
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : file.endsWith(".pdf")
        ? "application/pdf"
        : "text/html; charset=utf-8";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": file.endsWith(".html")
          ? "inline"
          : `attachment; filename="${file}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "File not found. Run npm run generate:template" },
      { status: 404 },
    );
  }
}
