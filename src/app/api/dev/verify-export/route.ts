import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }

  try {
    const root = process.cwd();
    const output = execSync("node scripts/verify-template.mjs", {
      cwd: root,
      encoding: "utf-8",
    });
    return NextResponse.json({ ok: true, output });
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      {
        ok: false,
        output: error.stdout ?? "",
        error: error.stderr ?? error.message,
      },
      { status: 500 },
    );
  }
}
