import { expect, test } from '@playwright/test'

const SOURCE_CODE_LICENSE_URL =
  'https://creativecommons.org/licenses/by-nc-sa/4.0/'
const DERIVED_PARTS_LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
const SOURCE_REVISION = '61231295ea08c302eff32051769113c48cbda255'
const OPENGRID_SOURCE_URL = `https://github.com/AndyLevesque/QuackWorks/blob/${SOURCE_REVISION}/openGrid/openGrid.scad`
const SNAP_SOURCE_URL = `https://github.com/AndyLevesque/QuackWorks/blob/${SOURCE_REVISION}/openGrid/opengrid-snap.scad`
const DAVID_D_PROFILE_URL = 'https://www.printables.com/@DavidD'
const BLACKJACK_DUCK_SOURCE_URL = 'https://github.com/AndyLevesque/QuackWorks'

const attributionCases = [
  {
    path: '/zh-Hant/cad/opengrid',
    heading: '來源與授權',
    revision: `版本 commit ${SOURCE_REVISION}`,
    sourceUrl: OPENGRID_SOURCE_URL,
    creditsText: '上游作者：',
    authors: [
      { name: 'David D', url: DAVID_D_PROFILE_URL },
      { name: 'BlackjackDuck (Andy)', url: BLACKJACK_DUCK_SOURCE_URL },
    ],
    sourceLinkText: '查看固定版本的上游來源',
    sourceCodeLicenseText: '上游程式碼：CC BY-NC-SA 4.0',
    derivedPartsLicenseText: '衍生／產生零件：CC BY 4.0',
    modifiedText: null,
  },
  {
    path: '/en/cad/opengrid',
    heading: 'Source and licensing',
    revision: `(commit ${SOURCE_REVISION})`,
    sourceUrl: OPENGRID_SOURCE_URL,
    creditsText: 'Upstream authors:',
    authors: [
      { name: 'David D', url: DAVID_D_PROFILE_URL },
      { name: 'BlackjackDuck (Andy)', url: BLACKJACK_DUCK_SOURCE_URL },
    ],
    sourceLinkText: 'View the pinned upstream source',
    sourceCodeLicenseText: 'Upstream source code: CC BY-NC-SA 4.0',
    derivedPartsLicenseText: 'Derived/generated parts: CC BY 4.0',
    modifiedText: null,
  },
  {
    path: '/zh-Hant/cad/opengrid-snap',
    heading: '來源與授權',
    revision: `版本 commit ${SOURCE_REVISION}`,
    sourceUrl: SNAP_SOURCE_URL,
    creditsText: '上游作者：',
    authors: [{ name: 'David D', url: DAVID_D_PROFILE_URL }],
    unlinkedAuthorText: 'metasyntactic',
    sourceLinkText: '查看固定版本的上游來源',
    sourceCodeLicenseText: '上游程式碼：CC BY-NC-SA 4.0',
    derivedPartsLicenseText: '衍生／產生零件：CC BY 4.0',
    modifiedText: '修改的衍生版本',
  },
  {
    path: '/en/cad/opengrid-snap',
    heading: 'Source and licensing',
    revision: `(commit ${SOURCE_REVISION})`,
    sourceUrl: SNAP_SOURCE_URL,
    creditsText: 'Upstream authors:',
    authors: [{ name: 'David D', url: DAVID_D_PROFILE_URL }],
    unlinkedAuthorText: 'metasyntactic',
    sourceLinkText: 'View the pinned upstream source',
    sourceCodeLicenseText: 'Upstream source code: CC BY-NC-SA 4.0',
    derivedPartsLicenseText: 'Derived/generated parts: CC BY 4.0',
    modifiedText: 'modified derivatives',
  },
] as const

for (const attributionCase of attributionCases) {
  test(`shows attribution for ${attributionCase.path}`, async ({ page }) => {
    await page.goto(attributionCase.path)

    const notice = page.getByTestId('cad-attribution')
    await expect(notice).toBeVisible()
    await expect(page.locator('#cad-fallback')).toBeHidden()
    await expect(notice).toBeVisible()
    await expect(notice.getByRole('heading')).toHaveText(
      attributionCase.heading,
    )
    await expect(notice).toContainText(attributionCase.revision)
    await expect(notice).toContainText(attributionCase.creditsText)
    for (const author of attributionCase.authors) {
      await expect(
        notice.getByRole('link', { name: author.name }),
      ).toHaveAttribute('href', author.url)
    }
    if ('unlinkedAuthorText' in attributionCase) {
      await expect(notice).toContainText(attributionCase.unlinkedAuthorText)
    }
    await expect(
      notice.getByRole('link', { name: attributionCase.sourceLinkText }),
    ).toHaveAttribute('href', attributionCase.sourceUrl)
    await expect(
      notice.getByRole('link', {
        name: attributionCase.sourceCodeLicenseText,
      }),
    ).toHaveAttribute('href', SOURCE_CODE_LICENSE_URL)
    await expect(
      notice.getByRole('link', {
        name: attributionCase.derivedPartsLicenseText,
      }),
    ).toHaveAttribute('href', DERIVED_PARTS_LICENSE_URL)

    if (attributionCase.modifiedText) {
      await expect(notice).toContainText(attributionCase.modifiedText)
      await expect(notice).toContainText('snap-half')
      await expect(notice).toContainText('snap-quarter')
    }
  })
}

test('does not add the notice to another OpenGrid-compatible model', async ({
  page,
}) => {
  await page.goto('/en/cad/opengrid-pillar')

  await expect(page.getByTestId('cad-attribution')).toHaveCount(0)
})
