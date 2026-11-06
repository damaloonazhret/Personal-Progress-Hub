import { requireUser } from "@/lib/auth/session";
import {
  progressFromCounts,
  type TAreaCard,
  type TCatalogArea,
  type TCatalogProject,
  type TProjectCard,
} from "@/lib/organization/model";

export type TCatalog = {
  areas: TCatalogArea[];
  projects: TCatalogProject[];
  error: string | null;
};

export type TAreaDetail = {
  area: TAreaCard;
  projects: TProjectCard[];
};

const loadError = "Не удалось загрузить сферы и проекты.";

type TTaskCountRow = {
  area_id: string | null;
  project_id: string | null;
  status: string;
};

function countTasks(rows: TTaskCountRow[], matches: (row: TTaskCountRow) => boolean) {
  return rows.reduce(
    (counts, row) => {
      if (!matches(row)) {
        return counts;
      }

      if (row.status === "done") {
        counts.completed += 1;
        return counts;
      }

      counts.active += 1;
      return counts;
    },
    { active: 0, completed: 0 },
  );
}

async function loadRows() {
  const { supabase, userId } = await requireUser();
  const [areasResult, projectsResult, tasksResult] = await Promise.all([
    supabase
      .from("areas")
      .select("id, name, description, position")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("projects")
      .select("id, area_id, name, description, position")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase.from("tasks").select("area_id, project_id, status").eq("user_id", userId),
  ]);

  if (areasResult.error || projectsResult.error || tasksResult.error || !areasResult.data || !projectsResult.data || !tasksResult.data) {
    return { areas: null, projects: null, tasks: null };
  }

  return {
    areas: areasResult.data,
    projects: projectsResult.data,
    tasks: tasksResult.data,
  };
}

export async function getCatalog(): Promise<TCatalog> {
  const { supabase, userId } = await requireUser();
  const [areasResult, projectsResult] = await Promise.all([
    supabase.from("areas").select("id, name").eq("user_id", userId).order("position", { ascending: true }),
    supabase.from("projects").select("id, area_id, name").eq("user_id", userId).order("position", { ascending: true }),
  ]);

  if (areasResult.error || projectsResult.error || !areasResult.data || !projectsResult.data) {
    return { areas: [], projects: [], error: loadError };
  }

  return {
    areas: areasResult.data,
    projects: projectsResult.data.map((project) => ({
      id: project.id,
      areaId: project.area_id,
      name: project.name,
    })),
    error: null,
  };
}

export async function getAreaCards(): Promise<{ areas: TAreaCard[]; error: string | null }> {
  const rows = await loadRows();

  if (!rows.areas || !rows.projects || !rows.tasks) {
    return { areas: [], error: loadError };
  }

  const areas = rows.areas.map((area) => {
    const counts = countTasks(rows.tasks ?? [], (task) => task.area_id === area.id);

    return {
      id: area.id,
      name: area.name,
      description: area.description,
      position: area.position,
      projectCount: (rows.projects ?? []).filter((project) => project.area_id === area.id).length,
      progress: progressFromCounts(counts.active, counts.completed),
    };
  });

  return { areas, error: null };
}

export async function getProjectCards(): Promise<{ projects: TProjectCard[]; areas: TCatalogArea[]; error: string | null }> {
  const rows = await loadRows();

  if (!rows.areas || !rows.projects || !rows.tasks) {
    return { projects: [], areas: [], error: loadError };
  }

  const areaNameById = new Map(rows.areas.map((area) => [area.id, area.name]));
  const projects = rows.projects.map((project) => {
    const counts = countTasks(rows.tasks ?? [], (task) => task.project_id === project.id);

    return {
      id: project.id,
      areaId: project.area_id,
      areaName: areaNameById.get(project.area_id) ?? "Сфера",
      name: project.name,
      description: project.description,
      position: project.position,
      progress: progressFromCounts(counts.active, counts.completed),
    };
  });

  return {
    projects,
    areas: rows.areas.map((area) => ({ id: area.id, name: area.name })),
    error: null,
  };
}

export async function getAreaDetail(id: string): Promise<{ detail: TAreaDetail | null; error: string | null }> {
  const cards = await getAreaCards();

  if (cards.error) {
    return { detail: null, error: cards.error };
  }

  const area = cards.areas.find((item) => item.id === id) ?? null;

  if (!area) {
    return { detail: null, error: null };
  }

  const projects = await getProjectCards();

  if (projects.error) {
    return { detail: null, error: projects.error };
  }

  return {
    detail: {
      area,
      projects: projects.projects.filter((project) => project.areaId === id),
    },
    error: null,
  };
}

export async function getProjectDetail(id: string): Promise<{ project: TProjectCard | null; error: string | null }> {
  const projects = await getProjectCards();

  if (projects.error) {
    return { project: null, error: projects.error };
  }

  return { project: projects.projects.find((project) => project.id === id) ?? null, error: null };
}
