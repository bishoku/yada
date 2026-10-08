package com.bishokudev.confluence.macro;

import com.atlassian.confluence.content.render.xhtml.ConversionContext;
import com.atlassian.confluence.macro.Macro;
import com.atlassian.confluence.macro.MacroExecutionException;
import com.atlassian.confluence.pages.Page;
import com.atlassian.confluence.pages.PageManager;
import com.atlassian.confluence.security.Permission;
import com.atlassian.confluence.security.PermissionManager;
import com.atlassian.confluence.user.AuthenticatedUserThreadLocal;
import com.atlassian.confluence.user.ConfluenceUser;
import com.atlassian.confluence.util.velocity.VelocityUtils;
import com.atlassian.sal.api.component.ComponentLocator;
import com.atlassian.spring.container.ContainerManager;
import com.atlassian.upm.api.license.PluginLicenseManager;
import com.atlassian.upm.api.license.entity.PluginLicense;
import com.atlassian.upm.api.util.Option;

import com.atlassian.confluence.content.render.image.ImageDimensions;
import com.atlassian.confluence.macro.DefaultImagePlaceholder;
import com.atlassian.confluence.macro.EditorImagePlaceholder;
import com.atlassian.confluence.macro.ImagePlaceholder;
import com.bishokudev.confluence.service.DiagramAttachmentService;

import java.util.HashMap;
import java.util.Map;

public class YadaMacro implements Macro, EditorImagePlaceholder {

    private final PageManager pageManager;
    private final PermissionManager permissionManager;
    private final PluginLicenseManager pluginLicenseManager;
    private final DiagramAttachmentService attachmentService;

    public YadaMacro() {
        this.pageManager = resolve(PageManager.class, "pageManager");
        this.permissionManager = resolve(PermissionManager.class, "permissionManager");
        this.pluginLicenseManager = resolve(PluginLicenseManager.class, "pluginLicenseManager");
        this.attachmentService = new DiagramAttachmentService();
    }

    public YadaMacro(
            PageManager pageManager,
            PermissionManager permissionManager,
            PluginLicenseManager pluginLicenseManager,
            DiagramAttachmentService attachmentService) {
        this.pageManager = pageManager != null ? pageManager : resolve(PageManager.class, "pageManager");
        this.permissionManager = permissionManager != null ? permissionManager : resolve(PermissionManager.class, "permissionManager");
        this.pluginLicenseManager = pluginLicenseManager != null ? pluginLicenseManager : resolve(PluginLicenseManager.class, "pluginLicenseManager");
        this.attachmentService = attachmentService != null ? attachmentService : new DiagramAttachmentService();
    }

    @SuppressWarnings("unchecked")
    private static <T> T resolve(Class<T> type, String beanName) {
        try {
            if (ComponentLocator.isInitialized()) {
                T comp = ComponentLocator.getComponent(type);
                if (comp != null) return comp;
            }
        } catch (Throwable ignored) {}
        try {
            if (ContainerManager.isContainerSetup()) {
                Object comp = ContainerManager.getComponent(beanName);
                if (type.isInstance(comp)) return type.cast(comp);
            }
        } catch (Throwable ignored) {}
        return null;
    }

    @Override
    public String execute(Map<String, String> parameters, String body, ConversionContext context) throws MacroExecutionException {
        // 1. License Check (Atlassian Data Center Marketplace UPM License)
        if (pluginLicenseManager != null) {
            Option<PluginLicense> licenseOption = pluginLicenseManager.getLicense();
            if (licenseOption.isDefined()) {
                PluginLicense license = licenseOption.get();
                if (!license.isValid()) {
                    return "<div class='aui-message aui-message-warning'><p class='title'><strong>YADA Architecture Diagram</strong></p><p>Valid Atlassian Data Center license required.</p></div>";
                }
            }
        }

        // 2. Resolve Page Context
        long pageId = resolvePageId(context);

        String macroId = resolveMacroId(parameters, context, pageId);
        String diagramId = "default";
        String height = parameters.getOrDefault("height", "520px");
        String title = parameters.getOrDefault("title", "Architecture Diagram");

        // 3. Permission Check
        ConfluenceUser currentUser = AuthenticatedUserThreadLocal.get();
        boolean canEdit = false;
        if (pageId > 0 && pageManager != null && permissionManager != null) {
            Page page = pageManager.getPage(pageId);
            if (page != null) {
                canEdit = permissionManager.hasPermission(currentUser, Permission.EDIT, page);
            }
        }

        // 4. Check Diagram PNG Existence
        boolean hasDiagram = (pageId > 0) && (attachmentService != null) && attachmentService.hasDiagramPng(pageId, macroId, diagramId);
        String pngFileName = (attachmentService != null) ? attachmentService.getPngAttachmentFileName(pageId, macroId, diagramId) : "yada_" + macroId + "_" + diagramId + ".png";

        // 5. Context Path & Timestamp
        com.atlassian.confluence.setup.BootstrapManager bootstrapManager = resolve(com.atlassian.confluence.setup.BootstrapManager.class, "bootstrapManager");
        String contextPath = "";
        if (bootstrapManager != null && bootstrapManager.getWebAppContextPath() != null) {
            contextPath = bootstrapManager.getWebAppContextPath();
        }

        String customHeight = null;
        if (parameters.containsKey("height") && parameters.get("height") != null && !parameters.get("height").trim().isEmpty()) {
            String h = parameters.get("height").trim();
            if (!h.equalsIgnoreCase("auto") && !h.equalsIgnoreCase("default")) {
                customHeight = (h.endsWith("px") || h.endsWith("%")) ? h : (h + "px");
            }
        }
        String customWidth = null;
        if (parameters.containsKey("width") && parameters.get("width") != null && !parameters.get("width").trim().isEmpty()) {
            String w = parameters.get("width").trim();
            if (!w.equalsIgnoreCase("auto") && !w.equalsIgnoreCase("default")) {
                customWidth = (w.endsWith("px") || w.endsWith("%")) ? w : (w + "px");
            }
        }

        // 6. Render Velocity Template
        Map<String, Object> velocityContext = new HashMap<>();
        velocityContext.put("pageId", pageId);
        velocityContext.put("macroId", macroId);
        velocityContext.put("diagramId", diagramId);
        velocityContext.put("pngFileName", pngFileName);
        velocityContext.put("hasDiagram", hasDiagram);
        velocityContext.put("height", height);
        velocityContext.put("customHeight", customHeight);
        velocityContext.put("customWidth", customWidth);
        velocityContext.put("title", title);
        velocityContext.put("canEdit", canEdit);
        velocityContext.put("contextPath", contextPath);
        velocityContext.put("timestamp", System.currentTimeMillis());

        return VelocityUtils.getRenderedTemplate("templates/macro-view.vm", velocityContext);
    }

    private String resolveMacroId(Map<String, String> parameters, ConversionContext context, long pageId) {
        String paramId = parameters != null ? parameters.get("diagramId") : null;
        if (paramId != null && !paramId.trim().isEmpty()) {
            String trimmed = paramId.trim();
            if (!"default".equalsIgnoreCase(trimmed)) {
                return trimmed;
            }
            // If explicitly "default", keep "default" if default attachment exists
            if (pageId > 0 && attachmentService != null && attachmentService.hasDiagramPng(pageId, "default", "default")) {
                return "default";
            }
        }

        // Try extracting Confluence Macro UUID from ConversionContext
        try {
            if (context != null) {
                Object macroDefObj = context.getProperty("macroDefinition");
                if (macroDefObj instanceof com.atlassian.confluence.xhtml.api.MacroDefinition) {
                    com.atlassian.confluence.xhtml.api.MacroDefinition macroDef = (com.atlassian.confluence.xhtml.api.MacroDefinition) macroDefObj;
                    if (macroDef.getMacroIdentifier() != null && macroDef.getMacroIdentifier().isPresent()) {
                        String uuid = macroDef.getMacroIdentifier().get().getId();
                        if (uuid != null && !uuid.trim().isEmpty()) {
                            return "macro_" + uuid.trim().replaceAll("[^a-zA-Z0-9_-]", "_");
                        }
                    }
                }
            }
        } catch (Throwable ignored) {}

        // Fallback: check if legacy "default" attachment exists on page
        if (pageId > 0 && attachmentService != null && attachmentService.hasDiagramPng(pageId, "default", "default")) {
            return "default";
        }

        return "default";
    }

    private long resolvePageId(ConversionContext context) {
        if (context == null || context.getEntity() == null) {
            return 0;
        }
        com.atlassian.confluence.core.ContentEntityObject entity = context.getEntity();
        if (entity instanceof com.atlassian.confluence.pages.Draft) {
            com.atlassian.confluence.pages.Draft draft = (com.atlassian.confluence.pages.Draft) entity;
            Long targetPageId = draft.getPageIdAsLong();
            if (targetPageId != null && targetPageId > 0) {
                return targetPageId;
            }
        }
        return entity.getId();
    }

    @Override
    public BodyType getBodyType() {
        return BodyType.NONE;
    }

    @Override
    public OutputType getOutputType() {
        return OutputType.BLOCK;
    }

    @Override
    public ImagePlaceholder getImagePlaceholder(Map<String, String> parameters, ConversionContext context) {
        long pageId = resolvePageId(context);

        String macroId = resolveMacroId(parameters, context, pageId);
        String diagramId = "default";

        boolean hasDiagram = (pageId > 0) && (attachmentService != null) && attachmentService.hasDiagramPng(pageId, macroId, diagramId);

        com.atlassian.confluence.setup.BootstrapManager bootstrapManager = resolve(com.atlassian.confluence.setup.BootstrapManager.class, "bootstrapManager");
        String contextPath = "";
        if (bootstrapManager != null && bootstrapManager.getWebAppContextPath() != null) {
            contextPath = bootstrapManager.getWebAppContextPath();
        }

        String imageUrl;
        if (hasDiagram) {
            String pngFileName = (attachmentService != null) ? attachmentService.getPngAttachmentFileName(pageId, macroId, diagramId) : "yada_" + macroId + "_" + diagramId + ".png";
            imageUrl = contextPath + "/download/attachments/" + pageId + "/" + pngFileName;
        } else {
            imageUrl = contextPath + "/download/resources/com.bishokudev.confluence.yada-confluence-dc:yada-resources/images/placeholder.png";
        }

        int w = parsePixelDimension(parameters != null ? parameters.get("width") : null);
        int h = parsePixelDimension(parameters != null ? parameters.get("height") : null);

        int targetWidth = (w > 0) ? w : -1;
        int targetHeight = (h > 0) ? h : -1;
        if (targetWidth <= 0 && targetHeight <= 0) {
            targetHeight = 320;
        }
        ImageDimensions dimensions = new ImageDimensions(targetWidth, targetHeight);

        return new DefaultImagePlaceholder(imageUrl, false, dimensions);
    }

    private static int parsePixelDimension(String value) {
        if (value == null) return -1;
        String clean = value.replaceAll("[^0-9]", "").trim();
        if (clean.isEmpty()) return -1;
        try {
            return Integer.parseInt(clean);
        } catch (NumberFormatException ignored) {
            return -1;
        }
    }
}
