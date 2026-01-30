import type { SupabaseClient } from "../../db/supabase.client.ts";
import type { DiseaseCommand, DiseaseDto, DiseaseEntryRow, DiseaseUpdateCommand } from "../../types.ts";

export class ResourceNotFoundError extends Error {
  readonly status = 404;
  readonly code = "not_found";

  constructor(message = "Resource not found.") {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}

const omitPlantCardId = <T extends { plant_card_id: string }>(entry: T): Omit<T, "plant_card_id"> => {
  const { plant_card_id: _plantCardId, ...rest } = entry;
  void _plantCardId;
  return rest;
};

const assertPlantOwnershipOrNotFound = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string
): Promise<void> => {
  const { data, error } = await supabase
    .from("plant_card")
    .select("id")
    .eq("id", plantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ResourceNotFoundError("Plant not found.");
  }
};

export const listDiseases = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string
): Promise<DiseaseDto[]> => {
  await assertPlantOwnershipOrNotFound(supabase, userId, plantId);

  const { data, error } = await supabase
    .from("disease_entry")
    .select("id, name, symptoms, advice, created_at, updated_at")
    .eq("plant_card_id", plantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((entry) => omitPlantCardId(entry as DiseaseEntryRow)) as DiseaseDto[];
};

export const createDisease = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string,
  command: DiseaseCommand
): Promise<DiseaseDto> => {
  await assertPlantOwnershipOrNotFound(supabase, userId, plantId);

  const { data, error } = await supabase
    .from("disease_entry")
    .insert({
      plant_card_id: plantId,
      name: command.name,
      symptoms: command.symptoms,
      advice: command.advice,
    })
    .select("id, name, symptoms, advice, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ResourceNotFoundError("Disease could not be created.");
  }

  return omitPlantCardId(data as DiseaseEntryRow) as DiseaseDto;
};

export const updateDisease = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string,
  diseaseId: string,
  command: DiseaseUpdateCommand
): Promise<DiseaseDto> => {
  await assertPlantOwnershipOrNotFound(supabase, userId, plantId);

  const updatePayload: Partial<Pick<DiseaseEntryRow, "name" | "symptoms" | "advice">> = {};

  if (command.name !== undefined) {
    updatePayload.name = command.name;
  }

  if (command.symptoms !== undefined) {
    updatePayload.symptoms = command.symptoms;
  }

  if (command.advice !== undefined) {
    updatePayload.advice = command.advice;
  }

  const { data, error } = await supabase
    .from("disease_entry")
    .update(updatePayload)
    .eq("id", diseaseId)
    .eq("plant_card_id", plantId)
    .select("id, name, symptoms, advice, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ResourceNotFoundError("Disease not found.");
  }

  return omitPlantCardId(data as DiseaseEntryRow) as DiseaseDto;
};

export const deleteDisease = async (
  supabase: SupabaseClient,
  userId: string,
  plantId: string,
  diseaseId: string
): Promise<void> => {
  await assertPlantOwnershipOrNotFound(supabase, userId, plantId);

  const { data, error } = await supabase
    .from("disease_entry")
    .delete()
    .eq("id", diseaseId)
    .eq("plant_card_id", plantId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ResourceNotFoundError("Disease not found.");
  }
};
