"use server";

import { requireUser } from "@/lib/auth/session";
import { revalidateWork } from "@/lib/app/revalidate";
import {
  areaInputSchema,
  areaUpdateSchema,
  moveRecords,
  projectInputSchema,
  projectUpdateSchema,
  recordIdSchema,
  zodMessage,
  type TDirection,
} from "@/lib/organization/model";
import { emptyToNull } from "@/lib/tasks/model";

export type TOrganizationActionState = {
  error: string | null;
};

const areaSaveError = "Не удалось сохранить сферу.";
const projectSaveError = "Не удалось сохранить проект.";

function ok(): TOrganizationActionState {
  return { error: null };
}

function failed(message: string): TOrganizationActionState {
  return { error: message };
}

async function nextAreaPosition(userId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("areas")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.position ?? -1) + 1;
}

async function nextProjectPosition(userId: string, areaId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("projects")
    .select("position")
    .eq("user_id", userId)
    .eq("area_id", areaId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.position ?? -1) + 1;
}

async function ownsArea(userId: string, areaId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("areas").select("id").eq("id", areaId).eq("user_id", userId).maybeSingle();

  return Boolean(data);
}

export async function createArea(input: { name: string; description: string }): Promise<TOrganizationActionState> {
  const parsed = areaInputSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const position = await nextAreaPosition(userId);
  const { error } = await supabase.from("areas").insert({
    user_id: userId,
    name: parsed.data.name,
    description: emptyToNull(parsed.data.description),
    position,
  });

  if (error) {
    return failed(areaSaveError);
  }

  revalidateWork();
  return ok();
}

export async function updateArea(input: {
  id: string;
  name: string;
  description: string;
}): Promise<TOrganizationActionState> {
  const parsed = areaUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("areas")
    .update({
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
    })
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .select("id");

  if (error || !data?.length) {
    return failed(areaSaveError);
  }

  revalidateWork();
  return ok();
}

export async function deleteArea(id: string): Promise<TOrganizationActionState> {
  const parsed = recordIdSchema.safeParse(id);

  if (!parsed.success) {
    return failed(areaSaveError);
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("areas").delete().eq("id", parsed.data).eq("user_id", userId).select("id");

  if (error || !data?.length) {
    return failed("Не удалось удалить сферу.");
  }

  revalidateWork();
  return ok();
}

export async function moveArea(id: string, direction: TDirection): Promise<TOrganizationActionState> {
  const parsed = recordIdSchema.safeParse(id);

  if (!parsed.success || (direction !== "up" && direction !== "down")) {
    return failed("Не удалось изменить порядок.");
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("areas")
    .select("id, position")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error || !data) {
    return failed("Не удалось изменить порядок.");
  }

  const next = moveRecords(data, parsed.data, direction);

  for (const area of next) {
    const previous = data.find((item) => item.id === area.id);

    if (!previous || previous.position === area.position) {
      continue;
    }

    const update = await supabase.from("areas").update({ position: area.position }).eq("id", area.id).eq("user_id", userId);

    if (update.error) {
      return failed("Не удалось изменить порядок.");
    }
  }

  revalidateWork();
  return ok();
}

export async function createProject(input: {
  name: string;
  description: string;
  areaId: string;
}): Promise<TOrganizationActionState> {
  const parsed = projectInputSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const areaExists = await ownsArea(userId, parsed.data.areaId);

  if (!areaExists) {
    return failed(projectSaveError);
  }

  const position = await nextProjectPosition(userId, parsed.data.areaId);
  const { error } = await supabase.from("projects").insert({
    user_id: userId,
    area_id: parsed.data.areaId,
    name: parsed.data.name,
    description: emptyToNull(parsed.data.description),
    position,
    status: "active",
  });

  if (error) {
    return failed(projectSaveError);
  }

  revalidateWork();
  return ok();
}

export async function updateProject(input: {
  id: string;
  name: string;
  description: string;
  areaId: string;
}): Promise<TOrganizationActionState> {
  const parsed = projectUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const { data: current, error: currentError } = await supabase
    .from("projects")
    .select("id, area_id")
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError || !current) {
    return failed(projectSaveError);
  }

  if (current.area_id !== parsed.data.areaId) {
    const areaExists = await ownsArea(userId, parsed.data.areaId);

    if (!areaExists) {
      return failed(projectSaveError);
    }

    const { count, error: countError } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("project_id", current.id);

    if (countError || (count ?? 0) > 0) {
      return failed("Сферу проекта с задачами нельзя сменить.");
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      area_id: parsed.data.areaId,
    })
    .eq("id", current.id)
    .eq("user_id", userId)
    .select("id");

  if (error || !data?.length) {
    return failed(projectSaveError);
  }

  revalidateWork();
  return ok();
}

export async function deleteProject(id: string): Promise<TOrganizationActionState> {
  const parsed = recordIdSchema.safeParse(id);

  if (!parsed.success) {
    return failed("Не удалось удалить проект.");
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .select("id");

  if (error || !data?.length) {
    return failed("Не удалось удалить проект.");
  }

  revalidateWork();
  return ok();
}

export async function moveProject(id: string, direction: TDirection): Promise<TOrganizationActionState> {
  const parsed = recordIdSchema.safeParse(id);

  if (!parsed.success || (direction !== "up" && direction !== "down")) {
    return failed("Не удалось изменить порядок.");
  }

  const { supabase, userId } = await requireUser();
  const { data: current, error: currentError } = await supabase
    .from("projects")
    .select("id, area_id")
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError || !current) {
    return failed("Не удалось изменить порядок.");
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, position")
    .eq("user_id", userId)
    .eq("area_id", current.area_id)
    .order("position", { ascending: true });

  if (error || !data) {
    return failed("Не удалось изменить порядок.");
  }

  const next = moveRecords(data, parsed.data, direction);

  for (const project of next) {
    const previous = data.find((item) => item.id === project.id);

    if (!previous || previous.position === project.position) {
      continue;
    }

    const update = await supabase
      .from("projects")
      .update({ position: project.position })
      .eq("id", project.id)
      .eq("user_id", userId);

    if (update.error) {
      return failed("Не удалось изменить порядок.");
    }
  }

  revalidateWork();
  return ok();
}
