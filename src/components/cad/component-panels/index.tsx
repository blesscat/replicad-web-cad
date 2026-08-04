import type { ComponentType } from 'react'
import type { ModelId } from '../../../cad-contract/units'
import { BoxComponentPanel } from './box/BoxComponentPanel'
import { ModularGridBaseComponentPanel } from './modular-grid-base/ModularGridBaseComponentPanel'
import type { ComponentPanelProps } from './types'

const componentPanels: Record<ModelId, ComponentType<ComponentPanelProps>> = {
  box: BoxComponentPanel,
  'modular-grid-base': ModularGridBaseComponentPanel,
}

export function ComponentParameterPanel({
  modelId,
  ...props
}: ComponentPanelProps & { modelId: ModelId }) {
  const Panel = componentPanels[modelId]
  return <Panel {...props} />
}
