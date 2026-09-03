// Generated from the committed light SVGs by a one-time converter.
// Single source of truth for the desk-system-locating-options diagram: edit strings or the
// template here, then run `pnpm generate:desk-diagrams`.
export const locatingOptionsDiagram = {
  name: 'desk-system-locating-options',
  width: 1100,
  height: 560,
  strings: {
    'desk-locating-options': {
      en: 'Desk locating options',
      'zh-Hant': 'Desk System 定位方式',
    },
    'two-mutually-exclusive-locating-methods-a': {
      en: 'Two mutually exclusive locating methods: a separate Locating Post or a box with a built-in seat. The built-in seat does not use an extra Locating Post.',
      'zh-Hant':
        '兩種互斥的定位方式：獨立 Locating Post，或盒子內建角座。內建角座不需要額外 Locating Post。',
    },
    'choose-one-locating-method': {
      en: 'Choose one locating method',
      'zh-Hant': '選擇一種定位方式',
    },
    'both-options-locate-the-same-box': {
      en: 'Both options locate the same box position; do not combine them.',
      'zh-Hant': '兩種方式都能定位同一個盒位；不可同時使用。',
    },
    'a-locating-post-separate': {
      en: 'A. Locating Post (separate)',
      'zh-Hant': 'A. 獨立 Locating Post',
    },
    'box-has-a-regular-seat-hole': {
      en: 'Uses regular seat holes',
      'zh-Hant': '盒子使用一般角座孔。',
    },
    'print-and-install-one': {
      en: 'Print and install one',
      'zh-Hant': '另外列印並安裝一個',
    },
    'separate-locating-post': {
      en: 'separate Locating Post',
      'zh-Hant': '獨立 Locating Post。',
    },
    'extra-part-required': {
      en: 'Extra part required',
      'zh-Hant': '需要額外零件',
    },
    'b-built-in-seat': {
      en: 'B. Built-in seat',
      'zh-Hant': 'B. 內建角座',
    },
    'choose-the-box-option': {
      en: "Pick the box's",
      'zh-Hant': '選擇盒子的',
    },
    'built-in-seat-option': {
      en: 'built-in seat option',
      'zh-Hant': '「內建角座」選項。',
    },
    'the-seat-is-part-of-the': {
      en: 'The seat is built in',
      'zh-Hant': '定位座是盒子的一部分。',
    },
    'no-extra-locating-post': {
      en: 'No extra Post needed',
      'zh-Hant': '不需要額外 Locating Post',
    },
    'choose-a-or-b-never-both': {
      en: 'Choose A or B — never both for the same position',
      'zh-Hant': '同一個盒位請選 A 或 B，不要同時使用',
    },
  },
  fontSizeOverrides: {},
  template: (
    c,
  ) => `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="560" viewBox="0 0 1100 560" role="img" aria-labelledby="title desc">
  <title id="title">${c.t('desk-locating-options')}</title>
  <desc id="desc">${c.t('two-mutually-exclusive-locating-methods-a')}</desc>
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="${c.color('shadow')}" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="1100" height="560" fill="${c.color('background')}"/>
  <text x="55" y="58" fill="${c.color('heading')}" font-family="${c.font}" font-size="32" font-weight="750">${c.t('choose-one-locating-method')}</text>
  <text x="55" y="92" fill="${c.color('muted')}" font-family="${c.font}" font-size="18">${c.t('both-options-locate-the-same-box')}</text>

  <g filter="url(#shadow)">
    <rect x="55" y="140" width="465" height="300" rx="24" fill="${c.color('cardAmberFill')}" stroke="${c.color('accentAmber')}" stroke-width="3"/>
    <rect x="580" y="140" width="465" height="300" rx="24" fill="${c.color('cardAmberFill')}" stroke="${c.color('accentAmber')}" stroke-width="3"/>
  </g>

  <text x="90" y="185" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="24" font-weight="700">${c.t('a-locating-post-separate')}</text>
  <rect x="130" y="255" width="150" height="115" rx="14" fill="${c.color('cardVioletFill')}" stroke="${c.color('accentViolet')}" stroke-width="3"/>
  <circle cx="205" cy="255" r="24" fill="${c.color('accentAmber')}" stroke="white" stroke-width="5"/>
  <rect x="185" y="385" width="40" height="35" rx="6" fill="${c.color('accentAmber')}"/>
  <path d="M 205 280 V 385" stroke="${c.color('headingAmber')}" stroke-width="6"/>
  <text x="320" y="270" fill="${c.color('body')}" font-family="${c.font}" font-size="17">${c.t('box-has-a-regular-seat-hole')}</text>
  <text x="320" y="302" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('print-and-install-one')}</text>
  <text x="320" y="330" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('separate-locating-post')}</text>
  <text x="320" y="380" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="16" font-weight="700">${c.t('extra-part-required')}</text>

  <text x="615" y="185" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="24" font-weight="700">${c.t('b-built-in-seat')}</text>
  <rect x="670" y="255" width="150" height="115" rx="14" fill="${c.color('cardVioletFill')}" stroke="${c.color('accentViolet')}" stroke-width="3"/>
  <path d="M 745 370 V 415" stroke="${c.color('accentAmber')}" stroke-width="14" stroke-linecap="round"/>
  <circle cx="745" cy="255" r="24" fill="${c.color('accentAmber')}" stroke="white" stroke-width="5"/>
  <text x="860" y="270" fill="${c.color('body')}" font-family="${c.font}" font-size="17">${c.t('choose-the-box-option')}</text>
  <text x="860" y="302" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('built-in-seat-option')}</text>
  <text x="860" y="330" fill="${c.color('muted')}" font-family="${c.font}" font-size="17">${c.t('the-seat-is-part-of-the')}</text>
  <text x="860" y="380" fill="${c.color('headingAmber')}" font-family="${c.font}" font-size="16" font-weight="700">${c.t('no-extra-locating-post')}</text>

  <rect x="245" y="475" width="610" height="50" rx="25" fill="${c.color('pillFill')}" stroke="${c.color('pillStroke')}" stroke-width="2"/>
  <text x="550" y="507" text-anchor="middle" fill="${c.color('pillText')}" font-family="${c.font}" font-size="18" font-weight="700">${c.t('choose-a-or-b-never-both')}</text>
</svg>
`,
}
