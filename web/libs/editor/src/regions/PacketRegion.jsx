import RegionsMixin from "../mixins/Regions";
import {AreaMixin} from "../mixins/AreaMixin";
import NormalizationMixin from "../mixins/Normalization";
import {types} from "mobx-state-tree";
import Registry from "../core/Registry";
import {PacketModel} from "../tags/object";
import Utils from "../utils";
import Constants from "../core/Constants";

const GlobalOffset = types.model("GlobalOffset", {
  start: types.number,
  end: types.number,
}).actions((self) => ({
  serialize() {
    return {
      start: self.start,
      end: self.end,
    };
  },
}));

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

  globalOffset: GlobalOffset,
}).views((self) => ({
  serialize() {
    return {
      value: {
        start: self.start,
        end: self.end,
        content: self.content,
      },
    };
  },
})).actions((self) => ({
  findSelectItems() {
    const globalOffset = self.globalOffset;
    const localStart = self.start - globalOffset.start;
    const localEnd = self.end - globalOffset.start;

    const items = document.querySelectorAll("#start-label div.byteValue:not(.invalid)");

    return Array.from(items).filter((node) => {
        const localOffset = node.getAttribute("data-offset");

        return localOffset >= localStart && localOffset < localEnd;
    });
  },

  updateSelectItemsColor(bgColor, opacity) {
    const selectItems = self.findSelectItems();

    selectItems.forEach((node) => {
      if (bgColor) {
        node.style.backgroundColor = bgColor;

        if (bgColor === "transparent") {
          node.style.color = "black";
        } else {
          node.style.color = "white";
        }
      }

      if (opacity) {
        node.style.backgroundColor = Utils.Colors.rgbaChangeAlpha(node.style.backgroundColor, opacity);
      }
    });
  },

  updateAppearanceFromState() {
    const labelColor = self.style.fillcolor;

    self.updateSelectItemsColor(labelColor, self.selected ? 0.8 : 0.3);
  },

  setHighlight(value) {
    self._highlighted = value;

    if (self.highlighted && !self.hidden) {
      self.updateAppearanceFromState();
    }
  },

  toggleHidden(event) {
    self.hidden = !self.hidden;
    self.setHighlight(self.highlighted);

    if (self.hidden) {
      self.updateSelectItemsColor("transparent", 0);

      const selectItems = self.findSelectItems();
      selectItems.forEach((node) => {
        node.style.cursor = Constants.DEFAULT_CURSOR;
      });
    } else {
      self.updateAppearanceFromState();
    }

    event?.stopPropagation();
  }
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
