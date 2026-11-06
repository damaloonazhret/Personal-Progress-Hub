"use server";

import { requireUser } from "@/lib/auth/session";
import { revalidateWork } from "@/lib/app/revalidate";
import { moveRecords, type TDirection } from "@/lib/organization/model";
import { emptyToNull } from "@/lib/tasks/model";
import { templateInputSchema, templateUpdateSchema, zodMessage } from "@/lib/templates/model";
import { z } from "zod";

export type TTemplateActionState = {
  error: string | null;
};

const saveError = "Не удалось сохранить шаблон.";

function ok(): TTemplateActionState {
  return { error: null };
}

function failed(message: string): TTemplateActionState {
  return { error: message };
}

async function nextTemplatePosition(userId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("task_templates")
    .select("position")
    .eq("user_id", userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.position ?? -1) + 1;
}

async function resolvePlacement(userId: string, areaId: string | null, projectId: string | null) {
  const { supabase } = await requireUser();

  if (projectId) {
    const { data } = await supabase
      .from("projects")
      .select("id, area_id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data || (areaId && areaId !== data.area_id)) {
      return null;
    }

    return { areaId: data.area_id, projectId: data.id };
  }

  if (areaId) {
    const { data } = await supabase.from("areas").select("id").eq("id", areaId).eq("user_id", userId).maybeSingle();

    if (!data) {
      return null;
    }

    return { areaId: data.id, projectId: null };
  }

  return { areaId: null, projectId: null };
}

export async function createTemplate(input: {
  title: string;
  description: string;
  priority: string;
  areaId: string;
  projectId: string;
}): Promise<TTemplateActionState> {
  const parsed = templateInputSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const placement = await resolvePlacement(userId, parsed.data.areaId, parsed.data.projectId);

  if (!placement) {
    return failed(saveError);
  }

  const position = await nextTemplatePosition(userId);
  const { error } = await supabase.from("task_templates").insert({
    user_id: userId,
    title: parsed.data.title,
    description: emptyToNull(parsed.data.description),
    priority: parsed.data.priority,
    area_id: placement.areaId,
    project_id: placement.projectId,
    position,
  });

  if (error) {
    return failed(saveError);
  }

  revalidateWork();
  return ok();
}

export async function updateTemplate(input: {
  id: string;
  title: string;
  description: string;
  priority: string;
  areaId: string;
  projectId: string;
}): Promise<TTemplateActionState> {
  const parsed = templateUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const placement = await resolvePlacement(userId, parsed.data.areaId, parsed.data.projectId);

  if (!placement) {
    return failed(saveError);
  }

  const { data, error } = await supabase
    .from("task_templates")
    .update({
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      priority: parsed.data.priority,
      area_id: placement.areaId,
      project_id: placement.projectId,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .select("id");

  if (error || !data?.length) {
    return failed(saveError);
  }

  revalidateWork();
  return ok();
}

export async function deleteTemplate(id: string): Promise<TTemplateActionState> {
  const parsed = z.string().uuid().safeParse(id);

  if (!parsed.success) {
    return failed("Не удалось удалить шаблон.");
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("task_templates")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .select("id");

  if (error || !data?.length) {
    return failed("Не удалось удалить шаблон.");
  }

  revalidateWork();
  return ok();
}

export async function moveTemplate(id: string, direction: TDirection): Promise<TTemplateActionState> {
  const parsed = z.string().uuid().safeParse(id);

  if (!parsed.success || (direction !== "up" && direction !== "down")) {
    return failed("Не удалось изменить порядок.");
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("task_templates")
    .select("id, position")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error || !data) {
    return failed("Не удалось изменить порядок.");
  }

  const next = moveRecords(data, parsed.data, direction);

  for (const template of next) {
    const previous = data.find((item) => item.id === template.id);

    if (!previous || previous.position === template.position) {
      continue;
    }

    const update = await supabase
      .from("task_templates")
      .update({ position: template.position })
      .eq("id", template.id)
      .eq("user_id", userId);

    if (update.error) {
      return failed("Не удалось изменить порядок.");
    }
  }

  revalidateWork();
  return ok();
}
