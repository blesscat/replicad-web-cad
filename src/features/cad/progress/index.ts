export type CadProgressStage = 'loading' | 'building' | 'meshing' | 'exporting'

export function progressMessage(stage: CadProgressStage): string {
  switch (stage) {
    case 'loading':
      return '正在載入 CAD engine…'
    case 'building':
      return '正在建立 B-Rep…'
    case 'meshing':
      return '正在產生預覽 mesh…'
    case 'exporting':
      return '正在匯出 STEP…'
  }
}
