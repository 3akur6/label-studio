// stub file to keep docs for Packet object tag

import Registry from "../../core/Registry";
import {inject, observer} from "mobx-react";
import {Buffer} from "buffer";
import {types} from "mobx-state-tree";
import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import ObjectBase from "./Base";
import IsReadyMixin from "../../mixins/IsReadyMixin";
import RegionsMixin from "../../mixins/Regions";
import {AnnotationMixin} from "../../mixins/AnnotationMixin";
import {Component} from "react";
import {BaseHexEditor} from "react-hex-editor";
import {StepsForm} from "@ant-design/pro-components";
import {Alert, Button} from "antd";
import {btoa} from "js-base64";

import "./Packet/Packet.scss";

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
 * @regions PacketRegion
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
const TagAttrs = types.model({
  value: types.maybeNull(types.string),
});

const Model = types
  .model("PacketModel", {
    type: "packet",
  }).views((self) => ({
    states() {
      return self.annotation.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();

      return states ? states.filter((s) => s.isLabeling && s.isSelected) : null;
    },
  })).actions((self) => ({
    addRegion(range) {
      const states = self.getAvailableStates();

      if (states.length === 0) return;

      const control = states[0];

      const areaValue = range;
      const resultValue = {[control.valueType]: control.selectedValues()};
      const area = self.annotation.createResult(areaValue, resultValue, control, self);

      area.setHighlight(true);

      return area;
    },
  }));

const HEX_EDITOR_COLUMNS = 0x10;
const ROW_HEIGHT = 22;
const HEX_EDITOR_WIDTH = 780;

const hexEditorTheme = {
  asciiPaddingX: 0,
  bytePaddingX: '0.4em',
  rowPaddingY: 0,
  colorBackground: '#fff',
  colorBackgroundColumnEven: '#fff',
  colorBackgroundColumnOdd: '#f6f8fa',
  colorBackgroundCursor: '#f1f8ff',
  colorBackgroundCursorHighlight: '#c8e1ff',
  colorBackgroundEven: '#fff',
  colorBackgroundInactiveCursor: '#fffbdd',
  colorBackgroundInactiveCursorHighlight: '#fffbdd',
  colorBackgroundInactiveSelection: '#e6ebf1',
  colorBackgroundInactiveSelectionCursor: '#e6ebf1',
  colorBackgroundLabel: '#fff',
  colorBackgroundLabelCurrent: '#fff',
  colorBackgroundOdd: '#f6f8fa',
  colorBackgroundRowEven: '#fff',
  colorBackgroundRowOdd: '#f6f8fa',
  colorBackgroundSelection: '#0366d6',
  colorBackgroundSelectionCursor: '#005cc5',
  colorScrollbackTrack: '#f6f8fa',
  colorScrollbackThumb: '#c6cbd1',
  colorScrollbackThumbHover: '#959da5',
  colorText: '#24292e',
  colorTextColumnEven: '#24292e',
  colorTextColumnOdd: '#24292e',
  colorTextCursor: '#1074e7',
  colorTextCursorHighlight: '#0366d6',
  colorTextEven: '#24292e',
  colorTextInactiveCursor: '#735c0f',
  colorTextInactiveCursorHighlight: '#735c0f',
  colorTextInactiveSelection: '#586069',
  colorTextInactiveSelectionCursor: '#586069',
  colorTextLabel: '#c6cbd1',
  colorTextLabelCurrent: '#676a6c',
  colorTextOdd: '#24292e',
  colorTextRowEven: '#24292e',
  colorTextRowOdd: '#24292e',
  colorTextSelection: '#fff',
  colorTextSelectionCursor: '#fff',
  fontFamily: 'monospace',
  fontSize: '16px',
  gutterWidth: '0.5em',
  cursorBlinkSpeed: '0.5s',
  labelPaddingX: '0.5em',
  scrollWidth: 'auto',
  textTransform: 'uppercase',
};

class PacketPieceView extends Component {
  state = {
    selectAreaAlertVisible: false,
    selectionStart: 0,
    selectionEnd: 0,
  };

  buildHexEditor = (content) => {
    if (!content) return;

    const rows = Math.ceil(content.length / HEX_EDITOR_COLUMNS);

    return <BaseHexEditor
      rows={rows}
      columns={HEX_EDITOR_COLUMNS}
      showAscii={true}
      showRowLabels={true}
      showColumnLabels={true}
      data={content}
      readOnly={true}
      theme={{hexEditor: hexEditorTheme}}
      rowHeight={ROW_HEIGHT}
      width={HEX_EDITOR_WIDTH}
      height={28 + rows * ROW_HEIGHT}
    />;
  };

  handleSelectAreaAlertClose = () => {
    this.setState({selectAreaAlertVisible: false});
  };

  _getByteValueSelection = (startElem, endElem) => {
    if (!startElem || !endElem) {
      return {
        selectionStart: null,
        selectionEnd: null,
      };
    }

    const selectionStart = parseInt(startElem.getAttribute("data-offset"));
    const selectionEnd = parseInt(endElem.getAttribute("data-offset")) + 1;

    const contentArray = this.rawContent.subarray(selectionStart, selectionEnd);
    const content = btoa(String.fromCharCode(contentArray));

    return {
      selectionStart,
      selectionEnd,
      content,
    }
  };

  handleSelectAreaFinish = () => {
    const { item } = this.props;

    if (!item._value) return null;

    const pageID = "#select-area";
    const startElem = document.querySelector(`${pageID} div.byteValue.selectionStart`);
    const endElem = document.querySelector(`${pageID} div.byteValue.selectionEnd`);

    const {selectionStart, selectionEnd, content} = this._getByteValueSelection(startElem, endElem);

    if ((selectionStart === null || selectionEnd === null) || (selectionStart >= selectionEnd)) {
      this.setState({selectAreaAlertVisible: true});
      return false;
    }

    // 选择成功
    this.setState({selectAreaAlertVisible: false, selectionStart, selectionEnd});

    return true;
  };

  registerSelectAreaLabelHandler = () => {
    const pageID = "#start-label";
    const hexEditorBodyElem = document.querySelector(`${pageID} .hexEditorBody`);

    if (!hexEditorBodyElem) return;

    hexEditorBodyElem.addEventListener("mouseup", (event) => {
      const startElem = document.querySelector(`${pageID} div.byteValue.selectionStart`);
      const endElem = document.querySelector(`${pageID} div.byteValue.selectionEnd`);

      const {selectionStart, selectionEnd, content} = this._getByteValueSelection(startElem, endElem);

      if ((selectionStart === null || selectionEnd === null) || (selectionStart >= selectionEnd)) {
        // 无有效选择
        return;
      }

      const {item} = this.props;
      if (!item) return;

      const states = item.activeStates();
      if (states.length === 0) return;

      const region = {
        start: selectionStart + this.state.selectionStart,
        end: selectionEnd + this.state.selectionStart,
        content,

        globalOffset: {
          start: this.state.selectionStart,
          end: this.state.selectionEnd,
        },
      };

      item.addRegion(region);
    });
  };

  componentDidMount() {
    this.registerSelectAreaLabelHandler();
  }

  render() {
    const { item } = this.props;

    if (!item._value) return null;

    this.rawContent = Buffer.from(item._value, "base64");

    return (
      <StepsForm
        stepsProps={{direction: "horizontal"}}
        submitter={{
          render: (props) => {
            switch (props.step) {
              case 0: {
                return <Button type="primary" onClick={() => props.onSubmit?.()}>
                  Next
                </Button>;
              }
              case 1: {
                return <Button type="primary" onClick={() => props.onPre?.()}>
                  Back
                </Button>;
              }
            }
          }
        }}
      >
        <StepsForm.StepForm
          name="select-area"
          title="Select area"
          stepProps={{description: "Select bytes you label then."}}
          onFinish={this.handleSelectAreaFinish}
        >
          {this.buildHexEditor(this.rawContent)}
          {this.state.selectAreaAlertVisible && <Alert
            type="error"
            message="You should check your selection."
            closable
            onClose={this.handleSelectAreaAlertClose}
          />}
        </StepsForm.StepForm>
        <StepsForm.StepForm
          name="start-label"
          title="Start label"
          stepProps={{description: "Let's label now!"}}
        >
          {this.buildHexEditor(this.rawContent.subarray(this.state.selectionStart, this.state.selectionEnd))}
        </StepsForm.StepForm>
      </StepsForm>
    );
  }
}

const HtxPacket = inject("store")(observer(PacketPieceView));

const PacketModel = types.compose(
  "PacketModel",
  ProcessAttrsMixin,
  IsReadyMixin,
  ObjectBase,
  RegionsMixin,
  AnnotationMixin,
  TagAttrs,
  Model,
);

Registry.addTag("packet", PacketModel, HtxPacket);
Registry.addObjectType(PacketModel);

export { PacketModel, HtxPacket };
