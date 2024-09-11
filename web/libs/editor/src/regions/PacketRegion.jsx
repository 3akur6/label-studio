import RegionsMixin from "../mixins/Regions";
import {AreaMixin} from "../mixins/AreaMixin";
import NormalizationMixin from "../mixins/Normalization";
import {types} from "mobx-state-tree";
import Registry from "../core/Registry";
import {PacketModel} from "../tags/object";
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

  updateSpans() {
    // 点击标记区域的标签，会调用该方法，更新样式
    self.applyHighlightStyle({bold: true});
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
    });
  },

  setHighlight(value) {
    // 当右侧Regions中被选中会调用该方法
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
    self.applyHighlight(self.highlighted);

    event?.stopPropagation();
  },

  onClickRegion() {
    console.log("PacketRegion.onClickRegion");
  },

  destroyRegion() {
    self.removeHighlightStyle();

    self.removeEvents();
  },

  handleSpanClick(event) {
    if (self.hidden) return;

    event.stopPropagation();

    return self.onClickRegion();
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
