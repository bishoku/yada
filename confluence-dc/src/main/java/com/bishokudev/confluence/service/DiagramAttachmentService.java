package com.bishokudev.confluence.service;

import com.atlassian.confluence.core.ContentEntityObject;
import com.atlassian.confluence.pages.Attachment;
import com.atlassian.confluence.pages.AttachmentManager;
import com.atlassian.confluence.pages.PageManager;
import com.atlassian.sal.api.component.ComponentLocator;
import com.atlassian.spring.container.ContainerManager;
import org.apache.commons.io.IOUtils;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Date;

public class DiagramAttachmentService {

    private final AttachmentManager attachmentManager;
    private final PageManager pageManager;

    public DiagramAttachmentService() {
        this(resolve(AttachmentManager.class, "attachmentManager"),
             resolve(PageManager.class, "pageManager"));
    }

    public DiagramAttachmentService(
            AttachmentManager attachmentManager,
            PageManager pageManager) {
        this.attachmentManager = attachmentManager != null ? attachmentManager : resolve(AttachmentManager.class, "attachmentManager");
        this.pageManager = pageManager != null ? pageManager : resolve(PageManager.class, "pageManager");
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

    public Attachment findDiagramAttachment(long pageId, String macroId, String diagramId) {
        if (pageManager == null || attachmentManager == null) {
            return null;
        }
        ContentEntityObject content = pageManager.getById(pageId);
        if (content instanceof com.atlassian.confluence.pages.Draft) {
            com.atlassian.confluence.pages.Draft draft = (com.atlassian.confluence.pages.Draft) content;
            if (draft.getPageIdAsLong() != null && draft.getPageIdAsLong() > 0) {
                ContentEntityObject target = pageManager.getById(draft.getPageIdAsLong());
                if (target != null) {
                    content = target;
                }
            }
        }
        if (content == null) {
            return null;
        }

        // Exact-name lookup only: no fuzzy/substring/"newest" fallbacks, so one macro
        // can never read or overwrite another macro's PNG.
        return attachmentManager.getAttachment(content, getPngAttachmentFileName(macroId, diagramId));
    }

    public boolean hasDiagramPng(long pageId, String macroId, String diagramId) {
        return findDiagramAttachment(pageId, macroId, diagramId) != null;
    }

    public byte[] getDiagramPngBytes(long pageId, String macroId, String diagramId) throws Exception {
        if (pageManager == null || attachmentManager == null) {
            return null;
        }
        Attachment attachment = findDiagramAttachment(pageId, macroId, diagramId);
        if (attachment == null) {
            return null;
        }

        try (InputStream is = attachmentManager.getAttachmentData(attachment)) {
            return IOUtils.toByteArray(is);
        }
    }

    public void saveDiagramPng(long pageId, String macroId, String diagramId, byte[] pngBytes) throws Exception {
        if (pageManager == null || attachmentManager == null) {
            throw new IllegalStateException("Confluence PageManager or AttachmentManager is unavailable");
        }
        ContentEntityObject content = pageManager.getById(pageId);
        if (content == null) {
            throw new IllegalArgumentException("Page with ID " + pageId + " not found");
        }

        Attachment existing = findDiagramAttachment(pageId, macroId, diagramId);
        String fileName = (existing != null) ? existing.getFileName() : getPngAttachmentFileName(macroId, diagramId);

        Attachment targetAttachment = existing;
        Attachment previousVersion = null;
        if (targetAttachment == null) {
            targetAttachment = new Attachment();
            targetAttachment.setFileName(fileName);
            targetAttachment.setContentType("image/png");
            targetAttachment.setMediaType("image/png");
        } else {
            previousVersion = (Attachment) targetAttachment.clone();
        }

        targetAttachment.setContentType("image/png");
        targetAttachment.setMediaType("image/png");
        targetAttachment.setContainer(content);
        targetAttachment.setVersionComment("Saved by YADA Architecture Diagram Macro");
        targetAttachment.setFileSize(pngBytes.length);
        targetAttachment.setLastModificationDate(new Date());
        content.addAttachment(targetAttachment);

        try (InputStream is = new ByteArrayInputStream(pngBytes)) {
            attachmentManager.saveAttachment(targetAttachment, previousVersion, is);
        }
    }

    public String getPngAttachmentFileName(long pageId, String macroId, String diagramId) {
        Attachment existing = findDiagramAttachment(pageId, macroId, diagramId);
        if (existing != null) {
            return existing.getFileName();
        }
        return getPngAttachmentFileName(macroId, diagramId);
    }

    public String getPngAttachmentFileName(String macroId, String diagramId) {
        String cleanMacroId = (macroId != null && !macroId.isEmpty()) ? macroId.replaceAll("[^a-zA-Z0-9_-]", "_") : "default";
        String cleanDiagramId = (diagramId != null && !diagramId.isEmpty()) ? diagramId.replaceAll("[^a-zA-Z0-9_-]", "_") : "default";
        return "yada_" + cleanMacroId + "_" + cleanDiagramId + ".png";
    }
}
