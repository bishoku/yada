package com.yada.confluence.service;

import com.atlassian.confluence.core.ContentEntityObject;
import com.atlassian.confluence.pages.Attachment;
import com.atlassian.confluence.pages.AttachmentManager;
import com.atlassian.confluence.pages.PageManager;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import org.apache.commons.io.IOUtils;

import javax.inject.Inject;
import javax.inject.Named;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;

@Named
public class DiagramAttachmentService {

    private final AttachmentManager attachmentManager;
    private final PageManager pageManager;

    @Inject
    public DiagramAttachmentService(
            @ComponentImport AttachmentManager attachmentManager,
            @ComponentImport PageManager pageManager) {
        this.attachmentManager = attachmentManager;
        this.pageManager = pageManager;
    }

    public String getDiagramJson(long pageId, String macroId, String diagramId) throws Exception {
        ContentEntityObject content = pageManager.getById(pageId);
        if (content == null) {
            return null;
        }

        String fileName = getJsonAttachmentFileName(macroId, diagramId);
        Attachment attachment = attachmentManager.getAttachment(content, fileName);
        if (attachment == null) {
            return null;
        }

        try (InputStream is = attachmentManager.getAttachmentData(attachment)) {
            return IOUtils.toString(is, StandardCharsets.UTF_8);
        }
    }

    public void saveDiagramData(long pageId, String macroId, String diagramId, String jsonContent, String previewDataUri) throws Exception {
        ContentEntityObject content = pageManager.getById(pageId);
        if (content == null) {
            throw new IllegalArgumentException("Page with ID " + pageId + " not found");
        }

        // 1. Save JSON diagram model
        String jsonFileName = getJsonAttachmentFileName(macroId, diagramId);
        saveOrUpdateAttachment(
                content,
                jsonFileName,
                "application/json",
                "YADA Architecture Diagram Data (" + diagramId + ")",
                jsonContent.getBytes(StandardCharsets.UTF_8)
        );

        // 2. Save PNG preview thumbnail if present
        if (previewDataUri != null && previewDataUri.contains(",")) {
            try {
                String base64Data = previewDataUri.substring(previewDataUri.indexOf(",") + 1);
                byte[] imageBytes = Base64.getDecoder().decode(base64Data);
                String pngFileName = getPngAttachmentFileName(macroId, diagramId);
                saveOrUpdateAttachment(
                        content,
                        pngFileName,
                        "image/png",
                        "YADA Architecture Diagram Preview Thumbnail",
                        imageBytes
                );
            } catch (Exception e) {
                // Log and continue even if thumbnail generation fails
                System.err.println("[YADA] Failed to save PNG thumbnail: " + e.getMessage());
            }
        }
    }

    private void saveOrUpdateAttachment(ContentEntityObject content, String fileName, String contentType, String comment, byte[] data) throws Exception {
        Attachment existing = attachmentManager.getAttachment(content, fileName);
        Attachment previous = null;
        Attachment target;

        if (existing != null) {
            previous = (Attachment) existing.clone();
            target = existing;
            target.setLastModificationDate(new Date());
        } else {
            target = new Attachment();
            target.setFileName(fileName);
            target.setContainer(content);
        }

        target.setContentType(contentType);
        target.setVersionComment(comment);
        target.setFileSize(data.length);

        try (ByteArrayInputStream bais = new ByteArrayInputStream(data)) {
            attachmentManager.saveAttachment(target, previous, bais);
        }
    }

    private String getJsonAttachmentFileName(String macroId, String diagramId) {
        String safeMacro = sanitizeFileName(macroId != null ? macroId : "default");
        String safeDiagram = sanitizeFileName(diagramId != null ? diagramId : "default");
        return "yada_" + safeMacro + "_" + safeDiagram + ".json";
    }

    private String getPngAttachmentFileName(String macroId, String diagramId) {
        String safeMacro = sanitizeFileName(macroId != null ? macroId : "default");
        String safeDiagram = sanitizeFileName(diagramId != null ? diagramId : "default");
        return "yada_" + safeMacro + "_" + safeDiagram + ".png";
    }

    private String sanitizeFileName(String input) {
        return input.replaceAll("[^a-zA-Z0-9_-]", "_");
    }
}
