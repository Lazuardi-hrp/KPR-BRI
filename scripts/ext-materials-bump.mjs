/**
 * EXT_materials_bump support for glTF-Transform.
 *
 * @gltf-transform/extensions@4 ships no class for this extension, and
 * @gltf-transform/core drops any unregistered extension on read (see
 * core/src/io/reader.ts — "Missing optional extension"). Our model reaches three
 * of its six textures *only* through EXT_materials_bump.bumpTexture, so without
 * this class prune() would delete them and every wall, concrete, roof-tile and
 * bark surface would flatten out.
 *
 * three.js r185 reads the extension natively (GLTFMaterialsBumpExtension), so
 * round-tripping it here is all the runtime needs.
 *
 * Modelled on the KHR_materials_sheen implementation: a scalar factor plus one
 * texture and its TextureInfo. Registering the TextureInfo through
 * context.setTextureInfo() is what keeps the KHR_texture_transform tiling scale
 * attached to the bump textures.
 *
 * Spec: https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_materials_bump
 */
import { Extension, ExtensionProperty, PropertyType, TextureChannel, TextureInfo } from "@gltf-transform/core"

const EXT_MATERIALS_BUMP = "EXT_materials_bump"

export class Bump extends ExtensionProperty {
  init() {
    this.extensionName = EXT_MATERIALS_BUMP
    this.propertyType = "Bump"
    this.parentTypes = [PropertyType.MATERIAL]
  }

  getDefaults() {
    return Object.assign(super.getDefaults(), {
      bumpFactor: 1.0,
      bumpTexture: null,
      bumpTextureInfo: new TextureInfo(this.graph, "bumpTextureInfo"),
    })
  }

  getBumpFactor() {
    return this.get("bumpFactor")
  }

  setBumpFactor(factor) {
    return this.set("bumpFactor", factor)
  }

  getBumpTexture() {
    return this.getRef("bumpTexture")
  }

  getBumpTextureInfo() {
    return this.getRef("bumpTexture") ? this.getRef("bumpTextureInfo") : null
  }

  setBumpTexture(texture) {
    // Height data is single-channel; declaring it lets prune() and
    // textureCompress() reason about the channels actually in use.
    return this.setRef("bumpTexture", texture, { channels: TextureChannel.R })
  }
}

Bump.EXTENSION_NAME = EXT_MATERIALS_BUMP

export class EXTMaterialsBump extends Extension {
  constructor(document) {
    super(document)
    // Assigned here rather than as class fields: the base constructor sets its
    // own defaults, and subclass field initialisers would run before them.
    this.extensionName = EXT_MATERIALS_BUMP
    this.prereadTypes = [PropertyType.MESH]
    this.prewriteTypes = [PropertyType.MESH]
  }

  createBump() {
    return new Bump(this.document.getGraph())
  }

  read() {
    return this
  }

  write() {
    return this
  }

  preread(context) {
    const jsonDoc = context.jsonDoc
    const materialDefs = jsonDoc.json.materials || []
    const textureDefs = jsonDoc.json.textures || []

    materialDefs.forEach((materialDef, materialIndex) => {
      const bumpDef = materialDef.extensions && materialDef.extensions[EXT_MATERIALS_BUMP]
      if (!bumpDef) return

      const bump = this.createBump()
      context.materials[materialIndex].setExtension(EXT_MATERIALS_BUMP, bump)

      if (bumpDef.extras) bump.setExtras(bumpDef.extras)
      if (bumpDef.bumpFactor !== undefined) bump.setBumpFactor(bumpDef.bumpFactor)

      if (bumpDef.bumpTexture !== undefined) {
        const textureInfoDef = bumpDef.bumpTexture
        const texture = context.textures[textureDefs[textureInfoDef.index].source]
        bump.setBumpTexture(texture)
        // Registers the TextureInfo so KHRTextureTransform.read() picks up the
        // tiling scale in the following read phase.
        context.setTextureInfo(bump.getBumpTextureInfo(), textureInfoDef)
      }
    })

    return this
  }

  prewrite(context) {
    const jsonDoc = context.jsonDoc

    for (const material of this.document.getRoot().listMaterials()) {
      const bump = material.getExtension(EXT_MATERIALS_BUMP)
      if (!bump) continue

      const materialIndex = context.materialIndexMap.get(material)
      const materialDef = jsonDoc.json.materials[materialIndex]
      const bumpDef = context.createPropertyDef(bump)

      materialDef.extensions = materialDef.extensions || {}
      materialDef.extensions[EXT_MATERIALS_BUMP] = bumpDef

      bumpDef.bumpFactor = bump.getBumpFactor()

      const texture = bump.getBumpTexture()
      if (texture) {
        bumpDef.bumpTexture = context.createTextureInfoDef(texture, bump.getBumpTextureInfo())
      }
    }

    return this
  }
}

EXTMaterialsBump.EXTENSION_NAME = EXT_MATERIALS_BUMP
