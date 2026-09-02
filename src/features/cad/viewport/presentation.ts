export type CadViewportPresentation = 'workspace' | 'thumbnail'

export type CadViewportAppearance = 'light' | 'dark'

export function viewportPresentationForSearch(
  search: string,
): CadViewportPresentation {
  const parameters = new URLSearchParams(search)
  if (parameters.get('preview') === 'thumbnail') return 'thumbnail'
  return 'workspace'
}

export function viewportAppearanceForSearch(
  search: string,
): CadViewportAppearance {
  const parameters = new URLSearchParams(search)
  return parameters.get('appearance') === 'dark' ? 'dark' : 'light'
}
