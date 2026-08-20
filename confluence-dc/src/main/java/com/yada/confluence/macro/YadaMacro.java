package com.yada.confluence.macro;

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
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.upm.api.license.PluginLicenseManager;
import com.atlassian.upm.api.license.entity.PluginLicense;
import com.atlassian.upm.api.util.Option;

import javax.inject.Inject;
import javax.inject.Named;
import java.util.HashMap;
import java.util.Map;

@Named
public class YadaMacro implements Macro {

    private final PageManager pageManager;
    private final PermissionManager permissionManager;
    private final PluginLicenseManager pluginLicenseManager;

    @Inject
    public YadaMacro(
            @ComponentImport PageManager pageManager,
            @ComponentImport PermissionManager permissionManager,
            @ComponentImport PluginLicenseManager pluginLicenseManager) {
        this.pageManager = pageManager;
        this.permissionManager = permissionManager;
        this.pluginLicenseManager = pluginLicenseManager;
    }

    @Override
    public String execute(Map<String, String> parameters, String body, ConversionContext context) throws MacroExecutionException {
        // 1. License Check (Atlassian Data Center Marketplace UPM License)
        Option<PluginLicense> licenseOption = pluginLicenseManager.getLicense();
        if (licenseOption.isDefined()) {
            PluginLicense license = licenseOption.get();
            if (!license.isValid()) {
                return "<div class='aui-message aui-message-warning'><p class='title'><strong>YADA Architecture Diagram</strong></p><p>Valid Atlassian Data Center license required.</p></div>";
            }
        }

        // 2. Resolve Page Context
        long pageId = 0;
        if (context.getEntity() != null) {
            pageId = context.getEntity().getId();
        }

        String macroId = parameters.getOrDefault("diagramId", "default");
        String height = parameters.getOrDefault("height", "520px");
        String title = parameters.getOrDefault("title", "Architecture Diagram");

        // 3. Permission Check
        ConfluenceUser currentUser = AuthenticatedUserThreadLocal.get();
        boolean canEdit = false;
        if (pageId > 0) {
            Page page = pageManager.getPage(pageId);
            if (page != null) {
                canEdit = permissionManager.hasPermission(currentUser, Permission.EDIT, page);
            }
        }

        // 4. Render Velocity Template
        Map<String, Object> velocityContext = new HashMap<>();
        velocityContext.put("pageId", pageId);
        velocityContext.put("macroId", macroId);
        velocityContext.put("height", height);
        velocityContext.put("title", title);
        velocityContext.put("canEdit", canEdit);

        return VelocityUtils.getRenderedTemplate("templates/macro-view.vm", velocityContext);
    }

    @Override
    public BodyType getBodyType() {
        return BodyType.NONE;
    }

    @Override
    public OutputType getOutputType() {
        return OutputType.BLOCK;
    }
}
