import React, { useState } from 'react';
import { 
  Square, Circle, Type, Image as ImageIcon, Trash2, ArrowUp, ArrowDown, Save, X, Move 
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ShapeLayer, ShapeType } from '../../types';

export const ComponentStudio: React.FC = () => {
  const activeComponent = useAppStore((s: any) => s.activeComponent);
  const selectedLayerId = useAppStore((s: any) => s.selectedLayerId);
  const theme = useAppStore((s: any) => s.theme);
  
  const setView = useAppStore((s: any) => s.setView);
  const setActiveComponent = useAppStore((s: any) => s.setActiveComponent);
  const setSelectedLayerId = useAppStore((s: any) => s.setSelectedLayerId);
  const addLayer = useAppStore((s: any) => s.addLayer);
  const updateLayer = useAppStore((s: any) => s.updateLayer);
  const deleteLayer = useAppStore((s: any) => s.deleteLayer);
  const reorderLayers = useAppStore((s: any) => s.reorderLayers);
  const saveComponentToLibrary = useAppStore((s: any) => s.saveComponentToLibrary);

  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  if (!activeComponent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
        <span className="text-sm font-semibold text-slate-550">
          No component loaded in Studio.
        </span>
        <button 
          onClick={() => setView('diagram')} 
          className="mt-4 px-4 py-2 bg-indigo-650 text-white rounded-xl text-xs font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Find currently selected layer details
  const selectedLayer = activeComponent.layers.find(
    (l: ShapeLayer) => l.id === selectedLayerId
  );

  // Helper to add shape layer with defaults
  const handleAddShape = (type: ShapeType) => {
    const layerCount = activeComponent.layers.length;
    const defaultStyles: Record<ShapeType, any> = {
      rectangle: { fill: '#6366f1', stroke: '#4f46e5', strokeWidth: 2, opacity: 1, rx: 8 },
      circle: { fill: '#10b981', stroke: '#059669', strokeWidth: 2, opacity: 1 },
      text: { fill: '#1e293b', opacity: 1 },
      image: { opacity: 1 },
    };

    const newLayer: ShapeLayer = {
      id: `layer-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      name: `Katman ${layerCount + 1} (${type === 'rectangle' ? 'Kutu' : type === 'circle' ? 'Daire' : type === 'text' ? 'Metin' : 'Görsel'})`,
      zIndex: layerCount,
      x: 30 + (layerCount * 10) % 50,
      y: 30 + (layerCount * 10) % 50,
      width: type === 'text' ? 100 : 60,
      height: type === 'text' ? 24 : 60,
      style: defaultStyles[type] || { opacity: 1 },
      content: type === 'text' ? 'Metin' : '',
    };

    addLayer(newLayer);
    setSelectedLayerId(newLayer.id);
  };

  // Convert uploaded image to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, layerId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateLayer(layerId, { content: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag shapes inside studio canvas
  const handleSvgMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    setSelectedLayerId(layerId);

    const layer = activeComponent.layers.find((l: ShapeLayer) => l.id === layerId);
    if (!layer) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = layer.x;
    const initialY = layer.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.round(moveEvent.clientX - startX);
      const deltaY = Math.round(moveEvent.clientY - startY);

      // Bound position to component dimensions
      const nextX = Math.max(0, Math.min(initialX + deltaX, activeComponent.dimensions.width - layer.width));
      const nextY = Math.max(0, Math.min(initialY + deltaY, activeComponent.dimensions.height - layer.height));

      updateLayer(layerId, {
        x: nextX,
        y: nextY,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Resize shapes inside studio canvas
  const handleResizeMouseDown = (e: React.MouseEvent, layerId: string, handleType: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    e.preventDefault();

    const layer = activeComponent.layers.find((l: ShapeLayer) => l.id === layerId);
    if (!layer) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = layer.x;
    const initialY = layer.y;
    const initialW = layer.width;
    const initialH = layer.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.round(moveEvent.clientX - startX);
      const deltaY = Math.round(moveEvent.clientY - startY);

      let nextX = initialX;
      let nextY = initialY;
      let nextW = initialW;
      let nextH = initialH;

      switch (handleType) {
        case 'br':
          nextW = Math.max(10, initialW + deltaX);
          nextH = Math.max(10, initialH + deltaY);
          break;
        case 'bl':
          const possibleW_bl = initialW - deltaX;
          if (possibleW_bl >= 10) {
            nextX = initialX + deltaX;
            nextW = possibleW_bl;
          }
          nextH = Math.max(10, initialH + deltaY);
          break;
        case 'tr':
          nextW = Math.max(10, initialW + deltaX);
          const possibleH_tr = initialH - deltaY;
          if (possibleH_tr >= 10) {
            nextY = initialY + deltaY;
            nextH = possibleH_tr;
          }
          break;
        case 'tl':
          const possibleW_tl = initialW - deltaX;
          const possibleH_tl = initialH - deltaY;
          if (possibleW_tl >= 10) {
            nextX = initialX + deltaX;
            nextW = possibleW_tl;
          }
          if (possibleH_tl >= 10) {
            nextY = initialY + deltaY;
            nextH = possibleH_tl;
          }
          break;
      }

      updateLayer(layerId, {
        x: Math.max(0, nextX),
        y: Math.max(0, nextY),
        width: nextW,
        height: nextH
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // HTML5 Drag & Drop handlers for real-time layer reordering using stable IDs
  const handleLayerDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === null || draggedId === id) return;

    // Find indices of dragged and target layers in sorted layers list
    const layers = [...activeComponent.layers].sort((a: ShapeLayer, b: ShapeLayer) => a.zIndex - b.zIndex);
    const sourceIdx = layers.findIndex(l => l.id === draggedId);
    const targetIdx = layers.findIndex(l => l.id === id);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      reorderLayers(sourceIdx, targetIdx);
    }
  };

  const handleLayerDragEnd = () => {
    setDraggedId(null);
  };

  // Save changes to library
  const handleSave = async () => {
    if (!activeComponent.name.trim()) {
      setError(theme === 'dark' ? 'Lütfen bileşene bir isim verin.' : 'Please enter a component name.');
      return;
    }
    setError(null);
    await saveComponentToLibrary();
    setActiveComponent(null);
    setView('diagram');
  };

  // Reorder layers z-index
  const moveLayerUp = (index: number) => {
    if (index === activeComponent.layers.length - 1) return;
    reorderLayers(index, index + 1);
  };

  const moveLayerDown = (index: number) => {
    if (index === 0) return;
    reorderLayers(index, index - 1);
  };

  // Sort layers by zIndex ascending for layout rendering
  const sortedLayersForDesign = [...activeComponent.layers].sort((a: ShapeLayer, b: ShapeLayer) => a.zIndex - b.zIndex);

  // Layers list displays topmost layer first (Index descending)
  const layersListDescending = [...activeComponent.layers].sort((a: ShapeLayer, b: ShapeLayer) => b.zIndex - a.zIndex);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300 font-sans">
      
      {/* Top Bar Header */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveComponent(null);
              setView('diagram');
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {theme === 'dark' ? 'BİLEŞEN STÜDYOSU' : 'COMPONENT STUDIO'}
            </span>
            <input
              type="text"
              placeholder={theme === 'dark' ? 'Bileşen Adı' : 'Component Name'}
              value={activeComponent.name}
              onChange={(e) => useAppStore.setState((s: any) => ({
                activeComponent: { ...s.activeComponent, name: e.target.value }
              }))}
              className="px-3 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-bold"
            />
          </div>
        </div>

        {/* Studio settings width/height */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-550 dark:text-slate-400">
            <span>{theme === 'dark' ? 'Kategori:' : 'Category:'}</span>
            <select
              value={activeComponent.category}
              onChange={(e) => useAppStore.setState((s: any) => ({
                activeComponent: { ...s.activeComponent, category: e.target.value }
              }))}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-xl text-xs focus:outline-none text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              <option value="Client">{theme === 'dark' ? 'İstemci' : 'Client'}</option>
              <option value="Server">{theme === 'dark' ? 'Uygulama Sunucusu' : 'App Server'}</option>
              <option value="Database">{theme === 'dark' ? 'Veritabanı' : 'Database'}</option>
              <option value="Gateway">API Gateway</option>
              <option value="Cache">{theme === 'dark' ? 'Önbellek' : 'Cache Store'}</option>
              <option value="Queue">{theme === 'dark' ? 'Kuyruk' : 'Message Queue'}</option>
              <option value="Custom">{theme === 'dark' ? 'Diğer' : 'Other'}</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-550 dark:text-slate-400">
            <span>W:</span>
            <input
              type="number"
              value={activeComponent.dimensions.width}
              onChange={(e) => useAppStore.setState((s: any) => ({
                activeComponent: { 
                  ...s.activeComponent, 
                  dimensions: { ...s.activeComponent.dimensions, width: Math.max(50, Number(e.target.value)) } 
                }
              }))}
              className="w-14 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg text-center focus:outline-none font-bold"
            />
            <span className="ml-1">H:</span>
            <input
              type="number"
              value={activeComponent.dimensions.height}
              onChange={(e) => useAppStore.setState((s: any) => ({
                activeComponent: { 
                  ...s.activeComponent, 
                  dimensions: { ...s.activeComponent.dimensions, height: Math.max(50, Number(e.target.value)) } 
                }
              }))}
              className="w-14 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg text-center focus:outline-none font-bold"
            />
          </div>

          {error && <span className="text-xs text-rose-500 font-semibold">{error}</span>}

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{theme === 'dark' ? 'Kaydet' : 'Save'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Panels */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Toolbox Panel */}
        <aside className="w-60 border-r border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex flex-col p-4 shrink-0 gap-3">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
            {theme === 'dark' ? 'ŞEKİL ARAÇLARI' : 'SHAPE LIBRARY'}
          </span>

          <button
            onClick={() => handleAddShape('rectangle')}
            className="flex items-center gap-2.5 w-full text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
          >
            <Square className="w-4 h-4 text-indigo-500" />
            <span>{theme === 'dark' ? 'Dikdörtgen Kutu' : 'Rectangle Card'}</span>
          </button>

          <button
            onClick={() => handleAddShape('circle')}
            className="flex items-center gap-2.5 w-full text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
          >
            <Circle className="w-4 h-4 text-emerald-500" />
            <span>{theme === 'dark' ? 'Daire / Elips' : 'Circle / Ellipse'}</span>
          </button>

          <button
            onClick={() => handleAddShape('text')}
            className="flex items-center gap-2.5 w-full text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
          >
            <Type className="w-4 h-4 text-violet-500" />
            <span>{theme === 'dark' ? 'Metin Alanı' : 'Text Box'}</span>
          </button>

          <button
            onClick={() => handleAddShape('image')}
            className="flex items-center gap-2.5 w-full text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-amber-500" />
            <span>{theme === 'dark' ? 'Resim / İkon' : 'Image / Asset'}</span>
          </button>
        </aside>

        {/* Center Design Workspace */}
        <main 
          className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-8 relative"
          onClick={() => setSelectedLayerId(null)}
        >
          {/* Centered Canvas Border boundaries */}
          <div 
            className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 shadow-2xl relative select-none"
            style={{
              width: activeComponent.dimensions.width,
              height: activeComponent.dimensions.height,
              backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px), radial-gradient(#cbd5e1 1px, transparent 1px)',
              backgroundSize: '10px 10px',
              backgroundPosition: '0 0, 5px 5px'
            }}
          >
            {/* SVG Render Container */}
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${activeComponent.dimensions.width} ${activeComponent.dimensions.height}`}
              xmlns="http://www.w3.org/2000/svg"
              style={{ overflow: 'visible' }}
            >
              {sortedLayersForDesign.map((layer) => {
                const { id, type, x, y, width: w, height: h, style, content } = layer;
                const isSelected = selectedLayerId === id;
                const opacity = style.opacity ?? 1;

                // Shared border styling inside design mode
                const strokeProps = isSelected 
                  ? { stroke: '#6366f1', strokeWidth: Math.max(2, (style.strokeWidth ?? 0) + 1) } 
                  : { stroke: style.stroke || 'none', strokeWidth: style.strokeWidth ?? 0 };

                const interactiveProps = {
                  onMouseDown: (e: React.MouseEvent) => handleSvgMouseDown(e, id),
                  onClick: (e: React.MouseEvent) => e.stopPropagation(),
                  style: { cursor: 'move', pointerEvents: 'all' as const }
                };

                const renderShape = () => {
                  switch (type) {
                    case 'rectangle':
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill={style.fill || 'transparent'}
                          {...strokeProps}
                          rx={style.rx ?? 0}
                          opacity={opacity}
                          {...interactiveProps}
                        />
                      );

                    case 'circle':
                      return (
                        <ellipse
                          cx={x + w / 2}
                          cy={y + h / 2}
                          rx={w / 2}
                          ry={h / 2}
                          fill={style.fill || 'transparent'}
                          {...strokeProps}
                          opacity={opacity}
                          {...interactiveProps}
                        />
                      );

                    case 'text':
                      return (
                        <text
                          x={x + w / 2}
                          y={y + h / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={style.fill || '#000000'}
                          {...strokeProps}
                          fontSize={h * 0.7}
                          fontFamily="sans-serif"
                          fontWeight="bold"
                          opacity={opacity}
                          className="select-none font-bold"
                          {...interactiveProps}
                        >
                          {content || ''}
                        </text>
                      );

                    case 'image':
                      return (
                        <g {...interactiveProps}>
                          {content ? (
                            <image
                              href={content}
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              preserveAspectRatio="none"
                              opacity={opacity}
                            />
                          ) : (
                            <rect
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              fill="#f1f5f9"
                              stroke="#cbd5e1"
                              strokeWidth={2}
                              strokeDasharray="4,4"
                              opacity={opacity}
                            />
                          )}
                        </g>
                      );

                    default:
                      return null;
                  }
                };

                return (
                  <g key={id}>
                    {renderShape()}

                    {/* Resize handle overlays */}
                    {isSelected && (
                      <g>
                        {/* Outline box */}
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth={1.5}
                          strokeDasharray="3,3"
                          style={{ pointerEvents: 'none' }}
                        />
                        
                        {/* Handles (tl, tr, bl, br) */}
                        <circle
                          cx={x}
                          cy={y}
                          r={4.5}
                          fill="#ffffff"
                          stroke="#4f46e5"
                          strokeWidth={1.5}
                          style={{ cursor: 'nwse-resize', pointerEvents: 'all' }}
                          onMouseDown={(e) => handleResizeMouseDown(e, id, 'tl')}
                        />
                        <circle
                          cx={x + w}
                          cy={y}
                          r={4.5}
                          fill="#ffffff"
                          stroke="#4f46e5"
                          strokeWidth={1.5}
                          style={{ cursor: 'nesw-resize', pointerEvents: 'all' }}
                          onMouseDown={(e) => handleResizeMouseDown(e, id, 'tr')}
                        />
                        <circle
                          cx={x}
                          cy={y + h}
                          r={4.5}
                          fill="#ffffff"
                          stroke="#4f46e5"
                          strokeWidth={1.5}
                          style={{ cursor: 'nesw-resize', pointerEvents: 'all' }}
                          onMouseDown={(e) => handleResizeMouseDown(e, id, 'bl')}
                        />
                        <circle
                          cx={x + w}
                          cy={y + h}
                          r={4.5}
                          fill="#ffffff"
                          stroke="#4f46e5"
                          strokeWidth={1.5}
                          style={{ cursor: 'nwse-resize', pointerEvents: 'all' }}
                          onMouseDown={(e) => handleResizeMouseDown(e, id, 'br')}
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </main>

        {/* Right Attribute & Layers Inspector Panel */}
        <aside className="w-80 border-l border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex flex-col overflow-hidden shrink-0">
          
          {/* Top Half: Layers Panel */}
          <div className="flex-1 flex flex-col border-b border-slate-200 dark:border-slate-800 p-4 min-h-[220px] overflow-hidden">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 shrink-0">
              {theme === 'dark' ? 'KATMANLAR' : 'LAYERS LIST'}
            </span>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
              {layersListDescending.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-slate-400 italic text-[11px] text-center">
                  {theme === 'dark' ? 'Henüz şekil eklenmedi.' : 'No layers added yet.'}
                </div>
              ) : (
                layersListDescending.map((layer) => {
                  const originalIdx = activeComponent.layers.findIndex((l: ShapeLayer) => l.id === layer.id);
                  const isSelected = selectedLayerId === layer.id;
                  
                  return (
                    <div
                      key={layer.id}
                      draggable
                      onDragStart={(e) => handleLayerDragStart(e, layer.id)}
                      onDragOver={(e) => handleLayerDragOver(e, layer.id)}
                      onDragEnd={handleLayerDragEnd}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLayerId(layer.id);
                      }}
                      className={`px-3 py-2 border rounded-xl flex items-center justify-between cursor-pointer group transition-all duration-150 ${
                        isSelected 
                          ? 'border-indigo-500/40 bg-indigo-500/5 dark:bg-indigo-500/10' 
                          : 'border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      } ${draggedId === layer.id ? 'opacity-40 bg-slate-100/50 dark:bg-slate-800/50 border-dashed border-indigo-500' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Move className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold truncate text-slate-700 dark:text-slate-350">
                          {layer.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayerUp(originalIdx);
                          }}
                          disabled={originalIdx === activeComponent.layers.length - 1}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title="Katmanı Üste Taşı"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayerDown(originalIdx);
                          }}
                          disabled={originalIdx === 0}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          title="Katmanı Alta Taşı"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLayer(layer.id);
                          }}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Half: Property Inspector */}
          <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              {theme === 'dark' ? 'ÖZELLİKLER' : 'ATTRIBUTES INSPECTOR'}
            </span>

            {!selectedLayer ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-slate-400 italic text-[11px] text-center">
                {theme === 'dark' ? 'Özellikleri düzenlemek için bir katman seçin.' : 'Select a shape layer to view attributes.'}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {/* Layer Rename */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {theme === 'dark' ? 'Katman İsmi' : 'Layer Title'}
                  </label>
                  <input
                    type="text"
                    value={selectedLayer.name}
                    onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-bold"
                  />
                </div>

                {/* X & Y position / width / height */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      X (Koordinat)
                    </label>
                    <input
                      type="number"
                      value={selectedLayer.x}
                      onChange={(e) => updateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                      className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Y (Koordinat)
                    </label>
                    <input
                      type="number"
                      value={selectedLayer.y}
                      onChange={(e) => updateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                      className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {theme === 'dark' ? 'Genişlik (W)' : 'Width (W)'}
                    </label>
                    <input
                      type="number"
                      value={selectedLayer.width}
                      onChange={(e) => updateLayer(selectedLayer.id, { width: Math.max(1, Number(e.target.value)) })}
                      className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {theme === 'dark' ? 'Yükseklik (H)' : 'Height (H)'}
                    </label>
                    <input
                      type="number"
                      value={selectedLayer.height}
                      onChange={(e) => updateLayer(selectedLayer.id, { height: Math.max(1, Number(e.target.value)) })}
                      className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Opacity slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <span>{theme === 'dark' ? 'Opaklık (Şeffaflık)' : 'Opacity'}</span>
                    <span>{Math.round((selectedLayer.style.opacity ?? 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedLayer.style.opacity ?? 1}
                    onChange={(e) => updateLayer(selectedLayer.id, {
                      style: { ...selectedLayer.style, opacity: Number(e.target.value) }
                    })}
                    className="w-full accent-indigo-650 cursor-pointer mt-1"
                  />
                </div>

                {/* Content based fields (Text and Image) */}
                {selectedLayer.type === 'text' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {theme === 'dark' ? 'Yazı Metni' : 'Text Value'}
                    </label>
                    <input
                      type="text"
                      value={selectedLayer.content || ''}
                      onChange={(e) => updateLayer(selectedLayer.id, { content: e.target.value })}
                      className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-250 font-bold"
                    />
                  </div>
                )}

                {selectedLayer.type === 'image' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {theme === 'dark' ? 'Görsel Seç' : 'Choose Image Asset'}
                    </label>
                    <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950 flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                      <span className="text-[10px] font-semibold text-indigo-550 dark:text-indigo-400">
                        {selectedLayer.content ? (theme === 'dark' ? 'Resmi Değiştir' : 'Change Image') : (theme === 'dark' ? 'Dosya Yükle' : 'Upload Image')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, selectedLayer.id)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Colors (Fill and Stroke) */}
                {selectedLayer.type !== 'image' && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {theme === 'dark' ? 'Dolgu Rengi' : 'Fill Color'}
                      </label>
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-0.5">
                        <input
                          type="color"
                          value={selectedLayer.style.fill || '#000000'}
                          onChange={(e) => updateLayer(selectedLayer.id, {
                            style: { ...selectedLayer.style, fill: e.target.value }
                          })}
                          className="w-5 h-5 border-0 bg-transparent cursor-pointer rounded"
                        />
                        <span className="text-[10px] font-mono select-all truncate w-full uppercase">
                          {selectedLayer.style.fill || 'None'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {theme === 'dark' ? 'Çizgi Rengi' : 'Stroke Color'}
                      </label>
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-0.5">
                        <input
                          type="color"
                          value={selectedLayer.style.stroke || '#000000'}
                          onChange={(e) => updateLayer(selectedLayer.id, {
                            style: { ...selectedLayer.style, stroke: e.target.value }
                          })}
                          className="w-5 h-5 border-0 bg-transparent cursor-pointer rounded"
                        />
                        <span className="text-[10px] font-mono select-all truncate w-full uppercase">
                          {selectedLayer.style.stroke || 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Border properties (StrokeWidth & BorderRadius rx for rectangles) */}
                {selectedLayer.type !== 'image' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {theme === 'dark' ? 'Çizgi Kalınlığı' : 'Stroke Width'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedLayer.style.strokeWidth ?? 0}
                        onChange={(e) => updateLayer(selectedLayer.id, {
                          style: { ...selectedLayer.style, strokeWidth: Number(e.target.value) }
                        })}
                        className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {selectedLayer.type === 'rectangle' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {theme === 'dark' ? 'Köşe Radyusu' : 'Corner Radius'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={selectedLayer.style.rx ?? 0}
                          onChange={(e) => updateLayer(selectedLayer.id, {
                            style: { ...selectedLayer.style, rx: Number(e.target.value) }
                          })}
                          className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
