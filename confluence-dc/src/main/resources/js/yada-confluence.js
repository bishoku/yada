(function($) {
    'use strict';

    window.YadaConfluence = {
        openEditor: function(pageId, macroId) {
            var contextPath = AJS.contextPath() || '';
            var editorUrl = contextPath + '/download/resources/com.yada.confluence.yada-confluence-dc:yada-resources/static/index.html?mode=edit&target=confluence-dc&pageId=' + encodeURIComponent(pageId) + '&macroId=' + encodeURIComponent(macroId) + '&cp=' + encodeURIComponent(contextPath);

            var $dialog = $('#yada-editor-dialog');
            if ($dialog.length === 0) {
                var dialogHtml = 
                    '<section id="yada-editor-dialog" class="aui-dialog2 aui-dialog2-xlarge aui-layer" role="dialog" aria-hidden="true" data-aui-modal="true">' +
                    '  <header class="aui-dialog2-header">' +
                    '    <h2 class="aui-dialog2-header-main">YADA Architecture Diagram Editor</h2>' +
                    '    <button class="aui-close-button aui-button aui-button-subtle" type="button" aria-label="Close" onclick="AJS.dialog2(\'#yada-editor-dialog\').hide();"></button>' +
                    '  </header>' +
                    '  <div class="aui-dialog2-content">' +
                    '    <iframe id="yada-editor-iframe" src="" style="width: 100%; height: 100%; border: none;"></iframe>' +
                    '  </div>' +
                    '</section>';
                $('body').append(dialogHtml);
            }

            $('#yada-editor-iframe').attr('src', editorUrl);
            AJS.dialog2('#yada-editor-dialog').show();
        }
    };

    // Listen for close message from editor iframe
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'CONFLUENCE_DC_CLOSE_MODAL') {
            if ($('#yada-editor-dialog').length) {
                AJS.dialog2('#yada-editor-dialog').hide();
            }
            if (event.data.reload) {
                // Reload viewer iframes on page
                $('.yada-macro-iframe').each(function() {
                    this.src = this.src;
                });
            }
        }
    });

})(AJS.$ || jQuery);
