import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Save,
  Clock,
  Calendar,
  RotateCcw,
  Settings2,
  AlertTriangle,
} from 'lucide-react';
import type { AvailabilityBlock, BlockType } from '../../types/availability';
import { apiToBlock, blockToApi } from '../../types/availability';
import { providerAvailabilityService } from '../../services/providerAvailabilityService';
import { Modal } from '../ui/Modal';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 6); // 6 AM to 6 PM
const BLOCK_COLORS: Record<BlockType, { bg: string; border: string; text: string; label: string }> = {
  AVAILABLE: { bg: '#d4edda', border: '#28a745', text: '#155724', label: 'Available' },
  ADMIN: { bg: '#fff3cd', border: '#ffc107', text: '#856404', label: 'Admin / No Patients' },
  LUNCH: { bg: '#d1ecf1', border: '#17a2b8', text: '#0c5460', label: 'Lunch' },
  MEETING: { bg: '#e2d5f1', border: '#6f42c1', text: '#432874', label: 'Meeting' },
};

const SLOT_DURATIONS = [15, 30, 45, 60];
const VISIT_TYPES = ['OUTPATIENT', 'TELEHEALTH', 'NEW_PATIENT', 'FOLLOW_UP', 'PHYSICAL', 'URGENT', 'PROCEDURE'];
const RECURRENCE_PATTERNS = [
  { value: 'MWF', label: 'Mon/Wed/Fri', days: [1, 3, 5] },
  { value: 'TTH', label: 'Tue/Thu', days: [2, 4] },
  { value: 'WEEKDAYS', label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { value: 'WEEKEND', label: 'Weekend', days: [0, 6] },
  { value: 'DAILY', label: 'Every Day', days: [0, 1, 2, 3, 4, 5, 6] },
];

let blockIdCounter = 0;
function generateBlockId(): string {
  blockIdCounter += 1;
  return `block-${Date.now()}-${blockIdCounter}`;
}

interface AvailabilityManagerProps {
  providerId: number;
  providerName: string;
}

interface BlockFormData {
  blockType: BlockType;
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  slotDuration: number;
  visitTypesAllowed: string[];
  recurring: boolean;
  recurrencePattern: string;
  specificDate: string;
  overrideReason: string;
  notes: string;
}

const defaultFormData: BlockFormData = {
  blockType: 'AVAILABLE',
  dayOfWeek: 1,
  startHour: 8,
  startMinute: 0,
  endHour: 12,
  endMinute: 0,
  slotDuration: 30,
  visitTypesAllowed: [],
  recurring: true,
  recurrencePattern: '',
  specificDate: '',
  overrideReason: '',
  notes: '',
};

// Default template blocks for a new provider
const defaultBlocks: AvailabilityBlock[] = [
  // Monday
  { id: 'default-1', blockType: 'AVAILABLE', dayOfWeek: 1, startHour: 8, startMinute: 0, endHour: 12, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  { id: 'default-2', blockType: 'LUNCH', dayOfWeek: 1, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  { id: 'default-3', blockType: 'AVAILABLE', dayOfWeek: 1, startHour: 13, startMinute: 0, endHour: 17, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  // Tuesday
  { id: 'default-4', blockType: 'AVAILABLE', dayOfWeek: 2, startHour: 8, startMinute: 0, endHour: 12, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  { id: 'default-5', blockType: 'LUNCH', dayOfWeek: 2, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  { id: 'default-6', blockType: 'ADMIN', dayOfWeek: 2, startHour: 13, startMinute: 0, endHour: 14, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'TTH' },
  { id: 'default-7', blockType: 'AVAILABLE', dayOfWeek: 2, startHour: 14, startMinute: 0, endHour: 17, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  // Wednesday
  { id: 'default-8', blockType: 'AVAILABLE', dayOfWeek: 3, startHour: 8, startMinute: 0, endHour: 12, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  { id: 'default-9', blockType: 'LUNCH', dayOfWeek: 3, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  { id: 'default-10', blockType: 'AVAILABLE', dayOfWeek: 3, startHour: 13, startMinute: 0, endHour: 17, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  // Thursday
  { id: 'default-11', blockType: 'AVAILABLE', dayOfWeek: 4, startHour: 8, startMinute: 0, endHour: 12, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  { id: 'default-12', blockType: 'LUNCH', dayOfWeek: 4, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  { id: 'default-13', blockType: 'ADMIN', dayOfWeek: 4, startHour: 13, startMinute: 0, endHour: 14, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'TTH' },
  { id: 'default-14', blockType: 'AVAILABLE', dayOfWeek: 4, startHour: 14, startMinute: 0, endHour: 17, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  // Friday
  { id: 'default-15', blockType: 'AVAILABLE', dayOfWeek: 5, startHour: 8, startMinute: 0, endHour: 12, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  { id: 'default-16', blockType: 'LUNCH', dayOfWeek: 5, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
  { id: 'default-17', blockType: 'MEETING', dayOfWeek: 5, startHour: 13, startMinute: 0, endHour: 14, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true },
  { id: 'default-18', blockType: 'AVAILABLE', dayOfWeek: 5, startHour: 14, startMinute: 0, endHour: 17, endMinute: 0, slotDuration: 30, visitTypesAllowed: [], recurring: true, recurrencePattern: 'WEEKDAYS' },
];

export default function AvailabilityManager({ providerId, providerName }: AvailabilityManagerProps) {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>(defaultBlocks);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<AvailabilityBlock | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AvailabilityBlock | null>(null);
  const [formData, setFormData] = useState<BlockFormData>(defaultFormData);
  const [viewMode, setViewMode] = useState<'template' | 'week'>('template');
  const [weekOffset, setWeekOffset] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dayOfWeek: number;
    startRow: number;
    currentRow: number;
    blockType: BlockType;
  } | null>(null);

  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAvailability();
  }, [providerId]);

  const loadAvailability = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await providerAvailabilityService.getAll(providerId);
      if (data.length > 0) {
        setBlocks(data.map(apiToBlock));
        setHasUnsavedChanges(false);
      }
    } catch {
      // API not available — use default template blocks
      console.warn('Could not load availability from API, using defaults');
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekDates = useCallback(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i - 1);
      return d;
    });
  }, [weekOffset]);

  const timeToRow = (hour: number, minute: number) => {
    return (hour - 6) * 4 + Math.floor(minute / 15);
  };

  const rowToTime = (row: number) => {
    const hour = Math.floor(row / 4) + 6;
    const minute = (row % 4) * 15;
    return { hour, minute };
  };

  const formatTimeShort = (hour: number, minute: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const getBlocksForDay = (dayOfWeek: number) => {
    return blocks.filter(b => b.dayOfWeek === dayOfWeek);
  };

  const handleMouseDown = (dayOfWeek: number, row: number, blockType: BlockType = 'AVAILABLE') => {
    setDragState({
      isDragging: true,
      dayOfWeek,
      startRow: row,
      currentRow: row,
      blockType,
    });
  };

  const handleMouseMove = (row: number) => {
    if (dragState?.isDragging) {
      setDragState(prev => prev ? { ...prev, currentRow: row } : null);
    }
  };

  const handleMouseUp = () => {
    if (dragState?.isDragging) {
      const startRow = Math.min(dragState.startRow, dragState.currentRow);
      const endRow = Math.max(dragState.startRow, dragState.currentRow) + 1;
      const startTime = rowToTime(startRow);
      const endTime = rowToTime(endRow);

      if (endRow - startRow >= 1) {
        const newBlock: AvailabilityBlock = {
          id: generateBlockId(),
          blockType: dragState.blockType,
          dayOfWeek: dragState.dayOfWeek,
          startHour: startTime.hour,
          startMinute: startTime.minute,
          endHour: endTime.hour,
          endMinute: endTime.minute,
          slotDuration: 30,
          visitTypesAllowed: [],
          recurring: true,
        };
        setBlocks(prev => [...prev, newBlock]);
        setHasUnsavedChanges(true);
      }
      setDragState(null);
    }
  };

  const openEditDialog = (block: AvailabilityBlock) => {
    setEditingBlock(block);
    setFormData({
      blockType: block.blockType,
      dayOfWeek: block.dayOfWeek,
      startHour: block.startHour,
      startMinute: block.startMinute,
      endHour: block.endHour,
      endMinute: block.endMinute,
      slotDuration: block.slotDuration,
      visitTypesAllowed: block.visitTypesAllowed,
      recurring: block.recurring,
      recurrencePattern: block.recurrencePattern || '',
      specificDate: block.specificDate || '',
      overrideReason: block.overrideReason || '',
      notes: block.notes || '',
    });
    setShowBlockDialog(true);
  };

  const openNewBlockDialog = () => {
    setEditingBlock(null);
    setFormData(defaultFormData);
    setShowBlockDialog(true);
  };

  const openOverrideDialog = () => {
    setFormData({
      ...defaultFormData,
      recurring: false,
      specificDate: new Date().toISOString().split('T')[0],
    });
    setShowOverrideDialog(true);
  };

  const saveBlock = () => {
    const block: AvailabilityBlock = {
      id: editingBlock?.id || generateBlockId(),
      blockType: formData.blockType,
      dayOfWeek: formData.dayOfWeek,
      startHour: formData.startHour,
      startMinute: formData.startMinute,
      endHour: formData.endHour,
      endMinute: formData.endMinute,
      slotDuration: formData.slotDuration,
      visitTypesAllowed: formData.visitTypesAllowed,
      recurring: formData.recurring,
      recurrencePattern: formData.recurrencePattern || undefined,
      specificDate: formData.specificDate || undefined,
      overrideReason: formData.overrideReason || undefined,
      notes: formData.notes || undefined,
    };

    if (formData.recurrencePattern) {
      const pattern = RECURRENCE_PATTERNS.find(p => p.value === formData.recurrencePattern);
      if (pattern) {
        setBlocks(prev => {
          const filtered = editingBlock
            ? prev.filter(b => b.id !== editingBlock.id)
            : prev;
          const newBlocks = pattern.days.map(day => ({
            ...block,
            id: day === formData.dayOfWeek ? block.id : generateBlockId(),
            dayOfWeek: day,
          }));
          return [...filtered, ...newBlocks];
        });
        setHasUnsavedChanges(true);
        setShowBlockDialog(false);
        return;
      }
    }

    if (editingBlock) {
      setBlocks(prev => prev.map(b => b.id === editingBlock.id ? block : b));
    } else {
      setBlocks(prev => [...prev, block]);
    }
    setHasUnsavedChanges(true);
    setShowBlockDialog(false);
  };

  const saveOverride = () => {
    const dayDate = new Date(formData.specificDate + 'T00:00:00');
    const dayOfWeek = dayDate.getDay();

    const override: AvailabilityBlock = {
      id: generateBlockId(),
      blockType: formData.blockType,
      dayOfWeek,
      startHour: formData.startHour,
      startMinute: formData.startMinute,
      endHour: formData.endHour,
      endMinute: formData.endMinute,
      slotDuration: formData.slotDuration,
      visitTypesAllowed: formData.visitTypesAllowed,
      recurring: false,
      specificDate: formData.specificDate,
      overrideReason: formData.overrideReason || undefined,
      notes: formData.notes || undefined,
    };
    setBlocks(prev => [...prev, override]);
    setHasUnsavedChanges(true);
    setShowOverrideDialog(false);
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    setSelectedBlock(null);
    setHasUnsavedChanges(true);
  };

  const copyDaySchedule = (fromDay: number, toDay: number) => {
    const fromBlocks = blocks.filter(b => b.dayOfWeek === fromDay && b.recurring);
    const newBlocks = fromBlocks.map(b => ({
      ...b,
      id: generateBlockId(),
      dayOfWeek: toDay,
    }));
    setBlocks(prev => [...prev.filter(b => b.dayOfWeek !== toDay || !b.recurring), ...newBlocks]);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    setShowSaveConfirm(true);
  };

  const confirmSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Delete removed server-side blocks
      const currentServerIds = new Set(blocks.filter(b => b.serverId).map(b => b.serverId!));
      const serverBlocks = await providerAvailabilityService.getAll(providerId).catch(() => []);
      for (const sb of serverBlocks) {
        if (sb.id && !currentServerIds.has(sb.id)) {
          await providerAvailabilityService.delete(providerId, sb.id);
        }
      }

      // Create or update blocks
      const updatedBlocks: AvailabilityBlock[] = [];
      for (const block of blocks) {
        const payload = blockToApi(block, providerId);
        if (block.serverId) {
          const updated = await providerAvailabilityService.update(providerId, block.serverId, payload);
          updatedBlocks.push(apiToBlock(updated));
        } else {
          const created = await providerAvailabilityService.create(providerId, payload);
          updatedBlocks.push(apiToBlock(created));
        }
      }
      setBlocks(updatedBlocks);
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save availability');
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
      setShowSaveConfirm(false);
    }
  };

  const resetToDefault = () => {
    setBlocks(defaultBlocks);
    setHasUnsavedChanges(true);
  };

  const renderDragPreview = (dayOfWeek: number) => {
    if (!dragState || dragState.dayOfWeek !== dayOfWeek) return null;
    const startRow = Math.min(dragState.startRow, dragState.currentRow);
    const endRow = Math.max(dragState.startRow, dragState.currentRow) + 1;
    const startTime = rowToTime(startRow);
    const endTime = rowToTime(endRow);
    const color = BLOCK_COLORS[dragState.blockType];

    return (
      <div
        className="absolute left-0 right-0 mx-0.5 rounded opacity-60 border-2 border-dashed flex items-center justify-center"
        style={{
          top: `${startRow * 20}px`,
          height: `${(endRow - startRow) * 20}px`,
          backgroundColor: color.bg,
          borderColor: color.border,
          zIndex: 20,
        }}
      >
        <span className="text-[9px] font-semibold" style={{ color: color.text }}>
          {formatTimeShort(startTime.hour, startTime.minute)} - {formatTimeShort(endTime.hour, endTime.minute)}
        </span>
      </div>
    );
  };

  const renderBlock = (block: AvailabilityBlock) => {
    const startRow = timeToRow(block.startHour, block.startMinute);
    const endRow = timeToRow(block.endHour, block.endMinute);
    const height = (endRow - startRow) * 20;
    const color = BLOCK_COLORS[block.blockType];
    const isSelected = selectedBlock?.id === block.id;
    const isOverride = !block.recurring;

    return (
      <div
        key={block.id}
        className={`absolute left-0 right-0 mx-0.5 rounded cursor-pointer border overflow-hidden ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          top: `${startRow * 20}px`,
          height: `${height}px`,
          backgroundColor: color.bg,
          borderColor: color.border,
          zIndex: isSelected ? 15 : 10,
        }}
        onClick={(e) => { e.stopPropagation(); setSelectedBlock(block); }}
        onDoubleClick={(e) => { e.stopPropagation(); openEditDialog(block); }}
        title={`${color.label}: ${formatTimeShort(block.startHour, block.startMinute)} - ${formatTimeShort(block.endHour, block.endMinute)}${block.notes ? '\n' + block.notes : ''}`}
      >
        <div className="px-1 py-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold truncate" style={{ color: color.text }}>
              {color.label}
              {isOverride && <span className="ml-0.5 text-[8px]">(Override)</span>}
            </span>
          </div>
          {height >= 40 && (
            <div className="text-[9px]" style={{ color: color.text }}>
              {formatTimeShort(block.startHour, block.startMinute)} - {formatTimeShort(block.endHour, block.endMinute)}
            </div>
          )}
          {height >= 60 && block.slotDuration && block.blockType === 'AVAILABLE' && (
            <div className="text-[8px] opacity-75" style={{ color: color.text }}>
              {block.slotDuration}min slots
            </div>
          )}
          {height >= 60 && block.visitTypesAllowed.length > 0 && (
            <div className="text-[8px] opacity-75 truncate" style={{ color: color.text }}>
              {block.visitTypesAllowed.join(', ')}
            </div>
          )}
        </div>
        {/* Resize handle */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5 cursor-s-resize"
          style={{ backgroundColor: color.border, opacity: 0.5 }}
          onMouseDown={(e) => {
            e.stopPropagation();
            const endRowPos = timeToRow(block.endHour, block.endMinute);
            handleMouseDown(block.dayOfWeek, endRowPos - 1, block.blockType);
          }}
        />
      </div>
    );
  };

  const weekDates = getWeekDates();

  return (
    <div className="h-full flex flex-col bg-[#ece9d8]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-400 bg-gradient-to-b from-[#f0ede1] to-[#d4d0c8]">
        <div className="flex items-center space-x-1">
          <span className="text-[11px] font-semibold text-gray-700">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Availability: {providerName}
          </span>
          <span className="text-gray-400 mx-1">|</span>
          <button
            onClick={() => setViewMode('template')}
            className={`ehr-tab text-[10px] ${viewMode === 'template' ? 'active' : ''}`}
          >
            Template
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`ehr-tab text-[10px] ${viewMode === 'week' ? 'active' : ''}`}
          >
            Week View
          </button>
          {viewMode === 'week' && (
            <>
              <span className="text-gray-400 mx-1">|</span>
              <button onClick={() => setWeekOffset(prev => prev - 1)} className="ehr-toolbar-button p-0.5">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setWeekOffset(0)} className="ehr-button text-[9px] px-1.5 py-0">
                This Week
              </button>
              <button onClick={() => setWeekOffset(prev => prev + 1)} className="ehr-toolbar-button p-0.5">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {hasUnsavedChanges && (
            <span className="text-[9px] text-orange-700 flex items-center mr-1">
              <AlertTriangle className="w-3 h-3 mr-0.5" />
              Unsaved changes
            </span>
          )}
          <button onClick={openNewBlockDialog} className="ehr-toolbar-button flex items-center text-[10px]">
            <Plus className="w-3 h-3 mr-0.5" /> Add Block
          </button>
          <button onClick={openOverrideDialog} className="ehr-toolbar-button flex items-center text-[10px]">
            <Calendar className="w-3 h-3 mr-0.5" /> Override
          </button>
          <button onClick={resetToDefault} className="ehr-toolbar-button flex items-center text-[10px]">
            <RotateCcw className="w-3 h-3 mr-0.5" /> Reset
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="ehr-button ehr-button-primary flex items-center text-[10px] px-2"
          >
            <Save className="w-3 h-3 mr-0.5" /> {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-2 py-1 bg-red-100 border-b border-red-300 text-[10px] text-red-700 flex items-center justify-between">
          <span><AlertTriangle className="w-3 h-3 inline mr-1" />{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-[10px]">&times;</button>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="px-2 py-1 bg-blue-50 border-b border-blue-200 text-[10px] text-blue-700">
          Loading availability...
        </div>
      )}

      {/* Block type legend / palette */}
      <div className="flex items-center px-2 py-1 border-b border-gray-300 bg-[#f0ede1] text-[10px]">
        <span className="text-gray-600 mr-2">Drag to create:</span>
        {(Object.entries(BLOCK_COLORS) as [BlockType, typeof BLOCK_COLORS.AVAILABLE][]).map(([type, color]) => (
          <button
            key={type}
            className="flex items-center mr-3 px-1.5 py-0.5 rounded border cursor-grab"
            style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}
            onMouseDown={() => {
              // Set the active block type for drag creation
              if (dragState) {
                setDragState(prev => prev ? { ...prev, blockType: type } : null);
              }
            }}
            title={`Click a time slot to add ${color.label} block`}
          >
            <span className="w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: color.border }} />
            {color.label}
          </button>
        ))}
        <span className="text-gray-400 mx-1">|</span>
        <span className="text-gray-500">Double-click block to edit</span>
        {selectedBlock && (
          <>
            <span className="text-gray-400 mx-1">|</span>
            <button
              onClick={() => deleteBlock(selectedBlock.id)}
              className="flex items-center text-red-600 hover:text-red-800"
            >
              <Trash2 className="w-3 h-3 mr-0.5" /> Delete Selected
            </button>
          </>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex overflow-hidden" ref={calendarRef}>
        {/* Time column */}
        <div className="w-14 flex-shrink-0 border-r border-gray-400 bg-[#ece9d8]">
          <div className="h-6 border-b border-gray-400" />
          {HOURS.map(hour => (
            <div key={hour} className="relative" style={{ height: '80px' }}>
              <span className="absolute -top-2 right-1 text-[9px] text-gray-600">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex-1 flex overflow-x-auto">
          {(viewMode === 'template' ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6]).map((dayIdx) => {
            const dayOfWeek = viewMode === 'template' ? dayIdx : weekDates[dayIdx]?.getDay() ?? dayIdx;
            const dayBlocks = getBlocksForDay(dayOfWeek);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const dateStr = viewMode === 'week' && weekDates[dayIdx]
              ? weekDates[dayIdx].toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
              : '';

            return (
              <div
                key={dayIdx}
                className={`flex-1 min-w-[100px] border-r border-gray-300 ${isWeekend ? 'bg-gray-100' : 'bg-white'}`}
              >
                {/* Day header */}
                <div className="h-6 border-b border-gray-400 px-1 flex items-center justify-between bg-gradient-to-b from-[#f0ede1] to-[#d4d0c8]">
                  <span className="text-[10px] font-semibold text-gray-700">
                    {viewMode === 'template' ? DAYS[dayOfWeek] : `${DAY_ABBR[dayOfWeek]} ${dateStr}`}
                  </span>
                  <div className="flex items-center space-x-0.5">
                    <button
                      onClick={() => {
                        const targetDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                        copyDaySchedule(targetDay, dayOfWeek);
                      }}
                      className="p-0.5 hover:bg-gray-300 rounded"
                      title="Copy from previous day"
                    >
                      <Copy className="w-2.5 h-2.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => {
                        setFormData({ ...defaultFormData, dayOfWeek });
                        setEditingBlock(null);
                        setShowBlockDialog(true);
                      }}
                      className="p-0.5 hover:bg-gray-300 rounded"
                      title="Add block"
                    >
                      <Plus className="w-2.5 h-2.5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Time slots */}
                <div
                  className="relative"
                  style={{ height: `${HOURS.length * 80}px` }}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Grid lines */}
                  {HOURS.map(hour => (
                    <div key={hour}>
                      <div
                        className="absolute w-full border-t border-gray-200"
                        style={{ top: `${(hour - 6) * 80}px` }}
                      />
                      <div
                        className="absolute w-full border-t border-gray-100 border-dashed"
                        style={{ top: `${(hour - 6) * 80 + 40}px` }}
                      />
                    </div>
                  ))}

                  {/* Click areas for creating blocks */}
                  {Array.from({ length: HOURS.length * 4 }, (_, i) => (
                    <div
                      key={i}
                      className="absolute w-full hover:bg-blue-50/30"
                      style={{ top: `${i * 20}px`, height: '20px' }}
                      onMouseDown={() => handleMouseDown(dayOfWeek, i)}
                      onMouseMove={() => handleMouseMove(i)}
                    />
                  ))}

                  {/* Rendered blocks */}
                  {dayBlocks.map(block => renderBlock(block))}

                  {/* Drag preview */}
                  {renderDragPreview(dayOfWeek)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected block details panel */}
      {selectedBlock && (
        <div className="border-t border-gray-400 bg-[#ece9d8] px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-[10px]">
            <span className="font-semibold">Selected Block:</span>
            <span
              className="px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: BLOCK_COLORS[selectedBlock.blockType].bg,
                borderColor: BLOCK_COLORS[selectedBlock.blockType].border,
                color: BLOCK_COLORS[selectedBlock.blockType].text,
              }}
            >
              {BLOCK_COLORS[selectedBlock.blockType].label}
            </span>
            <span>{DAYS[selectedBlock.dayOfWeek]}</span>
            <span>
              <Clock className="w-3 h-3 inline mr-0.5" />
              {formatTimeShort(selectedBlock.startHour, selectedBlock.startMinute)} - {formatTimeShort(selectedBlock.endHour, selectedBlock.endMinute)}
            </span>
            {selectedBlock.blockType === 'AVAILABLE' && (
              <span>
                <Settings2 className="w-3 h-3 inline mr-0.5" />
                {selectedBlock.slotDuration}min slots
              </span>
            )}
            {selectedBlock.recurring && selectedBlock.recurrencePattern && (
              <span className="text-gray-500">
                Pattern: {RECURRENCE_PATTERNS.find(p => p.value === selectedBlock.recurrencePattern)?.label || selectedBlock.recurrencePattern}
              </span>
            )}
            {!selectedBlock.recurring && selectedBlock.specificDate && (
              <span className="text-orange-600">Override: {selectedBlock.specificDate}</span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={() => openEditDialog(selectedBlock)} className="ehr-button text-[9px] px-2">
              Edit
            </button>
            <button onClick={() => deleteBlock(selectedBlock.id)} className="ehr-button text-[9px] px-2" style={{ color: '#c84030' }}>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Block Edit Dialog */}
      <Modal
        isOpen={showBlockDialog}
        onClose={() => setShowBlockDialog(false)}
        title={editingBlock ? 'Edit Availability Block' : 'New Availability Block'}
        width="lg"
        footer={
          <>
            <button onClick={() => setShowBlockDialog(false)} className="ehr-button px-4">Cancel</button>
            <button onClick={saveBlock} className="ehr-button ehr-button-primary px-4">
              {editingBlock ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Block Type */}
          <div>
            <label className="text-[10px] font-semibold text-gray-700 block mb-1">Block Type</label>
            <div className="flex space-x-2">
              {(Object.entries(BLOCK_COLORS) as [BlockType, typeof BLOCK_COLORS.AVAILABLE][]).map(([type, color]) => (
                <button
                  key={type}
                  onClick={() => setFormData(prev => ({ ...prev, blockType: type }))}
                  className={`flex items-center px-2 py-1 rounded border text-[10px] ${formData.blockType === type ? 'ring-2 ring-blue-500' : ''}`}
                  style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}
                >
                  <span className="w-2.5 h-2.5 rounded-sm mr-1" style={{ backgroundColor: color.border }} />
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day of Week */}
          <div>
            <label className="text-[10px] font-semibold text-gray-700 block mb-1">Day of Week</label>
            <select
              value={formData.dayOfWeek}
              onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
              className="ehr-input text-[10px] w-40"
            >
              {DAYS.map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>

          {/* Time Range */}
          <div className="flex items-center space-x-2">
            <div>
              <label className="text-[10px] font-semibold text-gray-700 block mb-1">Start Time</label>
              <div className="flex items-center space-x-1">
                <select
                  value={formData.startHour}
                  onChange={(e) => setFormData(prev => ({ ...prev, startHour: parseInt(e.target.value) }))}
                  className="ehr-input text-[10px] w-16"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 5).map(h => (
                    <option key={h} value={h}>{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</option>
                  ))}
                </select>
                <select
                  value={formData.startMinute}
                  onChange={(e) => setFormData(prev => ({ ...prev, startMinute: parseInt(e.target.value) }))}
                  className="ehr-input text-[10px] w-12"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
            <span className="text-gray-500 mt-4">to</span>
            <div>
              <label className="text-[10px] font-semibold text-gray-700 block mb-1">End Time</label>
              <div className="flex items-center space-x-1">
                <select
                  value={formData.endHour}
                  onChange={(e) => setFormData(prev => ({ ...prev, endHour: parseInt(e.target.value) }))}
                  className="ehr-input text-[10px] w-16"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 5).map(h => (
                    <option key={h} value={h}>{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</option>
                  ))}
                </select>
                <select
                  value={formData.endMinute}
                  onChange={(e) => setFormData(prev => ({ ...prev, endMinute: parseInt(e.target.value) }))}
                  className="ehr-input text-[10px] w-12"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Slot Duration (only for Available) */}
          {formData.blockType === 'AVAILABLE' && (
            <div>
              <label className="text-[10px] font-semibold text-gray-700 block mb-1">Slot Duration</label>
              <div className="flex space-x-2">
                {SLOT_DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setFormData(prev => ({ ...prev, slotDuration: d }))}
                    className={`px-2 py-0.5 text-[10px] border rounded ${formData.slotDuration === d ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-600'}`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Visit Types (only for Available) */}
          {formData.blockType === 'AVAILABLE' && (
            <div>
              <label className="text-[10px] font-semibold text-gray-700 block mb-1">Allowed Visit Types (leave empty for all)</label>
              <div className="flex flex-wrap gap-1">
                {VISIT_TYPES.map(vt => (
                  <button
                    key={vt}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        visitTypesAllowed: prev.visitTypesAllowed.includes(vt)
                          ? prev.visitTypesAllowed.filter(v => v !== vt)
                          : [...prev.visitTypesAllowed, vt],
                      }));
                    }}
                    className={`px-1.5 py-0.5 text-[9px] border rounded ${formData.visitTypesAllowed.includes(vt) ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-500'}`}
                  >
                    {vt.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recurrence Pattern */}
          <div>
            <label className="text-[10px] font-semibold text-gray-700 block mb-1">Recurrence Pattern</label>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFormData(prev => ({ ...prev, recurrencePattern: '' }))}
                className={`px-2 py-0.5 text-[10px] border rounded ${!formData.recurrencePattern ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-500'}`}
              >
                This Day Only
              </button>
              {RECURRENCE_PATTERNS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setFormData(prev => ({ ...prev, recurrencePattern: p.value }))}
                  className={`px-2 py-0.5 text-[10px] border rounded ${formData.recurrencePattern === p.value ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-500'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold text-gray-700 block mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="ehr-input text-[10px] w-full h-12 resize-none"
              placeholder="Optional notes..."
            />
          </div>
        </div>
      </Modal>

      {/* Override Dialog */}
      <Modal
        isOpen={showOverrideDialog}
        onClose={() => setShowOverrideDialog(false)}
        title="Add Date Override"
        width="md"
        footer={
          <>
            <button onClick={() => setShowOverrideDialog(false)} className="ehr-button px-4">Cancel</button>
            <button onClick={saveOverride} className="ehr-button ehr-button-primary px-4">Add Override</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-2 bg-[#fff3cd] border border-[#ffc107] rounded text-[10px]">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Overrides apply to a specific date only and take effect for future appointments.
          </div>

          {/* Date */}
          <div>
            <label className="text-[10px] font-semibold text-gray-700 block mb-1">Date</label>
            <input
              type="date"
              value={formData.specificDate}
              onChange={(e) => setFormData(prev => ({ ...prev, specificDate: e.target.value }))}
              className="ehr-input text-[10px] w-40"
            />
          </div>

          {/* Block Type */}
          <div>
            <label className="text-[10px] font-semibold text-gray-700 block mb-1">Block Type</label>
            <div className="flex space-x-2">
              {(Object.entries(BLOCK_COLORS) as [BlockType, typeof BLOCK_COLORS.AVAILABLE][]).map(([type, color]) => (
                <button
                  key={type}
                  onClick={() => setFormData(prev => ({ ...prev, blockType: type }))}
                  className={`flex items-center px-2 py-1 rounded border text-[10px] ${formData.blockType === type ? 'ring-2 ring-blue-500' : ''}`}
                  style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}
                >
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div className="flex items-center space-x-2">
            <div>
              <label className="text-[10px] font-semibold text-gray-700 block mb-1">Start Time</label>
              <div className="flex items-center space-x-1">
                <select
                  value={formData.startHour}
                  onChange={(e) => setFormData(prev => ({ ...prev, startHour: parseInt(e.target.value) }))}
                  className="ehr-input text-[10px] w-16"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 5).map(h => (
                    <option key={h} value={h}>{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</option>
                  ))}
                </select>
                <select
                  value={formData.startMinute}
                  onChange={(e) => setFormData(prev => ({ ...prev, startMinute: parseInt(e.target.value) }))}
                  className="ehr-input text-[10px] w-12"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
            <span className="text-gray-500 mt-4">to</span>
            <div>
              <label className="text-[10px] font-semibold text-gray-700 block mb-1">End Time</label>
              <div className="flex items-center space-x-1">
                <select
                  value={formData.endHour}
                  onChange={(e) => setFormData(prev => ({ ...prev, endHour: parseInt(e.target.value) }))}
                  className="ehr-input text-[10px] w-16"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 5).map(h => (
                    <option key={h} value={h}>{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</option>
                  ))}
                </select>
                <select
                  value={formData.endMinute}
                  onChange={(e) => setFormData(prev => ({ ...prev, endMinute: parseInt(e.target.value) }))}
                  className="ehr-input text-[10px] w-12"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-[10px] font-semibold text-gray-700 block mb-1">Reason</label>
            <input
              type="text"
              value={formData.overrideReason}
              onChange={(e) => setFormData(prev => ({ ...prev, overrideReason: e.target.value }))}
              className="ehr-input text-[10px] w-full"
              placeholder="e.g., Vacation, Conference, Training..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold text-gray-700 block mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="ehr-input text-[10px] w-full h-12 resize-none"
              placeholder="Optional notes..."
            />
          </div>
        </div>
      </Modal>

      {/* Save Confirmation */}
      <Modal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        title="Save Availability Template"
        width="sm"
        footer={
          <>
            <button onClick={() => setShowSaveConfirm(false)} className="ehr-button px-4">Cancel</button>
            <button onClick={confirmSave} className="ehr-button ehr-button-primary px-4">Save Changes</button>
          </>
        }
      >
        <div className="space-y-2 text-[11px]">
          <p>Changes will take effect for <strong>future appointments only</strong>. Existing scheduled appointments will not be affected.</p>
          <p className="text-gray-600">This will update the availability template for {providerName}.</p>
        </div>
      </Modal>
    </div>
  );
}
