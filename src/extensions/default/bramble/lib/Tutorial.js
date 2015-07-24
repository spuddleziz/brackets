define(function (require, exports, module) {
    "use strict";

    var StartupState  = brackets.getModule("bramble/StartupState");
    var EditorManager = brackets.getModule("editor/EditorManager");
    var BrambleEvents = brackets.getModule("bramble/BrambleEvents");
    var Filer         = brackets.getModule("filesystem/impls/filer/BracketsFiler");
    var Path          = Filer.Path;

    var PostMessageTransport = require("lib/PostMessageTransport");

    // Whether or not we're overriding the preview with a tutorial
    var _tutorialOverride;

    // After we change the override value, and in order to get the
    // tutorial to show, we need to force a reload for the preview.
    var _forceReload;

    function setOverride(val) {
        _tutorialOverride = !!val;
        _forceReload = true;

        PostMessageTransport.reload();
        BrambleEvents.triggerTutorialVisibilityChange(_tutorialOverride);
    }

    function getOverride() {
        return _tutorialOverride;
    }

    function getUrl() {
        return Path.join(StartupState.project("root"), "tutorial.html");
    }

    /**
     * Callback returns `true` or `false`, like fs.exists().
     */
    function exists(callback) {
        Filer.fs().stat(getUrl(), function(err, stats) {
            callback(stats && stats.type === "FILE");
        });
    }

    /**
     * Whether or not the file currently in the editor is the tutorial file.
     */
    function _tutorialInEditor() {
        var editor = EditorManager.getCurrentFullEditor();
        if(!editor) {
            return false;
        }

        return getUrl() === editor.document.file.fullPath;
    }

    /**
     * When the tutorial is hijacking the preview iframe, we only
     * need to reload when we're actually editing the tutorial.html file.
     */
    function shouldReload() {
        if(_forceReload) {
            _forceReload = false;
            return true;
        }

        return getOverride() && _tutorialInEditor();
    }

    /**
     * When the tutorial is hijacking the preview iframe, we don't
     * need to spam postMessage with DOM diffs and instrumentation calls.
     * We only want to do this if the actual tutorial.html file is open in the editor,
     * in which case one is likely editing it, and wants to see dynamic updates.
     */
    function shouldPostMessage() {
        return getOverride() && _tutorialInEditor();
    }

    exports.setOverride = setOverride;
    exports.getOverride = getOverride;
    exports.getUrl = getUrl;
    exports.exists = exists;
    exports.shouldReload = shouldReload;
    exports.shouldPostMessage = shouldPostMessage;
});
