// Generated from the committed light SVGs by a one-time converter.
// Single source of truth for the desk-system-board-snap diagram: edit strings or the
// template here, then run `pnpm generate:desk-diagrams`.
export const boardSnapDiagram = {
  name: 'desk-system-board-snap',
  width: 1000,
  height: 560,
  strings: {
    'board-and-snap-placement': {
      en: 'Board and Snap placement',
      'zh-Hant': 'Board 與 Snap 的放置方式',
    },
    'top-view-of-a-desk-system': {
      en: 'Top view of a Desk System Board with a Snap placed at every box position.',
      'zh-Hant':
        'Desk System Board 的俯視圖：每個要放盒子的格位都先放置對應的 Snap。',
    },
    'board-snap-placement': {
      en: 'Board + Snap placement',
      'zh-Hant': 'Board + Snap 放置方式',
    },
    'place-a-matching-snap-at-each': {
      en: 'Place a matching Snap at each grid position that will hold a box.',
      'zh-Hant': '每個要放盒子的格位，都要先放置對應的 Snap。',
    },
    board: {
      en: 'Board',
      'zh-Hant': 'Board（底版）',
    },
    'desk-grid-top-view': {
      en: 'Desk grid / top view',
      'zh-Hant': 'Desk 網格／俯視圖',
    },
    s: {
      en: 'S',
      'zh-Hant': 'S',
    },
    snap: {
      en: 'Snap',
      'zh-Hant': 'Snap（咔咔）',
    },
    'one-per-box-position': {
      en: 'One per box position',
      'zh-Hant': '每個盒位一個',
    },
    next: {
      en: 'Next',
      'zh-Hant': '下一步',
    },
    'add-one-locating-method': {
      en: 'Add one locating method',
      'zh-Hant': '加入一種定位方式',
    },
    'before-the-container': {
      en: 'before the container',
      'zh-Hant': '再放入容器',
    },
  },
  fontSizeOverrides: {},
  template: (
    c,
  ) => `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560" role="img" aria-labelledby="title desc">
  <title id="title">${c.t('board-and-snap-placement')}</title>
  <desc id="desc">${c.t('top-view-of-a-desk-system')}</desc>
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="${c.color('shadow')}" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="1000" height="560" fill="${c.color('background')}"/>
  <text x="55" y="58" fill="${c.color('heading')}" font-family="${c.font}" font-size="32" font-weight="750">${c.t('board-snap-placement')}</text>
  <text x="55" y="92" fill="${c.color('muted')}" font-family="${c.font}" font-size="18">${c.t('place-a-matching-snap-at-each')}</text>

  <g filter="url(#shadow)">
    <rect x="70" y="145" width="570" height="330" rx="24" fill="${c.color('cardBlueFill')}" stroke="${c.color('accentBlue')}" stroke-width="4"/>
  </g>
  <text x="105" y="190" fill="${c.color('headingBlue')}" font-family="${c.font}" font-size="24" font-weight="700">${c.t('board')}</text>
  <text x="105" y="220" fill="${c.color('muted')}" font-family="${c.font}" font-size="16">${c.t('desk-grid-top-view')}</text>
  <g stroke="${c.color('gridLine')}" stroke-width="2" opacity="0.85">
    <path d="M 120 260 H 590 M 120 330 H 590 M 120 400 H 590"/>
    <path d="M 200 235 V 430 M 280 235 V 430 M 360 235 V 430 M 440 235 V 430 M 520 235 V 430"/>
  </g>
  <g fill="${c.color('accentTeal')}" stroke="white" stroke-width="5">
    <circle cx="160" cy="295" r="22"/>
    <circle cx="320" cy="295" r="22"/>
    <circle cx="480" cy="295" r="22"/>
    <circle cx="240" cy="365" r="22"/>
    <circle cx="400" cy="365" r="22"/>
    <circle cx="560" cy="365" r="22"/>
  </g>
  <g fill="white" font-family="Inter, sans-serif" font-size="15" font-weight="700" text-anchor="middle">
    <text x="160" y="301">${c.t('s')}</text><text x="320" y="301">${c.t('s')}</text><text x="480" y="301">${c.t('s')}</text>
    <text x="240" y="371">${c.t('s')}</text><text x="400" y="371">${c.t('s')}</text><text x="560" y="371">${c.t('s')}</text>
  </g>

  <g filter="url(#shadow)">
    <rect x="700" y="165" width="230" height="120" rx="20" fill="${c.color('cardTealFill')}" stroke="${c.color('accentTeal')}" stroke-width="3"/>
  </g>
  <circle cx="735" cy="205" r="21" fill="${c.color('accentTeal')}"/>
  <text x="735" y="212" text-anchor="middle" fill="white" font-family="Inter, sans-serif" font-size="16" font-weight="700">${c.t('s')}</text>
  <text x="770" y="212" fill="${c.color('headingTeal')}" font-family="${c.font}" font-size="22" font-weight="700">${c.t('snap')}</text>
  <text x="730" y="250" fill="${c.color('muted')}" font-family="${c.font}" font-size="16">${c.t('one-per-box-position')}</text>

  <g filter="url(#shadow)">
    <rect x="700" y="330" width="230" height="120" rx="20" fill="${c.color('cardAmberFill')}" stroke="${c.color('accentAmber')}" stroke-width="3"/>
  </g>
  <text x="730" y="370" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="21" font-weight="700">${c.t('next')}</text>
  <text x="730" y="403" fill="${c.color('body')}" font-family="${c.font}" font-size="16">${c.t('add-one-locating-method')}</text>
  <text x="730" y="428" fill="${c.color('muted')}" font-family="${c.font}" font-size="16">${c.t('before-the-container')}</text>
</svg>
`,
}
