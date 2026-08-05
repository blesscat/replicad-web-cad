import { CadViewport } from '../../features/cad/viewport/CadViewport'
import type { ModelId } from '../../cad-contract/units'
import { CadWorkspacePanel } from './CadWorkspacePanel'
import { useCadWorkspaceController } from './workspace/useCadWorkspaceController'

type CadWorkspaceProps = {
  modelId: ModelId
}

export default function CadWorkspace({ modelId }: CadWorkspaceProps) {
  const controller = useCadWorkspaceController(modelId)

  return (
    <div
      className="mt-6 grid grid-cols-[minmax(220px,280px)_minmax(0,1fr)] gap-4 max-cad:grid-cols-1"
      data-testid="cad-workspace"
    >
      <CadWorkspacePanel
        state={controller.state}
        modelId={controller.modelId}
        rawParameters={controller.rawParameters}
        fieldErrors={controller.fieldErrors}
        progress={controller.progress}
        status={controller.status}
        canExport={controller.canExport}
        onInputChange={controller.onInputChange}
        onExport={controller.onExport}
        onRetry={controller.onRetry}
      />
      <CadViewport
        mesh={controller.state.committed?.mesh ?? null}
        parameters={controller.state.committed?.parameters ?? null}
        stale={controller.state.stale}
      />
    </div>
  )
}
