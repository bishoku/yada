import type { AriaLabelConfig } from '@xyflow/react';

export const flowAria: Record<'en' | 'tr', AriaLabelConfig> = {
  en: {
    'node.a11yDescription.default': 'Press Enter or Space to select, Delete to remove, and Escape to cancel.',
    'node.a11yDescription.keyboardDisabled': 'Press Enter or Space to select. Use arrow keys to move, Delete to remove, and Escape to cancel.',
    'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }) => `Moved ${direction}. X: ${x}, Y: ${y}.`,
    'edge.a11yDescription.default': 'Press Enter or Space to select a connection, Delete to remove, and Escape to cancel.',
    'controls.ariaLabel': 'Canvas controls', 'controls.zoomIn.ariaLabel': 'Zoom in', 'controls.zoomOut.ariaLabel': 'Zoom out',
    'controls.fitView.ariaLabel': 'Fit diagram', 'controls.interactive.ariaLabel': 'Toggle canvas interaction',
    'minimap.ariaLabel': 'Diagram overview', 'handle.ariaLabel': 'Connection point',
  },
  tr: {
    'node.a11yDescription.default': 'Seçmek için Enter veya Boşluk, silmek için Delete, iptal için Escape tuşuna basın.',
    'node.a11yDescription.keyboardDisabled': 'Enter veya Boşluk ile seçin. Ok tuşlarıyla taşıyın, Delete ile silin, Escape ile iptal edin.',
    'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }) => {
      const directions: Record<string, string> = { left: 'sola', right: 'sağa', up: 'yukarı', down: 'aşağı' };
      const number = new Intl.NumberFormat('tr-TR');
      return `${directions[direction] || 'Yeni konuma'} taşındı. X: ${number.format(x)}, Y: ${number.format(y)}.`;
    },
    'edge.a11yDescription.default': 'Bağlantıyı seçmek için Enter veya Boşluk, silmek için Delete, iptal için Escape tuşuna basın.',
    'controls.ariaLabel': 'Tuval kontrolleri', 'controls.zoomIn.ariaLabel': 'Yakınlaştır', 'controls.zoomOut.ariaLabel': 'Uzaklaştır',
    'controls.fitView.ariaLabel': 'Diyagramı sığdır', 'controls.interactive.ariaLabel': 'Tuval etkileşimini değiştir',
    'minimap.ariaLabel': 'Diyagram genel görünümü', 'handle.ariaLabel': 'Bağlantı noktası',
  },
};
