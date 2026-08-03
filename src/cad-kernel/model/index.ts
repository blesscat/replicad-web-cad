import { makeBox, type Solid } from "replicad";
import { boundsForBox, type BoxParameters } from "../../cad-contract/units";

export type KernelModelDefinition = {
  id: "box";
  build: (parameters: BoxParameters) => Solid;
};

export function buildBoxBRep(parameters: BoxParameters): Solid {
  const bounds = boundsForBox(parameters);
  return makeBox(bounds.min, bounds.max);
}

export const boxKernelDefinition: KernelModelDefinition = {
  id: "box",
  build: buildBoxBRep,
};

export function buildModelBRep(modelId: "box", parameters: BoxParameters): Solid {
  if (modelId === boxKernelDefinition.id) return boxKernelDefinition.build(parameters);
  throw new Error(`MODEL_DEFINITION_MISSING:${modelId}`);
}
