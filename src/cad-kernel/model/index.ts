import { makeBox, type Solid } from "replicad";
import type { BoxParameters } from "../../cad-contract/units";

export type KernelModelDefinition = {
  id: "box";
  build: (parameters: BoxParameters) => Solid;
};

export function buildBoxBRep(parameters: BoxParameters): Solid {
  return makeBox(
    [-parameters.width / 2, -parameters.depth / 2, -parameters.height / 2],
    [parameters.width / 2, parameters.depth / 2, parameters.height / 2]
  );
}

export const boxKernelDefinition: KernelModelDefinition = {
  id: "box",
  build: buildBoxBRep,
};

export function buildModelBRep(modelId: "box", parameters: BoxParameters): Solid {
  if (modelId === boxKernelDefinition.id) return boxKernelDefinition.build(parameters);
  throw new Error(`MODEL_DEFINITION_MISSING:${modelId}`);
}
