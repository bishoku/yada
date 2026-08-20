package com.yada.confluence.rest;

import com.atlassian.confluence.pages.Page;
import com.atlassian.confluence.pages.PageManager;
import com.atlassian.confluence.security.Permission;
import com.atlassian.confluence.security.PermissionManager;
import com.atlassian.confluence.user.AuthenticatedUserThreadLocal;
import com.atlassian.confluence.user.ConfluenceUser;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.upm.api.license.PluginLicenseManager;
import com.atlassian.upm.api.license.entity.PluginLicense;
import com.atlassian.upm.api.util.Option;
import com.yada.confluence.service.DiagramAttachmentService;
import org.json.JSONObject;

import javax.inject.Inject;
import javax.inject.Named;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

@Named
@Path("/diagram")
@Consumes({MediaType.APPLICATION_JSON})
@Produces({MediaType.APPLICATION_JSON})
public class YadaDiagramRestService {

    private final DiagramAttachmentService attachmentService;
    private final PageManager pageManager;
    private final PermissionManager permissionManager;
    private final PluginLicenseManager pluginLicenseManager;

    @Inject
    public YadaDiagramRestService(
            DiagramAttachmentService attachmentService,
            @ComponentImport PageManager pageManager,
            @ComponentImport PermissionManager permissionManager,
            @ComponentImport PluginLicenseManager pluginLicenseManager) {
        this.attachmentService = attachmentService;
        this.pageManager = pageManager;
        this.permissionManager = permissionManager;
        this.pluginLicenseManager = pluginLicenseManager;
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

            String json = attachmentService.getDiagramJson(pageId, macroId, diagramId);
            if (json == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(createErrorJson("Diagram attachment not found"))
                        .build();
            }

            return Response.ok(json).build();
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
            String logicalJson = payload.optString("logicalJson", "{}");
            String visualJson = payload.optString("visualJson", "{}");
            String previewDataUri = payload.optString("previewDataUri", null);

            JSONObject combinedData = new JSONObject();
            try {
                combinedData.put("logicalData", new JSONObject(logicalJson));
            } catch (Exception e) {
                combinedData.put("logicalData", logicalJson);
            }

            try {
                combinedData.put("visualData", new JSONObject(visualJson));
            } catch (Exception e) {
                combinedData.put("visualData", visualJson);
            }

            combinedData.put("updatedAt", payload.optString("updatedAt", ""));

            attachmentService.saveDiagramData(
                    pageId,
                    macroId,
                    diagramId,
                    combinedData.toString(),
                    previewDataUri
            );

            JSONObject result = new JSONObject();
            result.put("success", true);
            result.put("message", "Diagram and preview saved successfully");
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
        Option<PluginLicense> licenseOption = pluginLicenseManager.getLicense();
        if (licenseOption.isDefined()) {
            PluginLicense license = licenseOption.get();
            licInfo.put("isDefined", true);
            licInfo.put("isValid", license.isValid());
            licInfo.put("isEvaluation", license.isEvaluation());
            licInfo.put("description", license.getDescription());
        } else {
            licInfo.put("isDefined", false);
            licInfo.put("isValid", false);
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
