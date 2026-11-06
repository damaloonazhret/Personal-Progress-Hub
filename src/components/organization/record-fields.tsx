"use client";

import type { ChangeEvent } from "react";

import { taskFieldClassName } from "@/components/tasks/task-field";
import type { TCatalogArea } from "@/lib/organization/model";

type TProps = {
  name: string;
  description: string;
  areaId?: string;
  areas?: TCatalogArea[];
  lockArea?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
};

export function RecordFields({ name, description, areaId, areas, lockArea = false, onChange }: TProps) {
  const showArea = Boolean(areas);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Название
        <input name="name" value={name} onChange={onChange} className={`${taskFieldClassName} h-10`} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Описание
        <textarea name="description" value={description} onChange={onChange} rows={3} className={`${taskFieldClassName} py-2`} />
      </label>
      {showArea && areas ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Сфера
          <select
            name="areaId"
            value={areaId ?? ""}
            onChange={onChange}
            disabled={lockArea}
            className={`${taskFieldClassName} h-10 disabled:opacity-60`}
          >
            <option value="">Выберите сферу</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {lockArea ? (
        <p className="text-sm text-muted-foreground">Сферу проекта с задачами нельзя сменить.</p>
      ) : null}
    </div>
  );
}
