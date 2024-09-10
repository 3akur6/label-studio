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

const HEX_EDITOR_BACKGROUND_COLOR = "rgb(255, 255, 255)";

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
  findSpan() {
    const globalOffset = self.globalOffset;
    const localStart = self.start - globalOffset.start;
    const localEnd = self.end - globalOffset.start;

    const items = document.querySelectorAll("#start-label div.byteValue:not(.invalid)");

    return Array.from(items).filter((node) => {
        const localOffset = node.getAttribute("data-offset");

        return localOffset >= localStart && localOffset < localEnd;
    });
  },

  updateItemColor(node, bgColor, opacity) {
    if (bgColor === HEX_EDITOR_BACKGROUND_COLOR) {
      // 复原
      const classNameList = node.className.split(" ");

      let rColor = "rgb(36, 41, 46)";
      let rBgColor = bgColor;
      if (classNameList.includes("even")) {
        rBgColor = bgColor;
      } else if (classNameList.includes("odd")) {
        rBgColor = "rgb(246, 248, 250)";
      } else {
        console.error("updateSpanColor", classNameList);
      }

      node.style.color = rColor;
      node.style.backgroundColor = rBgColor;
    } else {
      node.style.color = "white";
      node.style.backgroundColor = bgColor;

      if (opacity) {
        node.style.backgroundColor = Utils.Colors.rgbaChangeAlpha(node.style.backgroundColor, opacity);
      }
    }
  },

  updateSpanColor(bgColor, opacity) {
    const span = self.findSpan();

    span.forEach((node) => {
      self.updateItemColor(node, bgColor, opacity);
    });
  },

  updateAppearanceFromState() {
    const labelColor = self.style.fillcolor;

    self.updateSpanColor(labelColor, self.selected ? 0.8 : 0.3);
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
      self.updateSpanColor(HEX_EDITOR_BACKGROUND_COLOR, null);
    } else {
      self.updateAppearanceFromState();
    }

    event?.stopPropagation();
  },

  onClickRegion() {
    console.log("PacketRegion.onClickRegion");
  },

  destroyRegion() {
    self.updateSpanColor(HEX_EDITOR_BACKGROUND_COLOR, null);

    const span = self.findSpan();

    span.forEach((item) => {
      self._currentSpanItem = item;

      item.removeEventListener("click", self.handleSpanClick);
    });
  },

  handleSpanClick(event) {
    if (self.hidden) return;

    event.stopPropagation();

    self._currentSpanItem.style.cursor = Constants.POINTER_CURSOR;

    return self.onClickRegion();
  },

  registerEvents() {
    const span = self.findSpan();

    span.forEach((item) => {
      self._currentSpanItem = item;

      item.addEventListener("click", self.handleSpanClick);
    });
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
