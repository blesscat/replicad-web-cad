const THREE_MF_MODEL_NAMESPACE =
  'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
const THREE_MF_RELATIONSHIP_TYPE =
  'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel'
const THREE_MF_MODEL_CONTENT_TYPE =
  'application/vnd.ms-package.3dmanufacturing-3dmodel+xml'
const THREE_MF_RELATIONSHIPS_CONTENT_TYPE =
  'application/vnd.openxmlformats-package.relationships+xml'

const REQUIRED_ENTRIES = [
  '[Content_Types].xml',
  '_rels/.rels',
  '3D/3dmodel.model',
] as const

function hasBytes(raw: Uint8Array, offset: number, length: number): boolean {
  return offset >= 0 && length >= 0 && offset <= raw.length - length
}

function readUint16(view: DataView, offset: number): number | null {
  if (offset < 0 || offset + 2 > view.byteLength) return null
  return view.getUint16(offset, true)
}

function readUint32(view: DataView, offset: number): number | null {
  if (offset < 0 || offset + 4 > view.byteLength) return null
  return view.getUint32(offset, true)
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function parseZip(bytes: ArrayBuffer): Map<string, Uint8Array> | null {
  const raw = new Uint8Array(bytes)
  if (raw.length < 22) return null
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  const firstEndOfCentralDirectory = Math.max(0, raw.length - 0xffff - 22)
  let endOffset = -1

  for (
    let offset = raw.length - 22;
    offset >= firstEndOfCentralDirectory;
    offset -= 1
  ) {
    if (readUint32(view, offset) !== 0x06054b50) continue
    const commentLength = readUint16(view, offset + 20)
    if (commentLength === null || offset + 22 + commentLength !== raw.length) {
      continue
    }
    endOffset = offset
    break
  }
  if (endOffset < 0) return null

  const diskNumber = readUint16(view, endOffset + 4)
  const centralDisk = readUint16(view, endOffset + 6)
  const entriesOnDisk = readUint16(view, endOffset + 8)
  const entryCount = readUint16(view, endOffset + 10)
  const centralSize = readUint32(view, endOffset + 12)
  const centralOffset = readUint32(view, endOffset + 16)
  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entriesOnDisk === null ||
    entryCount === null ||
    entriesOnDisk !== entryCount ||
    centralSize === null ||
    centralOffset === null ||
    centralOffset + centralSize !== endOffset ||
    entryCount === 0
  ) {
    return null
  }

  const entries = new Map<string, Uint8Array>()
  let cursor = centralOffset
  for (let index = 0; index < entryCount; index += 1) {
    if (!hasBytes(raw, cursor, 46) || readUint32(view, cursor) !== 0x02014b50) {
      return null
    }
    const flags = readUint16(view, cursor + 8)
    const method = readUint16(view, cursor + 10)
    const checksum = readUint32(view, cursor + 16)
    const compressedSize = readUint32(view, cursor + 20)
    const uncompressedSize = readUint32(view, cursor + 24)
    const nameLength = readUint16(view, cursor + 28)
    const extraLength = readUint16(view, cursor + 30)
    const commentLength = readUint16(view, cursor + 32)
    const diskStart = readUint16(view, cursor + 34)
    const localOffset = readUint32(view, cursor + 42)
    if (
      flags === null ||
      method !== 0 ||
      (flags & 0x1) !== 0 ||
      (flags & 0x8) !== 0 ||
      checksum === null ||
      compressedSize === null ||
      uncompressedSize === null ||
      compressedSize !== uncompressedSize ||
      nameLength === null ||
      extraLength === null ||
      commentLength === null ||
      diskStart !== 0 ||
      localOffset === null ||
      !hasBytes(raw, cursor, 46 + nameLength + extraLength + commentLength)
    ) {
      return null
    }
    const nameStart = cursor + 46
    const name = decodeUtf8(raw.slice(nameStart, nameStart + nameLength))
    if (!name || entries.has(name)) return null

    if (
      !hasBytes(raw, localOffset, 30) ||
      readUint32(view, localOffset) !== 0x04034b50
    ) {
      return null
    }
    const localFlags = readUint16(view, localOffset + 6)
    const localMethod = readUint16(view, localOffset + 8)
    const localChecksum = readUint32(view, localOffset + 14)
    const localCompressedSize = readUint32(view, localOffset + 18)
    const localUncompressedSize = readUint32(view, localOffset + 22)
    const localNameLength = readUint16(view, localOffset + 26)
    const localExtraLength = readUint16(view, localOffset + 28)
    if (
      localFlags !== flags ||
      localMethod !== method ||
      localChecksum !== checksum ||
      localCompressedSize !== compressedSize ||
      localUncompressedSize !== uncompressedSize ||
      localNameLength !== nameLength ||
      localExtraLength === null ||
      !hasBytes(
        raw,
        localOffset,
        30 + localNameLength + localExtraLength + compressedSize,
      )
    ) {
      return null
    }
    const localNameStart = localOffset + 30
    const localName = decodeUtf8(
      raw.slice(localNameStart, localNameStart + localNameLength),
    )
    if (localName !== name) return null
    const dataStart = localNameStart + localNameLength + localExtraLength
    const data = raw.slice(dataStart, dataStart + compressedSize)
    if (crc32(data) !== checksum) return null
    entries.set(name, data)
    cursor += 46 + nameLength + extraLength + commentLength
  }

  return cursor === endOffset ? entries : null
}

function attribute(attributes: string, name: string): string | null {
  const match = attributes.match(new RegExp(`\\b${name}="([^"]*)"`))
  return match?.[1] ?? null
}

function numericAttribute(attributes: string, name: string): number | null {
  const value = attribute(attributes, name)
  if (value === null || value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function validContentTypes(xml: string): boolean {
  if (!/^<\?xml\b[\s\S]*?\?>\s*<Types\b[\s\S]*<\/Types>\s*$/.test(xml)) {
    return false
  }
  return (
    xml.includes(
      `<Default Extension="rels" ContentType="${THREE_MF_RELATIONSHIPS_CONTENT_TYPE}"`,
    ) &&
    xml.includes(
      `<Default Extension="model" ContentType="${THREE_MF_MODEL_CONTENT_TYPE}"`,
    )
  )
}

function validRelationships(xml: string): boolean {
  const root = xml.match(
    /^<\?xml\b[\s\S]*?\?>\s*<Relationships\b[^>]*>([\s\S]*)<\/Relationships>\s*$/,
  )
  if (!root) return false
  const relationships = root[1]!.match(/<Relationship\b[^>]*\/\s*>/g) ?? []
  if (relationships.length !== 1) return false
  const relationship = relationships[0]!
  return (
    attribute(relationship, 'Target') === '/3D/3dmodel.model' &&
    attribute(relationship, 'Type') === THREE_MF_RELATIONSHIP_TYPE
  )
}

function validMesh(meshXml: string): boolean {
  const mesh = meshXml.match(
    /^\s*<mesh>\s*<vertices>([\s\S]*?)<\/vertices>\s*<triangles>([\s\S]*?)<\/triangles>\s*<\/mesh>\s*$/,
  )
  if (!mesh) return false
  const verticesXml = mesh[1]!
  const trianglesXml = mesh[2]!
  const vertexTags = verticesXml.match(/<vertex\b[^>]*\/\s*>/g) ?? []
  const triangleTags = trianglesXml.match(/<triangle\b[^>]*\/\s*>/g) ?? []
  if (
    vertexTags.length === 0 ||
    triangleTags.length === 0 ||
    verticesXml.replace(/<vertex\b[^>]*\/\s*>/g, '').trim() !== '' ||
    trianglesXml.replace(/<triangle\b[^>]*\/\s*>/g, '').trim() !== ''
  ) {
    return false
  }

  for (const tag of vertexTags) {
    const coordinates = ['x', 'y', 'z'].map((name) =>
      numericAttribute(tag, name),
    )
    if (coordinates.some((coordinate) => coordinate === null)) {
      return false
    }
  }
  for (const tag of triangleTags) {
    const indices = ['v1', 'v2', 'v3'].map((name) =>
      numericAttribute(tag, name),
    )
    if (
      indices.some(
        (index) =>
          index === null ||
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= vertexTags.length,
      ) ||
      new Set(indices).size !== 3
    ) {
      return false
    }
  }
  return true
}

function validModel(xml: string): boolean {
  if (
    !/^<\?xml\b[\s\S]*?\?>\s*<model\b/.test(xml) ||
    (xml.match(/<model\b/g) ?? []).length !== 1 ||
    (xml.match(/<\/model>/g) ?? []).length !== 1 ||
    !/<\/model>\s*$/.test(xml) ||
    xml.includes('<!DOCTYPE') ||
    !xml.includes(
      `<model xmlns="${THREE_MF_MODEL_NAMESPACE}" unit="millimeter"`,
    )
  ) {
    return false
  }

  const materialSection = xml.match(
    /<basematerials\b[^>]*>([\s\S]*?)<\/basematerials>/,
  )
  if (!materialSection || attribute(materialSection[0], 'id') !== '1') {
    return false
  }
  const materials = materialSection[1]!.match(/<base\b[^>]*\/\s*>/g) ?? []
  if (materials.length !== 2) return false
  if (
    attribute(materials[0]!, 'name') !== 'Snap Body' ||
    attribute(materials[0]!, 'displaycolor') !== '#657080' ||
    attribute(materials[1]!, 'name') !== 'Snap Text' ||
    attribute(materials[1]!, 'displaycolor') !== '#F4C542'
  ) {
    return false
  }

  const objects = xml.match(/<object\b([^>]*)>([\s\S]*?)<\/object>/g) ?? []
  if (objects.length !== 3) return false
  const objectById = new Map<string, { attributes: string; body: string }>()
  for (const object of objects) {
    const match = object.match(/<object\b([^>]*)>([\s\S]*?)<\/object>/)
    if (!match) return false
    const id = attribute(match[1]!, 'id')
    if (!id || objectById.has(id)) return false
    objectById.set(id, { attributes: match[1]!, body: match[2]! })
  }

  const body = objectById.get('1')
  const text = objectById.get('2')
  const composite = objectById.get('3')
  if (!body || !text || !composite) return false
  if (
    attribute(body.attributes, 'type') !== 'model' ||
    attribute(body.attributes, 'name') !== 'body' ||
    attribute(body.attributes, 'pid') !== '1' ||
    attribute(body.attributes, 'pindex') !== '0' ||
    attribute(text.attributes, 'type') !== 'model' ||
    attribute(text.attributes, 'name') !== 'text' ||
    attribute(text.attributes, 'pid') !== '1' ||
    attribute(text.attributes, 'pindex') !== '1' ||
    attribute(composite.attributes, 'type') !== 'model' ||
    attribute(composite.attributes, 'name') !== 'OpenGrid Snap SNAP'
  ) {
    return false
  }
  if (!validMesh(body.body) || !validMesh(text.body)) return false
  if (
    !/<components>\s*<component\b[^>]*objectid="1"[^>]*\/\s*>\s*<component\b[^>]*objectid="2"[^>]*\/\s*>\s*<\/components>/.test(
      composite.body,
    )
  ) {
    return false
  }
  const buildItems = xml.match(/<item\b[^>]*\/\s*>/g) ?? []
  return (
    buildItems.length === 1 && attribute(buildItems[0]!, 'objectid') === '3'
  )
}

export function isValidThreeMfPackage(bytes: ArrayBuffer): boolean {
  const entries = parseZip(bytes)
  if (!entries || entries.size !== REQUIRED_ENTRIES.length) return false
  for (const name of REQUIRED_ENTRIES) {
    if (!entries.has(name)) return false
  }
  const contentTypes = decodeUtf8(entries.get(REQUIRED_ENTRIES[0]!)!)
  const relationships = decodeUtf8(entries.get(REQUIRED_ENTRIES[1]!)!)
  const model = decodeUtf8(entries.get(REQUIRED_ENTRIES[2]!)!)
  return (
    contentTypes !== null &&
    relationships !== null &&
    model !== null &&
    validContentTypes(contentTypes) &&
    validRelationships(relationships) &&
    validModel(model)
  )
}
