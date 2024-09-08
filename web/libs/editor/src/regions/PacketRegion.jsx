import RegionsMixin from "../mixins/Regions";
import {AreaMixin} from "../mixins/AreaMixin";
import NormalizationMixin from "../mixins/Normalization";
import {types} from "mobx-state-tree";
import Registry from "../core/Registry";
import {PacketModel} from "../tags/object";

/**
 * @example
 * {
 *   "value": {
 *     "start": 0,
 *     "end": 8,
 *     "content": "aGVsbG8K",
 *     "labels": ["BIT_STRING"]
 *   }
 * }
 * @typedef {Object} ByteRegionResult
 * @property {Object} value
 * @property {number} value.start start offset of the fragment
 * @property {number} value.end end offset of the fragment
 * @property {string} value.content
 * @property {string} value.labels labels of the fragment
 */

const Model = types.model("PacketRegionModel", {
  type: "packetregion",
  object: types.late(() => types.reference(PacketModel)),

  start: types.number,
  end: types.number,
  content: types.string,
}).actions((self) => ({
  serialize() {
    return {
      value: {
        start: self.start,
        end: self.end,
        content: self.content,
      },
    };
  },
}));

const PacketRegionModel = types.compose(
  "PacketRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  Model,
);

Registry.addRegionType(PacketRegionModel, "packet");

export {PacketRegionModel};
