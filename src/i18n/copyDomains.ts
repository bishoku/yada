export const copyDomains = {
dashboard: {
    tr: {
      dashboardTitle: "Diyagram Kontrol Paneli",
      dashboardSubtitle: "Bu çalışma alanı altındaki diyagramları yönetin ve düzenleyin.",
      newDiagram: "Yeni Diyagram Oluştur",
      newDiagramSub: "Boş bir tuvalle yeni tasarıma başlayın",
      lastUpdated: "Son güncelleme",
      open: "Aç",
      rename: "Yeniden Adlandır",
      delete: "Sil",
      confirmDelete: (name: string) => `"${name}" diyagramını silmek istediğinize emin misiniz?`
    },
    en: {
      dashboardTitle: "Diagram Dashboard",
      dashboardSubtitle: "Manage and edit diagrams under this workspace.",
      newDiagram: "Create New Diagram",
      newDiagramSub: "Start a new design with a clean canvas",
      lastUpdated: "Last updated",
      open: "Open",
      rename: "Rename",
      delete: "Delete",
      confirmDelete: (name: string) => `Are you sure you want to delete "${name}" diagram?`
    }
  },
sides: {
  tr: { top: 'Üst', right: 'Sağ', bottom: 'Alt', left: 'Sol' },
  en: { top: 'Top', right: 'Right', bottom: 'Bottom', left: 'Left' },
},
shapes: {
      rectangle: { tr: 'Kutu', en: 'Rectangle' },
      circle: { tr: 'Daire', en: 'Circle' },
      triangle: { tr: 'Üçgen', en: 'Triangle' },
      star: { tr: 'Yıldız', en: 'Star' },
      polygon: { tr: 'Çokgen', en: 'Polygon' },
      line: { tr: 'Çizgi', en: 'Line' },
      text: { tr: 'Metin', en: 'Text' },
      image: { tr: 'Görsel', en: 'Image' },
    }
};
