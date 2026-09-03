// Generated from the committed light SVGs by a one-time converter.
// Single source of truth for the desk-system-flow diagram: edit strings or the
// template here, then run `pnpm generate:desk-diagrams`.
export const flowDiagram = {
  name: 'desk-system-flow',
  width: 1400,
  height: 820,
  strings: {
    1: {
      en: '1',
      'zh-Hant': '1',
    },
    2: {
      en: '2',
      'zh-Hant': '2',
    },
    3: {
      en: '3',
      'zh-Hant': '3',
    },
    4: {
      en: '4',
      'zh-Hant': '4',
    },
    'desk-system-quick-start': {
      en: 'Desk System Quick Start',
      'zh-Hant': 'Desk System 快速入門',
    },
    'desk-system-assembly-flow-from-board': {
      en: 'Desk System assembly flow from Board and Snap to one locating method, then Grid Box or Round Box. Built-in seat and separate Locating Post are mutually exclusive.',
      'zh-Hant':
        'Desk System 組裝流程：從 Board 與 Snap 開始，選擇一種定位方式，再放入 Grid Box 或 Round Box。內建角座與獨立 Locating Post 二選一。',
    },
    'board-snap-choose-one-locating-method': {
      en: 'Board → Snap → choose one locating method → Grid Box / Round Box',
      'zh-Hant': 'Board → Snap → 選擇一種定位方式 → Grid Box／Round Box',
    },
    board: {
      en: 'Board',
      'zh-Hant': 'Board（底版）',
    },
    'print-and-place-on-the-desk': {
      en: 'Print and place on the desk',
      'zh-Hant': '列印並放在桌面上',
    },
    'simple-placement-is-enough': {
      en: 'Simple placement is enough',
      'zh-Hant': '直接放置即可',
    },
    'screw-hole-fastening-optional': {
      en: 'Screw-hole fastening: optional',
      'zh-Hant': '螺絲孔固定：非必要',
    },
    snap: {
      en: 'Snap',
      'zh-Hant': 'Snap（咔咔）',
    },
    'for-every-box-position': {
      en: 'For every box position',
      'zh-Hant': '每個盒子位置一個',
    },
    'prepare-the-matching-snap': {
      en: 'Prepare the matching Snap',
      'zh-Hant': '準備對應的 Snap',
    },
    'before-adding-the-container': {
      en: 'before adding the container',
      'zh-Hant': '再放入容器',
    },
    'choose-one-locator': {
      en: 'Choose one locator',
      'zh-Hant': '選擇一種定位方式',
    },
    'locating-post': {
      en: 'Locating Post',
      'zh-Hant': '獨立 Locating Post',
    },
    separate: {
      en: '(separate)',
      'zh-Hant': '（獨立零件）',
    },
    'use-a-standard-seat-hole': {
      en: 'Use a standard seat hole',
      'zh-Hant': '使用一般角座孔',
    },
    'print-and-install-the-post': {
      en: 'Print and install the Post',
      'zh-Hant': '列印並安裝定位柱',
    },
    'locator-1-separate-part': {
      en: 'Locator: 1 separate part',
      'zh-Hant': '定位柱：額外 1 個零件',
    },
    'built-in-seat': {
      en: 'Built-in seat',
      'zh-Hant': '內建角座',
    },
    'choose-the-built-in-seat': {
      en: 'Choose the built-in seat',
      'zh-Hant': '選擇盒子的內建角座',
    },
    'no-extra-locating-post': {
      en: 'No extra Locating Post',
      'zh-Hant': '不需要額外 Locating Post',
    },
    'locator-part-of-the-box': {
      en: 'Locator: part of the box',
      'zh-Hant': '定位座：盒子的一部分',
    },
    'grid-box-round-box': {
      en: 'Grid Box / Round Box',
      'zh-Hant': 'Grid Box／Round Box',
    },
    'print-then-place-in-the-located': {
      en: 'Print, then place in the located grid',
      'zh-Hant': '列印後放入已定位的格位',
    },
    'grid-box-is-the-first-example': {
      en: 'Grid Box is the first example',
      'zh-Hant': '第一個範例使用 Grid Box',
    },
    'round-box-follows-the-same-flow': {
      en: 'Round Box follows the same flow',
      'zh-Hant': 'Round Box 使用相同流程',
    },
    'version-1-quick-start-scope': {
      en: 'Version 1 Quick Start scope',
      'zh-Hant': '第一版 Quick Start 範圍',
    },
    'explain-the-system-workflow-first-slicer': {
      en: 'Explain the system workflow first; slicer and print settings come later.',
      'zh-Hant': '先說明系統流程；切片與列印設定留待後續。',
    },
  },
  fontSizeOverrides: {
    'size-26-0': {
      'zh-Hant': '27',
    },
    'size-33-0': {
      'zh-Hant': '27',
    },
  },
  template: (
    c,
  ) => `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="820" viewBox="0 0 1400 820" role="img" aria-labelledby="title desc">
  <title id="title">${c.t('desk-system-quick-start')}</title>
  <desc id="desc">${c.t('desk-system-assembly-flow-from-board')}</desc>
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="${c.color('shadow')}" flood-opacity="0.12"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${c.color('arrow')}"/>
    </marker>
  </defs>
  <rect width="1400" height="820" fill="${c.color('background')}"/>
  <text x="70" y="68" fill="${c.color('heading')}" font-family="${c.font}" font-size="38" font-weight="750">${c.t('desk-system-quick-start')}</text>
  <text x="70" y="108" fill="${c.color('muted')}" font-family="${c.font}" font-size="20">${c.t('board-snap-choose-one-locating-method')}</text>

  <g filter="url(#shadow)">
    <rect x="70" y="178" width="250" height="190" rx="22" fill="${c.color('cardBlueFill')}" stroke="${c.color('accentBlue')}" stroke-width="3"/>
    <rect x="390" y="178" width="250" height="190" rx="22" fill="${c.color('cardTealFill')}" stroke="${c.color('accentTeal')}" stroke-width="3"/>
    <rect x="665" y="300" width="270" height="175" rx="22" fill="${c.color('cardAmberFill')}" stroke="${c.color('accentAmber')}" stroke-width="3"/>
    <rect x="965" y="300" width="270" height="175" rx="22" fill="${c.color('cardAmberFill')}" stroke="${c.color('accentAmber')}" stroke-width="3"/>
    <rect x="1000" y="540" width="350" height="190" rx="22" fill="${c.color('cardVioletFill')}" stroke="${c.color('accentViolet')}" stroke-width="3"/>
  </g>

  <circle cx="108" cy="216" r="22" fill="${c.color('accentBlue')}"/>
  <text x="108" y="224" text-anchor="middle" fill="white" font-family="Inter, sans-serif" font-size="21" font-weight="700">${c.t('1')}</text>
  <text x="145" y="224" fill="${c.color('headingBlue')}" font-family="${c.font}" font-size="${c.fs('size-26-0', '28')}" font-weight="700">${c.t('board')}</text>
  <text x="105" y="275" fill="${c.color('body')}" font-family="${c.font}" font-size="19">${c.t('print-and-place-on-the-desk')}</text>
  <text x="105" y="308" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('simple-placement-is-enough')}</text>
  <text x="105" y="337" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('screw-hole-fastening-optional')}</text>

  <circle cx="428" cy="216" r="22" fill="${c.color('accentTeal')}"/>
  <text x="428" y="224" text-anchor="middle" fill="white" font-family="Inter, sans-serif" font-size="21" font-weight="700">${c.t('2')}</text>
  <text x="465" y="224" fill="${c.color('headingTeal')}" font-family="${c.font}" font-size="${c.fs('size-33-0', '28')}" font-weight="700">${c.t('snap')}</text>
  <text x="425" y="275" fill="${c.color('body')}" font-family="${c.font}" font-size="19">${c.t('for-every-box-position')}</text>
  <text x="425" y="308" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('prepare-the-matching-snap')}</text>
  <text x="425" y="337" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('before-adding-the-container')}</text>

  <path d="M 320 273 H 380" fill="none" stroke="${c.color('arrow')}" stroke-width="4" marker-end="url(#arrow)"/>
  <rect x="710" y="155" width="300" height="60" rx="30" fill="${c.color('cardAmberFill')}" stroke="${c.color('accentAmber')}" stroke-width="3"/>
  <circle cx="746" cy="185" r="22" fill="${c.color('accentAmber')}"/>
  <text x="746" y="193" text-anchor="middle" fill="white" font-family="Inter, sans-serif" font-size="21" font-weight="700">${c.t('3')}</text>
  <text x="780" y="193" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="20" font-weight="700">${c.t('choose-one-locator')}</text>
  <path d="M 640 273 H 700" fill="none" stroke="${c.color('arrow')}" stroke-width="4" marker-end="url(#arrow)"/>
  <path d="M 860 215 V 275 M 860 275 H 750 M 860 275 H 970" fill="none" stroke="${c.color('accentAmber')}" stroke-width="4"/>
  <circle cx="860" cy="275" r="7" fill="${c.color('accentAmber')}"/>

  <text x="700" y="340" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="20" font-weight="700">${c.t('locating-post')}</text>
  <text x="700" y="367" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="17" font-weight="650">${c.t('separate')}</text>
  <text x="700" y="402" fill="${c.color('body')}" font-family="${c.font}" font-size="17">${c.t('use-a-standard-seat-hole')}</text>
  <text x="700" y="430" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('print-and-install-the-post')}</text>
  <text x="700" y="458" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="15" font-weight="650">${c.t('locator-1-separate-part')}</text>

  <text x="1000" y="342" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="20" font-weight="700">${c.t('built-in-seat')}</text>
  <text x="1000" y="382" fill="${c.color('body')}" font-family="${c.font}" font-size="17">${c.t('choose-the-built-in-seat')}</text>
  <text x="1000" y="413" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('no-extra-locating-post')}</text>
  <text x="1000" y="447" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="16" font-weight="650">${c.t('locator-part-of-the-box')}</text>

  <path d="M 800 475 V 505 H 1180 V 530" fill="none" stroke="${c.color('arrow')}" stroke-width="4" marker-end="url(#arrow)"/>
  <path d="M 1100 475 V 505" fill="none" stroke="${c.color('arrow')}" stroke-width="4"/>
  <circle cx="1040" cy="578" r="22" fill="${c.color('accentViolet')}"/>
  <text x="1040" y="586" text-anchor="middle" fill="white" font-family="Inter, sans-serif" font-size="21" font-weight="700">${c.t('4')}</text>
  <text x="1080" y="586" fill="${c.color('headingViolet')}" font-family="${c.font}" font-size="20" font-weight="700">${c.t('grid-box-round-box')}</text>
  <text x="1035" y="635" fill="${c.color('body')}" font-family="${c.font}" font-size="16">${c.t('print-then-place-in-the-located')}</text>
  <text x="1035" y="670" fill="${c.color('muted')}" font-family="${c.font}" font-size="16">${c.t('grid-box-is-the-first-example')}</text>
  <text x="1035" y="700" fill="${c.color('muted')}" font-family="${c.font}" font-size="16">${c.t('round-box-follows-the-same-flow')}</text>

  <rect x="70" y="650" width="865" height="80" rx="18" fill="${c.color('pillFill')}" stroke="${c.color('pillStroke')}" stroke-width="2"/>
  <text x="103" y="688" fill="${c.color('pillText')}" font-family="${c.font}" font-size="18" font-weight="700">${c.t('version-1-quick-start-scope')}</text>
  <text x="103" y="716" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('explain-the-system-workflow-first-slicer')}</text>
</svg>
`,
}
