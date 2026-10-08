(function($) {
    'use strict';

    window.YadaConfluence = {
        openEditor: function(pageId, macroId) {
            var contextPath = AJS.contextPath() || '';
            var editorUrl = contextPath + '/download/resources/com.bishokudev.confluence.yada-confluence-dc:yada-resources/static/index.html?mode=edit&target=confluence-dc&pageId=' + encodeURIComponent(pageId) + '&macroId=' + encodeURIComponent(macroId) + '&cp=' + encodeURIComponent(contextPath) + '&t=' + Date.now();

            var $dialog = $('#yada-editor-dialog');
            if ($dialog.length === 0) {
                var dialogHtml = 
                    '<section id="yada-editor-dialog" class="aui-dialog2 aui-dialog2-xlarge aui-layer" role="dialog" aria-hidden="true" data-aui-modal="true">' +
                    '  <header class="aui-dialog2-header">' +
                    '    <h2 class="aui-dialog2-header-main">YADA Architecture Diagram Editor</h2>' +
                    '    <button class="aui-close-button aui-button aui-button-subtle" type="button" aria-label="Close" onclick="YadaConfluence.closeEditor();"></button>' +
                    '  </header>' +
                    '  <div class="aui-dialog2-content">' +
                    '    <iframe id="yada-editor-iframe" src="" style="width: 100%; height: 100%; border: none;"></iframe>' +
                    '  </div>' +
                    '</section>';
                $('body').append(dialogHtml);
                $dialog = $('#yada-editor-dialog');
            }

            $('#yada-editor-iframe').attr('src', editorUrl);
            $dialog.removeAttr('aria-hidden').removeAttr('hidden').show();
            try {
                AJS.dialog2('#yada-editor-dialog').show();
            } catch(e) {}
        },

        closeEditor: function() {
            var $dialog = $('#yada-editor-dialog');
            if ($dialog.length) {
                try {
                    AJS.dialog2('#yada-editor-dialog').hide();
                } catch(e) {}
                $dialog.attr('aria-hidden', 'true').attr('hidden', 'hidden').hide();
                $('#yada-editor-iframe').attr('src', 'about:blank');
            }
        },

        playSimulation: function(btnElement, pageId, macroId) {
            var $container = $(btnElement).closest('.yada-macro-container');
            var $body = $container.find('.yada-macro-body');
            var $playBtn = $container.find('.yada-play-btn');
            var isPlaying = $container.hasClass('yada-is-playing');

            if (isPlaying) {
                // Revert back to static preview image
                $container.removeClass('yada-is-playing');
                $container.css('height', 'auto');
                $body.css('height', 'auto');
                $playBtn.removeClass('yada-stop-btn');
                $playBtn.find('.yada-btn-text').text('Simülasyonu Başlat');
                $playBtn.find('.yada-btn-icon').html('<path d="M8 5v14l11-7z"/>');

                var rawPngUrl = $container.attr('data-png-url');
                var imgSrc = rawPngUrl ? (rawPngUrl.split('?')[0] + '?t=' + Date.now()) : '';
                $body.html(
                    '<div class="yada-macro-preview-wrapper">' +
                    '  <img class="yada-macro-preview-img" src="' + imgSrc + '" alt="Architecture Diagram" />' +
                    '</div>'
                );
            } else {
                // Determine height from the currently displayed preview image
                var currentImgHeight = $body.find('.yada-macro-preview-img').height() || 460;
                currentImgHeight = Math.max(300, Math.min(currentImgHeight, 680));

                $container.addClass('yada-is-playing');
                $container.css('height', currentImgHeight + 'px');
                $body.css('height', '100%');
                $playBtn.addClass('yada-stop-btn');
                $playBtn.find('.yada-btn-text').text('Durdur');
                $playBtn.find('.yada-btn-icon').html('<rect x="6" y="6" width="12" height="12"/>');

                var contextPath = AJS.contextPath() || '';
                var viewerUrl = contextPath + '/download/resources/com.bishokudev.confluence.yada-confluence-dc:yada-resources/static/index.html?mode=view&target=confluence-dc&pageId=' + encodeURIComponent(pageId) + '&macroId=' + encodeURIComponent(macroId) + '&cp=' + encodeURIComponent(contextPath) + '&autoplay=true&t=' + Date.now();
                $body.html('<iframe class="yada-macro-iframe" src="' + viewerUrl + '" allow="fullscreen" style="width: 100%; height: 100%; border: none;"></iframe>');
            }
        }
    };

    // Listen for messages from editor / viewer iframes
    window.addEventListener('message', function(event) {
        if (!event.data) return;

        if (event.data.type === 'CONFLUENCE_DC_OPEN_MODAL') {
            var pageId = event.data.pageId;
            var macroId = event.data.macroId || 'default';
            window.YadaConfluence.openEditor(pageId, macroId);
        } else if (event.data.type === 'CONFLUENCE_DC_CLOSE_MODAL') {
            window.YadaConfluence.closeEditor();

            if (event.data.reload) {
                // Reload viewer iframes on page with fresh cache-busting timestamp
                $('.yada-macro-iframe').each(function() {
                    var base = this.src.split('&t=')[0];
                    this.src = base + '&t=' + Date.now();
                });

                // Reload preview images with cache busting
                $('.yada-macro-preview-img').each(function() {
                    var baseSrc = this.src.split('?')[0];
                    this.src = baseSrc + '?t=' + Date.now();
                });

                // If page had an empty state, refresh so Confluence Macro renders the new diagram
                if ($('.yada-macro-empty-state').length) {
                    window.location.reload();
                }

                // If in edit mode, reload editor macro placeholder images immediately
                refreshEditorMacroImages(true);
            }
        }
    });

    // Hook into Confluence MacroBrowser for auto-generating unique diagram IDs
    function setupMacroBrowserOverride() {
        if (typeof AJS !== 'undefined' && AJS.MacroBrowser && typeof AJS.MacroBrowser.setMacroJsOverride === 'function') {
            var getNextDiagramId = function() {
                var existingIds = {};
                try {
                    if (window.tinymce && tinymce.activeEditor) {
                        var body = tinymce.activeEditor.getBody();
                        var $macros = $(body).find('[data-macro-name="yada"], [data-macro-name="yada-diagram"], [data-macro-name="yada-architecture-diagram"]');
                        $macros.each(function() {
                            var paramsStr = $(this).attr('data-macro-parameters');
                            if (paramsStr) {
                                var match = paramsStr.match(/diagramId=([^|&]+)/);
                                if (match && match[1]) {
                                    existingIds[match[1]] = true;
                                }
                            }
                        });
                    }
                } catch(e) {}

                var counter = 1;
                while (existingIds['diagram_' + counter] || existingIds['diagram' + counter] || (counter === 1 && existingIds['default'])) {
                    counter++;
                }
                return 'diagram_' + counter;
            };

            var overrideConfig = {
                beforeParamsSet: function(selectedParams, inserting) {
                    if (inserting) {
                        if (!selectedParams.diagramId || selectedParams.diagramId === 'default') {
                            selectedParams.diagramId = getNextDiagramId();
                        }
                    }
                    return selectedParams;
                }
            };

            AJS.MacroBrowser.setMacroJsOverride('yada', overrideConfig);
            AJS.MacroBrowser.setMacroJsOverride('yada-diagram', overrideConfig);
            AJS.MacroBrowser.setMacroJsOverride('yada-architecture-diagram', overrideConfig);
        }
    }

    // Flag to ensure property panel handler is registered only once
    var macroPropertyPanelRegistered = false;

    // Hook into Confluence Macro Property Panel to provide Image-like controls (Width input, S, M, L, Original)
    function setupMacroPropertyPanel(handler) {
        if (macroPropertyPanelRegistered) return true;

        var panelMacro = handler || (typeof AJS !== 'undefined' && AJS.Confluence && AJS.Confluence.PropertyPanel && AJS.Confluence.PropertyPanel.Macro);
        if (!panelMacro || typeof panelMacro.registerInitHandler !== 'function') {
            return false;
        }

        macroPropertyPanelRegistered = true;

        var getCurrentMacroWidth = function(macroNode) {
            var $node = $(macroNode);
            var paramsStr = $node.attr('data-macro-parameters') || '';
            var match = paramsStr.match(/width=([0-9]+)(?:px)?/);
            if (match && match[1]) {
                return parseInt(match[1], 10);
            }
            var attrW = parseInt($node.attr('width'), 10);
            if (attrW && attrW > 0) return attrW;
            return null;
        };

        var resizeMacroWidth = function(macroNode, widthVal, preset) {
            var $node = $(macroNode);

            // Update data-macro-parameters attribute
            var paramsStr = $node.attr('data-macro-parameters') || '';
            var params = paramsStr.split('|').filter(Boolean);
            var newParams = [];
            for (var i = 0; i < params.length; i++) {
                if (params[i].indexOf('width=') !== 0 && params[i].indexOf('height=') !== 0) {
                    newParams.push(params[i]);
                }
            }

            if (widthVal === 'auto' || widthVal === 'original' || widthVal <= 0) {
                newParams.push('width=auto');
                $node.removeAttr('width');
                $node.removeAttr('height');
                $node.css({
                    'width': '100%',
                    'max-width': '100%',
                    'height': 'auto'
                });
            } else {
                var num = parseInt(widthVal, 10);
                newParams.push('width=' + num + 'px');
                $node.attr('width', num);
                $node.removeAttr('height');
                $node.css({
                    'width': num + 'px',
                    'max-width': '100%',
                    'height': 'auto'
                });
            }

            $node.attr('data-macro-parameters', newParams.join('|'));

            if (window.tinymce && tinymce.activeEditor) {
                tinymce.activeEditor.undoManager.add();
            }

            // Snap and refresh property panel cleanly
            try {
                AJS.Confluence.PropertyPanel.destroy();
                setTimeout(function() {
                    $node.click();
                }, 40);
            } catch(e) {}

            refreshEditorMacroImages();
        };

        var bindSizeInput = function(macroNode) {
            var $input = $('#yada-size-input');
            if (!$input.length) return;

            $input.off('focus.yada').on('focus.yada', function() {
                $(this).select();
            });

            var applyFromInput = function() {
                var rawVal = $input.val();
                if (!rawVal) return;
                var clean = rawVal.replace(/[^0-9]/g, '');
                var num = parseInt(clean, 10);
                if (num && num >= 100 && num <= 2400) {
                    resizeMacroWidth(macroNode, num);
                } else if (rawVal.trim().toLowerCase() === 'auto' || rawVal.trim().toLowerCase() === 'original') {
                    resizeMacroWidth(macroNode, 'auto', 'original');
                } else {
                    var w = getCurrentMacroWidth(macroNode);
                    $input.val(w ? (w + 'px') : 'auto');
                }
            };

            $input.off('change.yada').on('change.yada', function() {
                applyFromInput();
            });

            $input.off('keydown.yada').on('keydown.yada', function(e) {
                if (e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    applyFromInput();
                } else if (e.keyCode === 27) {
                    try { AJS.Confluence.PropertyPanel.destroy(); } catch(err) {}
                }
            });
        };

        var initHandler = function(initMacroNode, buttons, options) {
            var $node = $(initMacroNode);
            var paramsStr = $node.attr('data-macro-parameters') || '';
            var currentW = getCurrentMacroWidth(initMacroNode);

            var isAuto = (paramsStr.indexOf('width=auto') !== -1) || (!currentW && paramsStr.indexOf('width=') === -1);
            var isSmall = !isAuto && currentW && currentW <= 380;
            var isMedium = !isAuto && currentW && currentW > 380 && currentW <= 680;
            var isLarge = !isAuto && currentW && currentW > 680;
            var isOriginal = isAuto;

            var displayW = isAuto ? 'auto' : (currentW + 'px');

            // 1. Hijack generic Macro Browser Edit button to directly open visual YADA canvas editor
            for (var b = 0; b < buttons.length; b++) {
                var btn = buttons[b];
                if (btn && ((btn.className && btn.className.indexOf('edit') !== -1) || btn.text === 'Edit' || btn.text === 'Düzenle')) {
                    btn.text = 'Düzenle';
                    btn.tooltip = 'YADA Mimari Editörünü Aç';
                    btn.click = function(clickedBtn, node) {
                        var pageId = (AJS.Meta && (AJS.Meta.get('page-id') || AJS.Meta.get('content-id') || AJS.Meta.get('attachment-source-content-id'))) || (AJS.params && (AJS.params.pageId || AJS.params.contentId));
                        var macroId = 'default';
                        var pStr = $(node).attr('data-macro-parameters') || '';
                        var m = pStr.match(/diagramId=([^|&]+)/);
                        if (m && m[1]) {
                            macroId = m[1];
                        } else if ($(node).attr('data-macro-id')) {
                            macroId = 'macro_' + $(node).attr('data-macro-id').replace(/[^a-zA-Z0-9_-]/g, '_');
                        }
                        AJS.Confluence.PropertyPanel.destroy();
                        window.YadaConfluence.openEditor(pageId, macroId);
                    };
                    break;
                }
            }

            // 2. Prepend width input, S, M, L, Original size buttons
            var sizeButtons = [
                {
                    className: 'yada-size-input-item',
                    tooltip: 'Genişlik (piksel, örn: 550px)',
                    html: '<input id="yada-size-input" class="yada-size-input" type="text" value="' + displayW + '" placeholder="Örn: 550px" />'
                },
                null,
                {
                    className: 'macro-size-btn editor-resize resize-small' + (isSmall ? ' selected active' : ''),
                    text: 'S',
                    tooltip: 'Küçük (300px)',
                    selected: isSmall,
                    click: function(btn, node) { resizeMacroWidth(node, 300, 'small'); }
                },
                {
                    className: 'macro-size-btn editor-resize resize-medium' + (isMedium ? ' selected active' : ''),
                    text: 'M',
                    tooltip: 'Orta (550px)',
                    selected: isMedium,
                    click: function(btn, node) { resizeMacroWidth(node, 550, 'medium'); }
                },
                {
                    className: 'macro-size-btn editor-resize resize-large' + (isLarge ? ' selected active' : ''),
                    text: 'L',
                    tooltip: 'Büyük (850px)',
                    selected: isLarge,
                    click: function(btn, node) { resizeMacroWidth(node, 850, 'large'); }
                },
                {
                    className: 'macro-size-btn editor-resize resize-original' + (isOriginal ? ' selected active' : ''),
                    text: 'Original',
                    tooltip: 'Orijinal Boyut (auto)',
                    selected: isOriginal,
                    click: function(btn, node) { resizeMacroWidth(node, 'auto', 'original'); }
                },
                null
            ];

            for (var i = sizeButtons.length - 1; i >= 0; i--) {
                buttons.unshift(sizeButtons[i]);
            }

            setTimeout(function() {
                bindSizeInput(initMacroNode);
            }, 30);

            refreshEditorMacroImages();
        };

        panelMacro.registerInitHandler(initHandler, 'yada');
        panelMacro.registerInitHandler(initHandler, 'yada-diagram');
        panelMacro.registerInitHandler(initHandler, 'yada-architecture-diagram');
        return true;
    }

    // Automatically swap any placeholder in TinyMCE with real diagram attachment
    function refreshEditorMacroImages(force) {
        if (!window.tinymce || !tinymce.activeEditor) return;
        var pageId = (AJS.Meta && (AJS.Meta.get('page-id') || AJS.Meta.get('content-id') || AJS.Meta.get('attachment-source-content-id'))) || (AJS.params && (AJS.params.pageId || AJS.params.contentId));
        if (!pageId || pageId === '0') return;

        var body = tinymce.activeEditor.getBody();
        if (!body) return;

        var contextPath = AJS.contextPath() || '';
        var $macros = $(body).find('.editor-inline-macro[data-macro-name="yada"], .editor-inline-macro[data-macro-name="yada-diagram"], .editor-inline-macro[data-macro-name="yada-architecture-diagram"]');
        
        $macros.each(function() {
            var $img = $(this);
            var src = $img.attr('src') || '';
            
            var macroId = 'default';
            var paramsStr = $img.attr('data-macro-parameters') || '';
            var match = paramsStr.match(/diagramId=([^|&]+)/);
            if (match && match[1]) {
                macroId = match[1];
            } else if ($img.attr('data-macro-id')) {
                macroId = 'macro_' + $img.attr('data-macro-id').replace(/[^a-zA-Z0-9_-]/g, '_');
            }

            // Sync visual width in TinyMCE from data-macro-parameters
            var widthMatch = paramsStr.match(/width=([0-9]+)(?:px)?/);
            if (widthMatch && widthMatch[1]) {
                var wVal = parseInt(widthMatch[1], 10);
                $img.attr('width', wVal);
                $img.removeAttr('height');
                $img.css({ 'width': wVal + 'px', 'max-width': '100%', 'height': 'auto' });
            } else if (paramsStr.indexOf('width=auto') !== -1) {
                $img.removeAttr('width');
                $img.removeAttr('height');
                $img.css({ 'width': '100%', 'max-width': '100%', 'height': 'auto' });
            }

            var diagramRestUrl = contextPath + '/rest/yada/1.0/diagram/' + encodeURIComponent(pageId) + '/default?macroId=' + encodeURIComponent(macroId);

            // If already pointing to this diagram REST URL, and not forced, return
            if (!force && src.indexOf('/rest/yada/1.0/diagram/' + pageId) !== -1) {
                return;
            }

            // Test if diagram PNG exists on backend via Image object
            var probe = new Image();
            probe.onload = function() {
                var freshSrc = diagramRestUrl + '&t=' + Date.now();
                $img.attr('src', freshSrc);
                $img.attr('data-mce-src', freshSrc);
            };
            probe.src = diagramRestUrl;
        });
    }

    // Register property panel across all Confluence lifecycle events to prevent race conditions
    if (typeof AJS !== 'undefined' && typeof AJS.bind === 'function') {
        AJS.bind('add-handler.property-panel', function(event, handler) {
            setupMacroPropertyPanel(handler);
        });
        AJS.bind('init.rte', function() {
            setupMacroPropertyPanel();
            setTimeout(function() {
                refreshEditorMacroImages();
            }, 300);
        });
        AJS.bind('rte.quickedit.ready', function() {
            setupMacroPropertyPanel();
            refreshEditorMacroImages();
        });
    }

    // Attempt early registration
    setupMacroPropertyPanel();

    var initAll = function() {
        setupMacroBrowserOverride();
        setupMacroPropertyPanel();

        // Poller during editor bootstrap (covers collaborative editing / Synchrony delayed DOM insertion)
        var pollCount = 0;
        var poller = setInterval(function() {
            pollCount++;
            setupMacroPropertyPanel();

            if (window.tinymce && tinymce.activeEditor && tinymce.activeEditor.getBody()) {
                refreshEditorMacroImages();
                try {
                    tinymce.activeEditor.off('SetContent.yada', refreshEditorMacroImages);
                    tinymce.activeEditor.on('SetContent.yada', refreshEditorMacroImages);
                    tinymce.activeEditor.off('NodeChange.yada', refreshEditorMacroImages);
                    tinymce.activeEditor.on('NodeChange.yada', refreshEditorMacroImages);

                    // Hook TinyMCE click and double-click
                    var editorBody = tinymce.activeEditor.getBody();
                    $(editorBody).off('click.yada').on('click.yada', function(e) {
                        setupMacroPropertyPanel();
                    });

                    $(editorBody).off('dblclick.yada').on('dblclick.yada', '.editor-inline-macro[data-macro-name="yada"], .editor-inline-macro[data-macro-name="yada-diagram"], .editor-inline-macro[data-macro-name="yada-architecture-diagram"]', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var $target = $(this);
                        var pageId = (AJS.Meta && (AJS.Meta.get('page-id') || AJS.Meta.get('content-id') || AJS.Meta.get('attachment-source-content-id'))) || (AJS.params && (AJS.params.pageId || AJS.params.contentId));
                        var macroId = 'default';
                        var pStr = $target.attr('data-macro-parameters') || '';
                        var m = pStr.match(/diagramId=([^|&]+)/);
                        if (m && m[1]) {
                            macroId = m[1];
                        } else if ($target.attr('data-macro-id')) {
                            macroId = 'macro_' + $target.attr('data-macro-id').replace(/[^a-zA-Z0-9_-]/g, '_');
                        }
                        AJS.Confluence.PropertyPanel.destroy();
                        window.YadaConfluence.openEditor(pageId, macroId);
                        return false;
                    });
                } catch(e) {}
            }
            if (pollCount > 15) {
                clearInterval(poller);
            }
        }, 600);
    };

    if (typeof AJS !== 'undefined' && typeof AJS.toInit === 'function') {
        AJS.toInit(initAll);
    } else {
        $(document).ready(initAll);
    }

})(AJS.$ || jQuery);
