import RegionsMixin from "../mixins/Regions";
import {AreaMixin} from "../mixins/AreaMixin";
import NormalizationMixin from "../mixins/Normalization";
import {types} from "mobx-state-tree";
import Registry from "../core/Registry";
import {PacketModel} from "../tags/object";
import Constants from "../core/Constants";

const AreaOffset = types.model("AreaOffset", {
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

  area_id: types.string,
  start: types.number,
  end: types.number,
  content: types.string,
  area_offset: types.maybeNull(AreaOffset),
}).views((self) => ({
  serialize() {
    return {
      value: {
        area_id: self.area_id,
        start: self.start,
        end: self.end,
        content: self.content,
        area_offset: self.area_offset,
      },
    };
  },
})).actions((self) => ({
  findSpan() {
    const areaOffset = self.area_offset;
    const localStart = self.start - areaOffset.start;
    const localEnd = self.end - areaOffset.start;

    const items = document.querySelectorAll("#start-label div.byteValue:not(.invalid)");

    return Array.from(items).filter((node) => {
        const localOffset = node.getAttribute("data-offset");

        return localOffset >= localStart && localOffset < localEnd;
    });
  },

  updateSpans() {
    // 点击标记区域的标签，会调用该方法，更新样式
    if (self.hidden) {
      self.applyHighlight(false);
    } else {
      self.applyHighlight(true);
    }
  },

  updateItemColor(node, bgColor) {
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
        console.error("updateItemColor", classNameList);
      }

      node.style.color = rColor;
      node.style.backgroundColor = rBgColor;
    } else {
      node.style.color = "white";
      node.style.backgroundColor = bgColor;
    }
  },

  updateItemCursor(node, cursor) {
    node.style.cursor = cursor;
  },

  applyHighlightStyle({ bold = false } = {}) {
    const labelColor = self.style.fillcolor;

    const span = self.findSpan();

    span.forEach((node) => {
      // 更新颜色
      self.updateItemColor(node, labelColor);

      // 更新指针
      self.updateItemCursor(node, Constants.POINTER_CURSOR);

      // 更新bold
      node.style.fontWeight = bold ? "bold" : "";
    });
  },

  removeHighlightStyle() {
    const color = HEX_EDITOR_BACKGROUND_COLOR;

    const span = self.findSpan();

    span.forEach((node) => {
      // 还原颜色
      self.updateItemColor(node, color, null);

      // 还原指针
      self.updateItemCursor(node, Constants.DEFAULT_CURSOR);

      // 更新bold
      node.style.font = "";
    });
  },

  setHighlight(value) {
    // 当右侧Regions中被选中会调用该方法
    if (self.hidden) {
      self.applyHighlight(false);

      return;
    }

    if (self.selected || value) {
      self.applyHighlightStyle({bold: true});
    } else {
      self.applyHighlightStyle({bold: false});
    }
  },

  applyHighlight(value) {
    self._highlighted = value;

    if (self.highlighted && !self.hidden) {
      // 切换高亮
      self.applyHighlightStyle();

      // 注册事件
      self.registerEvents();
    } else {
      // 取消样式
      self.removeHighlightStyle();

      // 取消事件
      self.removeEvents();
    }
  },

  toggleHidden(event) {
    self.hidden = !self.hidden;
    self.applyHighlight(!self.hidden);

    event?.stopPropagation();
  },

  destroyRegion() {
    self.removeHighlightStyle();

    self.removeEvents();
  },

  handleSpanClick(event) {
    if (self.hidden) return;

    const packetModel = self.parent;

    if (packetModel._currentRegion && packetModel._currentRegion !== self) {
      // 取消当前选择
      packetModel.annotation.toggleRegionSelection(packetModel._currentRegion, false);
      packetModel._currentRegion.applyHighlightStyle({bold: false});
    }

    packetModel._currentRegion = self;

    packetModel.annotation.toggleRegionSelection(self, true);
    self.applyHighlightStyle({bold: true});
  },

  registerEvents() {
    const span = self.findSpan();

    span.forEach((item) => {
      item.addEventListener("click", self.handleSpanClick);
    });
  },

  removeEvents() {
    const span = self.findSpan();

    span.forEach((item) => {
      item.removeEventListener("click", self.handleSpanClick);
    });
  },

  beforeDestroy() {
    self.applyHighlight(false);
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
