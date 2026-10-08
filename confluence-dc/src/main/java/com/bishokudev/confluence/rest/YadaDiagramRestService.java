package com.bishokudev.confluence.rest;

import com.atlassian.confluence.pages.Page;
import com.atlassian.confluence.pages.PageManager;
import com.atlassian.confluence.security.Permission;
import com.atlassian.confluence.security.PermissionManager;
import com.atlassian.confluence.user.AuthenticatedUserThreadLocal;
import com.atlassian.confluence.user.ConfluenceUser;
import com.atlassian.sal.api.component.ComponentLocator;
import com.atlassian.spring.container.ContainerManager;
import com.atlassian.upm.api.license.PluginLicenseManager;
import com.atlassian.upm.api.license.entity.PluginLicense;
import com.atlassian.upm.api.util.Option;
import com.bishokudev.confluence.service.DiagramAttachmentService;
import org.json.JSONObject;

import javax.inject.Inject;
import javax.inject.Named;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

@Path("/diagram")
@Consumes({MediaType.APPLICATION_JSON})
@Produces({MediaType.APPLICATION_JSON})
public class YadaDiagramRestService {

    private final DiagramAttachmentService attachmentService;
    private final PageManager pageManager;
    private final PermissionManager permissionManager;
    private final PluginLicenseManager pluginLicenseManager;

    public YadaDiagramRestService() {
        this(new DiagramAttachmentService(),
             resolve(PageManager.class, "pageManager"),
             resolve(PermissionManager.class, "permissionManager"),
             resolve(PluginLicenseManager.class, "pluginLicenseManager"));
    }

    public YadaDiagramRestService(
            DiagramAttachmentService attachmentService,
            PageManager pageManager,
            PermissionManager permissionManager,
            PluginLicenseManager pluginLicenseManager) {
        this.attachmentService = attachmentService != null ? attachmentService : new DiagramAttachmentService();
        this.pageManager = pageManager != null ? pageManager : resolve(PageManager.class, "pageManager");
        this.permissionManager = permissionManager != null ? permissionManager : resolve(PermissionManager.class, "permissionManager");
        this.pluginLicenseManager = pluginLicenseManager != null ? pluginLicenseManager : resolve(PluginLicenseManager.class, "pluginLicenseManager");
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

    @GET
    @Path("/{pageId}/{diagramId}")
    public Response getDiagram(
            @PathParam("pageId") long pageId,
            @PathParam("diagramId") String diagramId,
            @QueryParam("macroId") @DefaultValue("default") String macroId) {
        try {
            ConfluenceUser currentUser = AuthenticatedUserThreadLocal.get();
            Page page = pageManager.getPage(pageId);
            if (page != null && !permissionManager.hasPermission(currentUser, Permission.VIEW, page)) {
                return Response.status(Response.Status.FORBIDDEN)
                        .entity(createErrorJson("You do not have permission to view this page."))
                        .build();
            }

            byte[] pngBytes = attachmentService.getDiagramPngBytes(pageId, macroId, diagramId);
            if (pngBytes == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(createErrorJson("Diagram PNG attachment not found"))
                        .build();
            }

            return Response.ok(pngBytes, "image/png")
                    .header("Cache-Control", "no-cache")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(createErrorJson("Failed to load diagram: " + e.getMessage()))
                    .build();
        }
    }

    @POST
    @Path("/{pageId}/{diagramId}")
    public Response saveDiagram(
            @PathParam("pageId") long pageId,
            @PathParam("diagramId") String diagramId,
            @QueryParam("macroId") @DefaultValue("default") String macroId,
            String requestBody) {
        try {
            ConfluenceUser currentUser = AuthenticatedUserThreadLocal.get();
            Page page = pageManager.getPage(pageId);
            if (page == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(createErrorJson("Page not found"))
                        .build();
            }

            if (!permissionManager.hasPermission(currentUser, Permission.EDIT, page)) {
                return Response.status(Response.Status.FORBIDDEN)
                        .entity(createErrorJson("You do not have permission to edit this page."))
                        .build();
            }

            JSONObject payload = new JSONObject(requestBody);
            String bodyMacroId = payload.optString("macroId", null);
            if (bodyMacroId != null && !bodyMacroId.trim().isEmpty() && !bodyMacroId.equalsIgnoreCase("default")) {
                macroId = bodyMacroId.trim();
            }
            String pngDataUri = payload.optString("pngDataUri", null);
            if (pngDataUri == null) {
                pngDataUri = payload.optString("previewDataUri", null);
            }

            if (pngDataUri == null || pngDataUri.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                        .entity(createErrorJson("Missing pngDataUri in request body"))
                        .build();
            }

            String base64Data = pngDataUri;
            if (base64Data.contains(",")) {
                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
            }

            byte[] pngBytes = java.util.Base64.getDecoder().decode(base64Data);

            attachmentService.saveDiagramPng(
                    pageId,
                    macroId,
                    diagramId,
                    pngBytes
            );

            JSONObject result = new JSONObject();
            result.put("success", true);
            result.put("fileName", attachmentService.getPngAttachmentFileName(macroId, diagramId));
            result.put("message", "Diagram PNG saved successfully");
            return Response.ok(result.toString()).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(createErrorJson("Failed to save diagram: " + e.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/license")
    public Response checkLicense() {
        JSONObject licInfo = new JSONObject();
        if (pluginLicenseManager != null) {
            Option<PluginLicense> licenseOption = pluginLicenseManager.getLicense();
            if (licenseOption.isDefined()) {
                PluginLicense license = licenseOption.get();
                licInfo.put("isDefined", true);
                licInfo.put("isValid", license.isValid());
                licInfo.put("isEvaluation", license.isEvaluation());
                licInfo.put("description", license.getDescription());
            } else {
                licInfo.put("isDefined", false);
                licInfo.put("isValid", true); // dev mode
            }
        } else {
            licInfo.put("isDefined", false);
            licInfo.put("isValid", true); // dev mode
        }
        return Response.ok(licInfo.toString()).build();
    }

    private String createErrorJson(String message) {
        JSONObject err = new JSONObject();
        try {
            err.put("error", message);
        } catch (Exception ignored) {}
        return err.toString();
    }
}
