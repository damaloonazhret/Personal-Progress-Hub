"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

import { RecordFields } from "@/components/organization/record-fields";
import { Button } from "@/components/ui/button";
import { deleteArea, deleteProject, updateArea, updateProject } from "@/lib/organization/actions";
import { areaUpdateSchema, formatProgress, projectUpdateSchema, zodMessage, type TCatalogArea, type TProgress } from "@/lib/organization/model";

type TProps = {
  kind: "area" | "project";
  id: string;
  name: string;
  description: string | null;
  areaId?: string;
  areas?: TCatalogArea[];
  progress: TProgress;
};

export function DetailEditor({ kind, id, name, description, areaId = "", areas = [], progress }: TProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextName, setNextName] = useState(name);
  const [nextDescription, setNextDescription] = useState(description ?? "");
  const [nextAreaId, setNextAreaId] = useState(areaId);
  const lockArea = kind === "project" && progress.total > 0;
  const deleteMessage =
    kind === "area"
      ? `Удалить сферу «${name}»? Её проекты и задачи тоже удалятся. Это нельзя отменить.`
      : `Удалить проект «${name}»? Задачи проекта тоже удалятся. Это нельзя отменить.`;

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (event.target.name === "name") {
      setNextName(event.target.value);
    }

    if (event.target.name === "description") {
      setNextDescription(event.target.value);
    }

    if (event.target.name === "areaId") {
      setNextAreaId(event.target.value);
    }
  };

  const handleStartEdit = () => {
    setNextName(name);
    setNextDescription(description ?? "");
    setNextAreaId(areaId);
    setError(null);
    setIsConfirmingDelete(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = () => {
    setIsSaving(true);
    setError(null);

    if (kind === "area") {
      const parsed = areaUpdateSchema.safeParse({ id, name: nextName, description: nextDescription });

      if (!parsed.success) {
        setIsSaving(false);
        setError(zodMessage(parsed.error));
        return;
      }

      void updateArea(parsed.data).then((result) => {
        setIsSaving(false);

        if (result.error) {
          setError(result.error);
          return;
        }

        setIsEditing(false);
      });
      return;
    }

    const parsed = projectUpdateSchema.safeParse({
      id,
      name: nextName,
      description: nextDescription,
      areaId: nextAreaId,
    });

    if (!parsed.success) {
      setIsSaving(false);
      setError(zodMessage(parsed.error));
      return;
    }

    void updateProject(parsed.data).then((result) => {
      setIsSaving(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsEditing(false);
    });
  };

  const handleAskDelete = () => {
    setIsEditing(false);
    setIsConfirmingDelete(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmingDelete(false);
  };

  const handleConfirmDelete = () => {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    const remove = kind === "area" ? deleteArea(id) : deleteProject(id);

    void remove.then((result) => {
      if (result.error) {
        setIsDeleting(false);
        setError(result.error);
        setIsConfirmingDelete(false);
        return;
      }

      router.push(kind === "area" ? "/areas" : "/projects");
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      <p className="text-sm text-muted-foreground">{formatProgress(progress)}</p>
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <RecordFields
            name={nextName}
            description={nextDescription}
            areaId={nextAreaId}
            areas={kind === "project" ? areas : undefined}
            lockArea={lockArea}
            onChange={handleChange}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Сохранение…" : "Сохранить"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
              Отмена
            </Button>
          </div>
        </div>
      ) : null}
      {isConfirmingDelete ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
          <p className="text-sm">{deleteMessage}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Удаление…" : "Удалить"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancelDelete} disabled={isDeleting}>
              Отмена
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!isEditing && !isConfirmingDelete ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleStartEdit}>
            Изменить
          </Button>
          <Button type="button" variant="destructive" onClick={handleAskDelete}>
            Удалить
          </Button>
        </div>
      ) : null}
    </div>
  );
}
