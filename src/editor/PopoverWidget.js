/*
 * Copyright (c) 2013 - present Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint regexp: true */

define(function (require, exports, module) {
    "use strict";

    // Brackets modules
    var EditorManager       = require("editor/EditorManager"),
        ViewUtils           = require("utils/ViewUtils");

    var popoverContainerHTML       = require("text!htmlContent/popover-template.html");

    var $popoverContainer,
        $popoverContent;

    // Constants
    var POINTER_HEIGHT              = 15,   // Pointer height, used to shift popover above pointer (plus a little bit of space)
        POPOVER_HORZ_MARGIN         =  5;   // Horizontal margin

    /**
     * There are three states for this var:
     * 1. If null, there is no provider result for the given mouse position.
     * 2. If non-null, and visible==true, there is a popover currently showing.
     * 3. If non-null, but visible==false, we're waiting for HOVER_DELAY, which
     *    is tracked by hoverTimer. The state changes to visible==true as soon as
     *    there is a provider. If the mouse moves before then, timer is restarted.
     *
     * @type {{
     *      visible: boolean,
     *      editor: !Editor,
     *      start: !{line, ch},             - start of matched text range
     *      end: !{line, ch},               - end of matched text range
     *      content: !string,               - HTML content to display in popover
     *      onShow: ?function():void,       - called once popover content added to the DOM (may never be called)
     *        - if specified, must call positionPreview()
     *      xpos: number,                   - x of center of popover
     *      ytop: number,                   - y of top of matched text (when popover placed above text, normally)
     *      ybot: number,                   - y of bottom of matched text (when popover moved below text, avoiding window top)
     *      marker: ?CodeMirror.TextMarker  - only set once visible==true
     * }}
     */
    var popoverState = null;



    // Popover widget management ----------------------------------------------

    /**
     * Cancels whatever popoverState was currently pending and sets it back to null. If the popover was visible,
     * hides it; if the popover was invisible and still pending, cancels hoverTimer so it will never be shown.
     */
    function hidePopover() {
        if (!popoverState) {
            return;
        }

        if (popoverState.visible) {
            $popoverContent.empty();
            $popoverContainer.hide();
            $popoverContainer.removeClass("active");
        }
        popoverState = null;
    }

    function positionPopover(editor, xpos, ypos, ybot) {
        var previewWidth  = $popoverContainer.outerWidth(),
            top           = ypos - $popoverContainer.outerHeight() - POINTER_HEIGHT,
            left          = xpos - previewWidth / 2,
            elementRect = {
                top:    top,
                left:   left - POPOVER_HORZ_MARGIN,
                height: $popoverContainer.outerHeight() + POINTER_HEIGHT,
                width:  previewWidth + 2 * POPOVER_HORZ_MARGIN
            },
            clip = ViewUtils.getElementClipSize($(editor.getRootElement()), elementRect);

        // Prevent horizontal clipping
        if (clip.left > 0) {
            left += clip.left;
        } else if (clip.right > 0) {
            left -= clip.right;
        }

        // If clipped on top, flip popover below line
        if (clip.top > 0) {
            top = ybot + POINTER_HEIGHT;
            $popoverContainer
                .removeClass("bubble-above")
                .addClass("bubble-below");
        } else {
            $popoverContainer
                .removeClass("bubble-below")
                .addClass("bubble-above");
        }

        $popoverContainer
            .css({
                left: left,
                top: top
            })
            .addClass("active");
    }

    /**
     * Changes the current hidden popoverState to visible, showing it in the UI and highlighting
     * its matching text in the editor.
     */
    function show(popover) {
        var editor = popover.editor;
        var cm;

        hidePopover();

        if (!editor || !editor._codeMirror) {
            hidePopover();
            return;
        }

        cm = editor._codeMirror;

        popoverState = popover;

        $popoverContent.append(popoverState.content);
        $popoverContainer.show();

        popoverState.visible = true;

        positionPopover(editor, popoverState.xpos, popoverState.ytop, popoverState.ybot);
    }

    function onActiveEditorChange(event, current, previous) {
        // Hide preview when editor changes
        hidePopover();

        if (previous && previous.document) {
            previous.document.off("change", hidePopover);
        }

        if (current && current.document) {
            current.document.on("change", hidePopover);
        }
    }


    // Create the preview container
    $popoverContainer = $(popoverContainerHTML).appendTo($("body"));
    $popoverContent = $popoverContainer.find(".content");

    exports.show = show;
    exports.hide = hidePopover;
});
