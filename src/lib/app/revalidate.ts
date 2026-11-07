import { revalidatePath } from "next/cache";

export function revalidateWork() {
  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/today");
  revalidatePath("/completed");
  revalidatePath("/projects");
  revalidatePath("/projects/[id]", "page");
  revalidatePath("/areas");
  revalidatePath("/areas/[id]", "page");
  revalidatePath("/templates");
  revalidatePath("/recurrence");
}
