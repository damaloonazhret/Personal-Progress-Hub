"use server";

import { requireUser } from "@/lib/auth/session";
import { revalidateWork } from "@/lib/app/revalidate";
import {
  createTaskSchema,
  editTaskSchema,
  emptyToNull,
  moveTaskInList,
  placeTaskSchema,
  taskIdSchema,
  zodMessage,
  type TTaskDirection,
  type TTaskScope,
} from "@/lib/tasks/model";
import { getAreaTasks, getInboxTasks, getProjectTasks, getTodayTasks } from "@/lib/tasks/queries";

export type TTaskActionState = {
  error: string | null;
};

const saveError = "Не удалось сохранить задачу.";

function ok(): TTaskActionState {
  return { error: null };
}

function failed(message = saveError): TTaskActionState {
  return { error: message };
}

function revalidateTasks() {
  revalidateWork();
}

async function nextTodayPosition(userId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("tasks")
    .select("today_position")
    .eq("user_id", userId)
    .eq("status", "todo")
    .eq("in_today", true)
    .order("today_position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.today_position ?? -1) + 1;
}

async function nextListPosition(userId: string, placement: { projectId: string | null; areaId: string | null }) {
  const { supabase } = await requireUser();
  const query = supabase.from("tasks").select("position").eq("user_id", userId).order("position", { ascending: false }).limit(1);
  const scoped = placement.projectId
    ? query.eq("project_id", placement.projectId)
    : placement.areaId
      ? query.is("project_id", null).eq("area_id", placement.areaId)
      : query.is("project_id", null).is("area_id", null);
  const { data } = await scoped.maybeSingle();

  return (data?.position ?? -1) + 1;
}

async function resolvePlacement(userId: string, projectId: string | null, areaId: string | null) {
  const { supabase } = await requireUser();

  if (projectId) {
    const { data } = await supabase
      .from("projects")
      .select("id, area_id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      return null;
    }

    if (areaId && areaId !== data.area_id) {
      return null;
    }

    return { projectId: data.id, areaId: data.area_id };
  }

  if (areaId) {
    const { data } = await supabase.from("areas").select("id").eq("id", areaId).eq("user_id", userId).maybeSingle();

    if (!data) {
      return null;
    }

    return { projectId: null, areaId: data.id };
  }

  return { projectId: null, areaId: null };
}

export async function createTask(input: {
  title: string;
  place: "inbox" | "today";
  projectId?: string | null;
  areaId?: string | null;
}): Promise<TTaskActionState> {
  const parsed = createTaskSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const placement = await resolvePlacement(userId, parsed.data.projectId ?? null, parsed.data.areaId ?? null);

  if (!placement) {
    return failed();
  }

  const position = await nextListPosition(userId, placement);
  const todayPosition = parsed.data.place === "today" ? await nextTodayPosition(userId) : null;
  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    title: parsed.data.title,
    description: null,
    priority: "medium",
    due_date: null,
    status: "todo",
    in_today: parsed.data.place === "today",
    today_position: todayPosition,
    position,
    project_id: placement.projectId,
    area_id: placement.areaId,
  });

  if (error) {
    return failed();
  }

  revalidateTasks();
  return ok();
}

export async function createTaskFromTemplate(templateId: string): Promise<TTaskActionState> {
  const parsed = taskIdSchema.safeParse(templateId);

  if (!parsed.success) {
    return failed("Не удалось создать задачу из шаблона.");
  }

  const { supabase, userId } = await requireUser();
  const { data: template, error: templateError } = await supabase
    .from("task_templates")
    .select("id, title, description, priority, area_id, project_id")
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .maybeSingle();

  if (templateError || !template) {
    return failed("Не удалось создать задачу из шаблона.");
  }

  const priority = template.priority === "low" || template.priority === "high" ? template.priority : "medium";
  const position = await nextListPosition(userId, {
    projectId: template.project_id,
    areaId: template.area_id,
  });
  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    title: template.title,
    description: template.description,
    priority,
    due_date: null,
    status: "todo",
    in_today: false,
    today_position: null,
    position,
    project_id: template.project_id,
    area_id: template.area_id,
    template_id: template.id,
  });

  if (error) {
    return failed("Не удалось создать задачу из шаблона.");
  }

  revalidateTasks();
  return ok();
}

export async function updateTask(input: {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate: string;
}): Promise<TTaskActionState> {
  const parsed = editTaskSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      priority: parsed.data.priority,
      due_date: emptyToNull(parsed.data.dueDate),
    })
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .select("id");

  if (error || !data?.length) {
    return failed();
  }

  revalidateTasks();
  return ok();
}

async function updateStatus(id: string, status: "todo" | "done") {
  const parsed = taskIdSchema.safeParse(id);

  if (!parsed.success) {
    return failed();
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .eq("status", status === "done" ? "todo" : "done")
    .select("id");

  if (error || !data?.length) {
    return failed();
  }

  revalidateTasks();
  return ok();
}

export async function completeTask(id: string) {
  return updateStatus(id, "done");
}

export async function restoreTask(id: string) {
  return updateStatus(id, "todo");
}

export async function addTaskToToday(id: string) {
  const parsed = taskIdSchema.safeParse(id);

  if (!parsed.success) {
    return failed();
  }

  const { supabase, userId } = await requireUser();
  const todayPosition = await nextTodayPosition(userId);
  const { data, error } = await supabase
    .from("tasks")
    .update({ in_today: true, today_position: todayPosition })
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .eq("status", "todo")
    .select("id");

  if (error || !data?.length) {
    return failed();
  }

  revalidateTasks();
  return ok();
}

export async function removeTaskFromToday(id: string) {
  const parsed = taskIdSchema.safeParse(id);

  if (!parsed.success) {
    return failed();
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .update({ in_today: false })
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .eq("status", "todo")
    .select("id");

  if (error || !data?.length) {
    return failed();
  }

  revalidateTasks();
  return ok();
}

export async function deleteTask(id: string) {
  const parsed = taskIdSchema.safeParse(id);

  if (!parsed.success) {
    return failed();
  }

  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .select("id");

  if (error || !data?.length) {
    return failed();
  }

  revalidateTasks();
  return ok();
}

export async function placeTask(input: {
  id: string;
  projectId: string | null;
  areaId: string | null;
}): Promise<TTaskActionState> {
  const parsed = placeTaskSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const placement = await resolvePlacement(userId, parsed.data.projectId, parsed.data.areaId);

  if (!placement) {
    return failed();
  }

  const position = await nextListPosition(userId, placement);
  const { data, error } = await supabase
    .from("tasks")
    .update({
      project_id: placement.projectId,
      area_id: placement.areaId,
      position,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .select("id");

  if (error || !data?.length) {
    return failed();
  }

  revalidateTasks();
  return ok();
}

async function loadOrderedTasks(scope: TTaskScope) {
  if (scope.view === "today") {
    return getTodayTasks();
  }

  if (scope.view === "project" && scope.projectId) {
    const result = await getProjectTasks(scope.projectId);
    return { ...result, tasks: result.tasks.filter((task) => task.status === "todo") };
  }

  if (scope.view === "area" && scope.areaId) {
    const result = await getAreaTasks(scope.areaId);
    return { ...result, tasks: result.tasks.filter((task) => task.status === "todo") };
  }

  return getInboxTasks();
}

export async function moveTask(id: string, direction: TTaskDirection, scope: TTaskScope) {
  const parsed = taskIdSchema.safeParse(id);

  if (!parsed.success || (direction !== "up" && direction !== "down")) {
    return failed();
  }

  const { supabase, userId } = await requireUser();
  if (scope.view === "completed") {
    return failed();
  }

  const loaded = await loadOrderedTasks(scope);

  if (loaded.error) {
    return failed("Не удалось изменить порядок.");
  }

  const current = loaded.tasks;
  const next = moveTaskInList(current, parsed.data, direction, scope.view);
  const currentById = new Map(current.map((task) => [task.id, task]));

  for (const task of next) {
    const previous = currentById.get(task.id);

    if (!previous) {
      continue;
    }

    if (scope.view === "today") {
      const todayPosition = task.todayPosition ?? 0;

      if (previous.todayPosition === todayPosition) {
        continue;
      }

      const { error } = await supabase
        .from("tasks")
        .update({ today_position: todayPosition })
        .eq("id", task.id)
        .eq("user_id", userId);

      if (error) {
        return failed("Не удалось изменить порядок.");
      }

      continue;
    }

    if (previous.position === task.position) {
      continue;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ position: task.position })
      .eq("id", task.id)
      .eq("user_id", userId);

    if (error) {
      return failed("Не удалось изменить порядок.");
    }
  }

  revalidateTasks();
  return ok();
}
