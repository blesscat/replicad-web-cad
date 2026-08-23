import { expect, test } from '@playwright/test'

const SOURCE_CODE_LICENSE_URL =
  'https://creativecommons.org/licenses/by-nc-sa/4.0/'
const DERIVED_PARTS_LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
const DAVID_D_PROFILE_URL = 'https://www.printables.com/@DavidD'
const ANDY_PROFILE_URL = 'https://makerworld.com/en/@BlackjackDuck'
const OPENCONNECT_AUTHOR_PROFILE_URL = 'https://github.com/mitufy'
const OPENCONNECT_PROJECT_URL =
  'https://www.printables.com/model/1559478-openconnect-opengrids-own-connector-system'
const OPENCONNECT_LICENSE_URL = DERIVED_PARTS_LICENSE_URL

const attributionCases = [
  {
    path: '/zh-Hant/cad/opengrid',
    heading: '來源與授權',
    creditsText: '上游作者：',
    authors: [
      { name: 'David D', url: DAVID_D_PROFILE_URL },
      { name: 'BlackjackDuck (Andy)', url: ANDY_PROFILE_URL },
    ],
    removedSourceLinkText: '查看固定版本的上游來源',
    sourceCodeLicenseText: '上游程式碼：CC BY-NC-SA 4.0',
    derivedPartsLicenseText: '衍生／產生零件：CC BY 4.0',
    modifiedText: null,
  },
  {
    path: '/en/cad/opengrid',
    heading: 'Source and licensing',
    creditsText: 'Upstream authors:',
    authors: [
      { name: 'David D', url: DAVID_D_PROFILE_URL },
      { name: 'BlackjackDuck (Andy)', url: ANDY_PROFILE_URL },
    ],
    removedSourceLinkText: 'View the pinned upstream source',
    sourceCodeLicenseText: 'Upstream source code: CC BY-NC-SA 4.0',
    derivedPartsLicenseText: 'Derived/generated parts: CC BY 4.0',
    modifiedText: null,
  },
  {
    path: '/zh-Hant/cad/opengrid-snap',
    heading: '來源與授權',
    creditsText: '上游作者：',
    authors: [{ name: 'David D', url: DAVID_D_PROFILE_URL }],
    unlinkedAuthorText: 'metasyntactic',
    openConnectAuthors: [
      { name: 'mitufy', url: OPENCONNECT_AUTHOR_PROFILE_URL },
      { name: 'OpenConnect project', url: OPENCONNECT_PROJECT_URL },
    ],
    removedSourceLinkText: '查看固定版本的上游來源',
    sourceCodeLicenseText: '上游程式碼：CC BY-NC-SA 4.0',
    derivedPartsLicenseText: '衍生／產生零件：CC BY 4.0',
    openConnectLicenseText: 'OpenConnect 原始碼與介面幾何：CC BY 4.0',
    modifiedText: '修改的衍生版本',
    expectsSnapDerivatives: true,
  },
  {
    path: '/en/cad/opengrid-snap',
    heading: 'Source and licensing',
    creditsText: 'Upstream authors:',
    authors: [{ name: 'David D', url: DAVID_D_PROFILE_URL }],
    unlinkedAuthorText: 'metasyntactic',
    openConnectAuthors: [
      { name: 'mitufy', url: OPENCONNECT_AUTHOR_PROFILE_URL },
      { name: 'OpenConnect project', url: OPENCONNECT_PROJECT_URL },
    ],
    removedSourceLinkText: 'View the pinned upstream source',
    sourceCodeLicenseText: 'Upstream source code: CC BY-NC-SA 4.0',
    derivedPartsLicenseText: 'Derived/generated parts: CC BY 4.0',
    openConnectLicenseText:
      'OpenConnect source and interface geometry: CC BY 4.0',
    modifiedText: 'modified derivatives',
    expectsSnapDerivatives: true,
  },
  {
    path: '/zh-Hant/cad/opengrid-openconnect-shelf?system=wall',
    heading: '來源與授權',
    creditsText: '原始系統作者：',
    authors: [
      { name: 'David D', url: DAVID_D_PROFILE_URL },
      { name: 'mitufy', url: OPENCONNECT_AUTHOR_PROFILE_URL },
    ],
    removedSourceLinkText: '查看固定版本的上游來源',
    sourceCodeLicenseText: '上游程式碼：CC BY-NC-SA 4.0',
    derivedPartsLicenseText: '衍生／產生零件：CC BY 4.0',
    openConnectLicenseText: 'OpenConnect 原始碼與鎖定孔幾何：CC BY 4.0',
    modifiedText: '附帶的鎖定孔 STEP',
  },
  {
    path: '/en/cad/opengrid-openconnect-shelf?system=wall',
    heading: 'Source and licensing',
    creditsText: 'Original system authors:',
    authors: [
      { name: 'David D', url: DAVID_D_PROFILE_URL },
      { name: 'mitufy', url: OPENCONNECT_AUTHOR_PROFILE_URL },
    ],
    removedSourceLinkText: 'View the pinned upstream source',
    sourceCodeLicenseText: 'Upstream source code: CC BY-NC-SA 4.0',
    derivedPartsLicenseText: 'Derived/generated parts: CC BY 4.0',
    openConnectLicenseText:
      'OpenConnect source and locked-socket geometry: CC BY 4.0',
    modifiedText: 'supplied locked-socket STEP',
  },
] as const

for (const attributionCase of attributionCases) {
  test(`shows attribution for ${attributionCase.path}`, async ({ page }) => {
    await page.goto(attributionCase.path)

    const notice = page.getByTestId('cad-attribution')
    await expect(notice).toBeVisible()
    await expect(page.locator('#cad-fallback')).toBeHidden()
    await expect(page.getByTestId('cad-workspace')).toBeVisible()
    const attributionFollowsWorkspace = await page
      .locator('section[aria-labelledby="cad-title"]')
      .evaluate((section) => {
        const workspace = section.querySelector('[data-testid="cad-workspace"]')
        const attribution = section.querySelector(
          '[data-testid="cad-attribution"]',
        )

        return Boolean(
          workspace &&
          attribution &&
          workspace.compareDocumentPosition(attribution) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        )
      })
    expect(attributionFollowsWorkspace).toBe(true)
    await expect(notice.getByRole('heading')).toHaveText(
      attributionCase.heading,
    )
    await expect(notice).toContainText(attributionCase.creditsText)
    for (const author of attributionCase.authors) {
      await expect(
        notice.getByRole('link', { name: author.name }),
      ).toHaveAttribute('href', author.url)
    }
    if ('unlinkedAuthorText' in attributionCase) {
      await expect(notice).toContainText(attributionCase.unlinkedAuthorText)
      await expect(
        notice.getByRole('link', { name: attributionCase.unlinkedAuthorText }),
      ).toHaveCount(0)
    }
    await expect(
      notice.getByRole('link', {
        name: attributionCase.removedSourceLinkText,
      }),
    ).toHaveCount(0)
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
    if ('openConnectLicenseText' in attributionCase) {
      await expect(
        notice.getByRole('link', {
          name: attributionCase.openConnectLicenseText,
        }),
      ).toHaveAttribute('href', DERIVED_PARTS_LICENSE_URL)
    }

    if ('openConnectAuthors' in attributionCase) {
      for (const author of attributionCase.openConnectAuthors) {
        await expect(
          notice.getByRole('link', { name: author.name }),
        ).toHaveAttribute('href', author.url)
      }
      await expect(
        notice.getByRole('link', {
          name: attributionCase.openConnectLicenseText,
        }),
      ).toHaveAttribute('href', OPENCONNECT_LICENSE_URL)
    }

    if (attributionCase.modifiedText) {
      await expect(notice).toContainText(attributionCase.modifiedText)
    }
    if (
      'expectsSnapDerivatives' in attributionCase &&
      attributionCase.expectsSnapDerivatives
    ) {
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
