import { randomBytes } from "crypto";
import { createAdminClient, isSupabaseAdminConfigured } from "./supabase/admin";

export function generateSecurePassword(length = 12): string {
  const chars =
    "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function provisionUserAfterPayment(
  email: string,
  fullName: string,
): Promise<{ password: string; created: boolean } | null> {
  if (!isSupabaseAdminConfigured()) {
    console.warn("Supabase not configured — skipping user provisioning");
    return null;
  }

  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    return { password: "", created: false };
  }

  const password = generateSecurePassword();

  const { data, error } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    console.error("Failed to create Supabase user:", error.message);
    throw error;
  }

  if (data.user) {
    await admin.from("profiles").upsert({
      id: data.user.id,
      email: normalizedEmail,
      full_name: fullName,
    });
  }

  return { password, created: true };
}
