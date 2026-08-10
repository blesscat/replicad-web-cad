export type CadViewportPresentation = 'workspace' | 'thumbnail'

export function viewportPresentationForSearch(
  search: string,
): CadViewportPresentation {
  const parameters = new URLSearchParams(search)
  if (parameters.get('preview') === 'thumbnail') return 'thumbnail'
  return 'workspace'
}
