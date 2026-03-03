import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasSessionCookie = Boolean(cookieStore.get("ptbiz_user")?.value);

  redirect(hasSessionCookie ? "/dashboard" : "/login");
}
