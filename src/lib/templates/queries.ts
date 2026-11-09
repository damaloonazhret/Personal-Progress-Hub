import { requireUser } from "@/lib/auth/session";
import type { TTaskPriority } from "@/lib/tasks/model";
import type { TTemplate } from "@/lib/templates/model";

const loadError = "Не удалось загрузить шаблоны.";

function mapPriority(priority: string): TTaskPriority {
  if (priority === "low" || priority === "high") {
    return priority;
  }

  return "medium";
}

export async function getTemplates(): Promise<{ templates: TTemplate[]; error: string | null }> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("task_templates")
    .select("id, title, description, priority, area_id, project_id, position")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error || !data) {
    return { templates: [], error: loadError };
  }

  return {
    templates: data.map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description,
      priority: mapPriority(template.priority),
      areaId: template.area_id,
      projectId: template.project_id,
      position: template.position,
    })),
    error: null,
  };
}
