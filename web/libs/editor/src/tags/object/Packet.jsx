// stub file to keep docs for Packet object tag

import Registry from "../../core/Registry";
import {inject, observer} from "mobx-react";
import {useEffect, useState} from "react";
import {hexy} from "hexy";
import {Buffer} from "buffer";
import {types} from "mobx-state-tree";
import {RichTextModel} from "./RichText";
import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import ObjectBase from "./Base";
import IsReadyMixin from "../../mixins/IsReadyMixin";
import RegionsMixin from "../../mixins/Regions";
import { AnnotationMixin } from "../../mixins/AnnotationMixin";
import {customTypes} from "../../core/CustomTypes";

/**
 * The `Packet` tag shows text that can be labeled. Use to display any type of text on the labeling interface.
 * You can use `<Style>.htx-text{ white-space: pre-wrap; }</Style>` to preserve all spaces in the text, otherwise spaces are trimmed when displayed and saved in the results.
 * Every space in the text sample is counted when calculating result offsets, for example for NER labeling tasks.
 *
 * Use with the following data types: packet.
 * @example
 * <!--Labeling configuration to label text for NER tasks with a word-level granularity -->
 * <View>
 *   <Packet name="text-1" value="$text" granularity="word" highlightColor="#ff0000" />
 *   <Labels name="ner" toName="text-1">
 *     <Label value="Person" />
 *     <Label value="Location" />
 *   </Labels>
 * </View>
 * @example
 * <Packet name="p1">Some simple text with explanations</Packet>
 * @name Packet
 * @regions TextRegion
 * @meta_title Text Tags for Text Objects
 * @meta_description Customize Label Studio with the Text tag to annotate text for NLP and NER machine learning and data science projects.
 * @param {string} name                                   Name of the element
 * @param {string} value                                  Data field containing text or a UR
 * @param {url|text} [valueType=text]                     Whether the text is stored directly in uploaded data or needs to be loaded from a URL
 * @param {yes|no} [saveTextResult]                       Whether to store labeled text along with the results. By default, doesn't store text for `valueType=url`
 * @param {none|base64|base64unicode} [encoding]          How to decode values from encoded strings
 * @param {boolean} [selectionEnabled=true]               Enable or disable selection
 * @param {string} [highlightColor]                       Hex string with highlight color, if not provided uses the labels color
 * @param {boolean} [showLabels]                          Whether or not to show labels next to the region; unset (by default) — use editor settings; true/false — override settings
 * @param {symbol|word|sentence|paragraph} [granularity]  Control region selection granularity
 */
const TagAttrs = types.model("PacketModel", {
  value: types.maybeNull(types.string),

  /** Defines the type of data to be shown */
  valuetype: types.optional(types.enumeration(["text", "url"]), () => (window.LS_SECURE_MODE ? "url" : "text")),

  inline: false,

  /** Whether or not to save selected text to the serialized data */
  savetextresult: types.optional(types.enumeration(["none", "no", "yes"]), () =>
    window.LS_SECURE_MODE ? "no" : "none",
  ),

  selectionenabled: types.optional(types.boolean, true),

  clickablelinks: false,

  highlightcolor: types.maybeNull(customTypes.color),

  showlabels: types.maybeNull(types.boolean),

  encoding: types.optional(types.enumeration(["none", "base64", "base64unicode"]), "none"),

  granularity: types.optional(types.enumeration(["symbol", "word", "sentence", "paragraph"]), "symbol"),
});

const Model = types
  .model("PacketModel", {
    type: "packet",
    _value: types.optional(types.string, ""),
  });

Model.views = RichTextModel.views;
Model.volatile = RichTextModel.volatile;
Model.actions = RichTextModel.actions;

const HtxPacket = inject("store")(
  observer(({ item }) => {
    const [viewContentState, setViewContentState] = useState("");

    useEffect(() => {
      const data = item._value;

      if (data.startsWith("/data/upload/")) {
        // 是文件名，则读取文件
        fetch(data).then((response) => response.arrayBuffer())
          .then((arrayBuffer) => {
            const buffer = Buffer.from(arrayBuffer);

            const viewHexy = hexy(buffer);

            setViewContentState(viewHexy);
          });

      } else {
        // 不是文件名，则直接呈现数据
        const viewHexy = hexy(data);

        setViewContentState(viewHexy);
      }
    }, []);

    return (
      // <Table bordered dataSource={item.dataSource} columns={item.columns} pagination={{ hideOnSinglePage: true }} />
      <div>
        <plaintext>{viewContentState}</plaintext>
      </div>
    );
  }),
);

const PacketModel = types.compose(
  "PacketModel",
  ProcessAttrsMixin,
  ObjectBase,
  RegionsMixin,
  AnnotationMixin,
  IsReadyMixin,
  TagAttrs,
  Model,
);

Registry.addTag("packet", PacketModel, HtxPacket);
Registry.addObjectType(PacketModel);

export { PacketModel, HtxPacket };
