import { requireUser } from "@/lib/auth/session";
import {
  compareTasks,
  type TTask,
  type TTaskPriority,
  type TTaskStatus,
} from "@/lib/tasks/model";

const taskColumns =
  "id, title, description, status, priority, due_date, in_today, position, today_position, completed_at, project_id, area_id, created_at";

type TTaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  in_today: boolean;
  position: number;
  today_position: number | null;
  completed_at: string | null;
  project_id: string | null;
  area_id: string | null;
  created_at: string;
};

export type TTaskListResult = {
  tasks: TTask[];
  error: string | null;
};

export type TTaskSummary = {
  active: number;
  today: number;
  completed: number;
};

const loadError = "Не удалось загрузить задачи.";

function mapPriority(priority: string): TTaskPriority {
  if (priority === "low" || priority === "high") {
    return priority;
  }

  return "medium";
}

function mapStatus(status: string): TTaskStatus {
  return status === "done" ? "done" : "todo";
}

function mapTask(row: TTaskRow): TTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: mapStatus(row.status),
    priority: mapPriority(row.priority),
    dueDate: row.due_date,
    inToday: row.in_today,
    position: row.position,
    todayPosition: row.today_position,
    completedAt: row.completed_at,
    projectId: row.project_id,
    areaId: row.area_id,
    createdAt: row.created_at,
  };
}

export async function getInboxTasks(): Promise<TTaskListResult> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .eq("user_id", userId)
    .eq("status", "todo")
    .is("project_id", null)
    .is("area_id", null)
    .eq("in_today", false)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { tasks: [], error: loadError };
  }

  return { tasks: data.map(mapTask).sort(compareTasks("inbox")), error: null };
}

export async function getTodayTasks(): Promise<TTaskListResult> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .eq("user_id", userId)
    .eq("status", "todo")
    .eq("in_today", true)
    .order("today_position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { tasks: [], error: loadError };
  }

  return { tasks: data.map(mapTask).sort(compareTasks("today")), error: null };
}

export async function getCompletedTasks(): Promise<TTaskListResult> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .eq("user_id", userId)
    .eq("status", "done")
    .order("completed_at", { ascending: false });

  if (error || !data) {
    return { tasks: [], error: loadError };
  }

  return { tasks: data.map(mapTask).sort(compareTasks("completed")), error: null };
}

export async function getProjectTasks(projectId: string): Promise<TTaskListResult> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { tasks: [], error: loadError };
  }

  return { tasks: data.map(mapTask), error: null };
}

export async function getTasksInArea(areaId: string): Promise<TTaskListResult> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .eq("user_id", userId)
    .eq("area_id", areaId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { tasks: [], error: loadError };
  }

  return { tasks: data.map(mapTask), error: null };
}

export async function getAreaTasks(areaId: string): Promise<TTaskListResult> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("tasks")
    .select(taskColumns)
    .eq("user_id", userId)
    .eq("area_id", areaId)
    .is("project_id", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { tasks: [], error: loadError };
  }

  return { tasks: data.map(mapTask), error: null };
}

export async function getTaskSummary(): Promise<{ counts: TTaskSummary; error: string | null }> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase.from("tasks").select("status, in_today").eq("user_id", userId);

  if (error || !data) {
    return { counts: { active: 0, today: 0, completed: 0 }, error: loadError };
  }

  const counts = data.reduce<TTaskSummary>(
    (summary, task) => {
      if (task.status === "done") {
        summary.completed += 1;
        return summary;
      }

      summary.active += 1;

      if (task.in_today) {
        summary.today += 1;
      }

      return summary;
    },
    { active: 0, today: 0, completed: 0 },
  );

  return { counts, error: null };
}
