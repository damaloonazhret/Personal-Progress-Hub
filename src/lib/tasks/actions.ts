"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import {
  createTaskSchema,
  editTaskSchema,
  emptyToNull,
  moveTaskInList,
  taskIdSchema,
  zodMessage,
  type TTaskDirection,
  type TTaskPlace,
} from "@/lib/tasks/model";
import { getInboxTasks, getTodayTasks } from "@/lib/tasks/queries";

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
  revalidatePath("/dashboard");
  revalidatePath("/inbox");
  revalidatePath("/today");
  revalidatePath("/completed");
}

async function nextPosition(userId: string, place: TTaskPlace) {
  const { supabase } = await requireUser();

  if (place === "today") {
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

  const { data } = await supabase
    .from("tasks")
    .select("position")
    .eq("user_id", userId)
    .eq("status", "todo")
    .is("project_id", null)
    .eq("in_today", false)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.position ?? -1) + 1;
}

export async function createTask(input: { title: string; place: TTaskPlace }): Promise<TTaskActionState> {
  const parsed = createTaskSchema.safeParse(input);

  if (!parsed.success) {
    return failed(zodMessage(parsed.error));
  }

  const { supabase, userId } = await requireUser();
  const position = await nextPosition(userId, "inbox");
  const todayPosition = parsed.data.place === "today" ? await nextPosition(userId, "today") : null;
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
    project_id: null,
    area_id: null,
  });

  if (error) {
    return failed();
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
  const todayPosition = await nextPosition(userId, "today");
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

async function loadOrderedTasks(place: TTaskPlace) {
  const result = place === "today" ? await getTodayTasks() : await getInboxTasks();
  return result;
}

export async function moveTask(id: string, direction: TTaskDirection, place: TTaskPlace) {
  const parsed = taskIdSchema.safeParse(id);

  if (!parsed.success || (direction !== "up" && direction !== "down")) {
    return failed();
  }

  const { supabase, userId } = await requireUser();
  const loaded = await loadOrderedTasks(place);

  if (loaded.error) {
    return failed("Не удалось изменить порядок.");
  }

  const current = loaded.tasks;
  const next = moveTaskInList(current, parsed.data, direction, place);
  const currentById = new Map(current.map((task) => [task.id, task]));

  for (const task of next) {
    const previous = currentById.get(task.id);

    if (!previous) {
      continue;
    }

    if (place === "today") {
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
