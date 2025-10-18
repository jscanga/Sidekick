/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSchedule } from "@/contexts/schedulecontext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { RepeatFrequency, Todo, Category } from '@/contexts/todocontext';
import EditTodoModal from "./EditTodoModal";
import { RefreshCw, Star, Menu, Key, Download, X, Plus, Layout, List, Move, Eye, EyeOff, GripHorizontal, Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { 
  format, 
  differenceInCalendarDays, 
  startOfDay,
} from "date-fns";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useTodos } from "@/contexts/todocontext";
import { getWhiteboardColor } from "@/lib/colors";

// Add ClassItem interface to fix TypeScript error
interface ClassItem {
  id: string;
  name: string;
  color: string;
  // Add other properties as needed
}

interface WhiteboardNodeProps {
  node: WhiteboardNode;
  todos: Todo[];
  toggleTodo: (id: string) => void;
  whiteboardRef: React.RefObject<HTMLDivElement>;
  setNodes: React.Dispatch<React.SetStateAction<WhiteboardNode[]>>;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
  toggleShortlist: (id: string) => void;
  shortlistedTodos: string[];
}

const testApiRoute = async () => {
  try {
    const response = await fetch('/api/canvas-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });
    console.log('API route test response:', response.status);
    alert(`API route status: ${response.status}`);
  } catch (error) {
    console.error('API route test failed:', error);
    alert('API route not found. Check the file location.');
  }
};

const extractCourseCode = (text: string): string => {
  if (!text) return '';
  const courseCodePattern = /[A-Z]{2,}\s*\d{3,}[A-Z]?/g;
  const matches = text.match(courseCodePattern);
  if (matches && matches.length > 0) {
    return matches[0].replace(/\s+/g, ' ').trim();
  }
  return '';
};

// Improved course code extraction that handles duplicates better
const getUniqueCourseCode = (className: string): string => {
  const courseCode = extractCourseCode(className);
  if (!courseCode) return className;
  
  // Remove any section letters/numbers that might cause duplicates
  // e.g., "CS 0445 A1" becomes "CS 0445", "MATH 0280 R1" becomes "MATH 0280"
  const cleanCourseCode = courseCode.replace(/\s+[A-Z]\d*$/, '');
  return cleanCourseCode;
};

const WhiteboardNodeComponent: React.FC<WhiteboardNodeProps> = ({ 
  node, 
  todos, 
  toggleTodo, 
  whiteboardRef, 
  setNodes,
  onDragStart,
  onDragEnd,
  toggleShortlist,
  shortlistedTodos
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const currentPosition = useRef({ x: node.position.x, y: node.position.y });
  const currentSize = useRef({ width: node.width || 280, height: node.height || 220 });
  const nodeTodos = todos.filter(t => node.todos.includes(t.id));

  // Update currentPosition when node.position changes
  useEffect(() => {
    currentPosition.current = { x: node.position.x, y: node.position.y };
    currentSize.current = { width: node.width || 280, height: node.height || 220 };
  }, [node.position, node.width, node.height]);

  // SIMPLE COLOR MAPPING - Force colors to work
const getNodeStyle = (): React.CSSProperties => {
  // For category nodes
  if (node.type === 'category') {
    const categoryGradients: Record<Category, { from: string; to: string }> = {
      academics: { from: 'rgba(147, 51, 234, 0.9)', to: 'rgba(59, 130, 246, 0.9)' },
      health: { from: 'rgba(16, 185, 129, 0.9)', to: 'rgba(5, 150, 105, 0.9)' },
      financial: { from: 'rgba(245, 158, 11, 0.9)', to: 'rgba(234, 88, 12, 0.9)' },
      social: { from: 'rgba(236, 72, 153, 0.9)', to: 'rgba(225, 29, 72, 0.9)' },
      other: { from: 'rgba(107, 114, 128, 0.9)', to: 'rgba(100, 116, 139, 0.9)' }
    };
    
    const gradient = categoryGradients[node.category!];
    return {
      backgroundImage: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
      border: '2px solid rgba(255, 255, 255, 0.3)',
    };
  }
  
  // For class nodes - use the actual class colors with proper gradient syntax
  if (node.type === 'class' && node.classData?.color) {
    const colorMap: Record<string, { from: string; to: string }> = {
      'from-blue-600/30 to-cyan-500/30': { from: 'rgba(37, 99, 235, 0.9)', to: 'rgba(6, 182, 212, 0.9)' },
      'from-emerald-600/30 to-green-500/30': { from: 'rgba(5, 150, 105, 0.9)', to: 'rgba(34, 197, 94, 0.9)' },
      'from-purple-600/30 to-pink-500/30': { from: 'rgba(147, 51, 234, 0.9)', to: 'rgba(236, 72, 153, 0.9)' },
      'from-amber-500/30 to-yellow-400/30': { from: 'rgba(245, 158, 11, 0.9)', to: 'rgba(250, 204, 21, 0.9)' },
      'from-rose-600/30 to-red-500/30': { from: 'rgba(225, 29, 72, 0.9)', to: 'rgba(239, 68, 68, 0.9)' },
      'from-fuchsia-600/30 to-pink-500/30': { from: 'rgba(192, 38, 211, 0.9)', to: 'rgba(236, 72, 153, 0.9)' },
      'from-indigo-600/30 to-purple-500/30': { from: 'rgba(79, 70, 229, 0.9)', to: 'rgba(168, 85, 247, 0.9)' },
      'from-teal-600/30 to-cyan-500/30': { from: 'rgba(13, 148, 136, 0.9)', to: 'rgba(6, 182, 212, 0.9)' },
      'from-orange-600/30 to-amber-500/30': { from: 'rgba(234, 88, 12, 0.9)', to: 'rgba(245, 158, 11, 0.9)' },
      'from-cyan-600/30 to-blue-500/30': { from: 'rgba(8, 145, 178, 0.9)', to: 'rgba(59, 130, 246, 0.9)' },
      'from-violet-600/30 to-purple-500/30': { from: 'rgba(124, 58, 237, 0.9)', to: 'rgba(168, 85, 247, 0.9)' },
      'from-lime-600/30 to-green-500/30': { from: 'rgba(101, 163, 13, 0.9)', to: 'rgba(34, 197, 94, 0.9)' },
      'from-sky-600/30 to-blue-500/30': { from: 'rgba(2, 132, 199, 0.9)', to: 'rgba(59, 130, 246, 0.9)' }
    };

    // Extract the base gradient without opacity from the class color
    const baseColor = node.classData.color.split(' border-')[0];
    const gradient = colorMap[baseColor] || colorMap['from-blue-600/30 to-cyan-500/30'];
    
    return {
      backgroundImage: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
      border: '2px solid rgba(255, 255, 255, 0.3)',
    };
  }

  // Fallback
  return {
    backgroundImage: 'linear-gradient(135deg, rgba(37, 99, 235, 0.9) 0%, rgba(6, 182, 212, 0.9) 100%)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
  };
};

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    onDragStart(node.id);
    
    const nodeElement = nodeRef.current;
    if (!nodeElement || !whiteboardRef.current) return;

    const startLeft = node.position.x;
    const startTop = node.position.y;
    const startMouseX = e.pageX;
    const startMouseY = e.pageY;

    nodeElement.style.transition = 'transform 0.1s ease-out';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      
      const deltaX = moveEvent.pageX - startMouseX;
      const deltaY = moveEvent.pageY - startMouseY;
      
      const whiteboardRect = whiteboardRef.current!.getBoundingClientRect();
      const whiteboardWidth = whiteboardRect.width;
      const whiteboardHeight = whiteboardRect.height;
      const nodeWidth = currentSize.current.width;
      const nodeHeight = currentSize.current.height;
      
      let newX = startLeft + deltaX;
      let newY = startTop + deltaY;
      
      newX = Math.max(0, Math.min(newX, whiteboardWidth - nodeWidth));
      newY = Math.max(-100, Math.min(newY, whiteboardHeight + (whiteboardHeight * 0.2) - nodeHeight));

      nodeElement.style.transform = `translate(${newX - startLeft}px, ${newY - startTop}px)`;
      
      currentPosition.current = { x: newX, y: newY };
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      setIsDragging(false);
      onDragEnd();
      
      const finalPosition = currentPosition.current;
      
      setNodes(currentNodes =>
        currentNodes.map(n =>
          n.id === node.id ? { ...n, position: finalPosition } : n
        )
      );

      if (nodeRef.current) {
        nodeRef.current.style.transform = '';
        nodeRef.current.style.transition = '';
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

const handleResize = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsResizing(true);
  
  const nodeElement = nodeRef.current;
  if (!nodeElement) return;

  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = currentSize.current.width;
  const startHeight = currentSize.current.height;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;
    
    const minWidth = 250;
    const maxWidth = 600;
    const minHeight = 180;
    const maxHeight = 600; // Increased max height for more flexibility
    
    const newWidth = Math.max(minWidth, Math.min(startWidth + deltaX, maxWidth));
    const newHeight = Math.max(minHeight, Math.min(startHeight + deltaY, maxHeight));

    nodeElement.style.width = `${newWidth}px`;
    nodeElement.style.height = `${newHeight}px`;
    
    currentSize.current = { width: newWidth, height: newHeight };
  };
  
  const handleMouseUp = () => {
    setIsResizing(false);
    
    // DON'T clear the inline styles - keep the manually set dimensions
    // nodeElement.style.width = '';
    // nodeElement.style.height = '';
    
    // Update React state with final size - this is what makes it persistent
    setNodes(currentNodes =>
      currentNodes.map(n =>
        n.id === node.id
          ? { 
              ...n, 
              width: currentSize.current.width, 
              height: currentSize.current.height 
            }
          : n
      )
    );

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};
const nodeStyle = getNodeStyle();

return (
  <div
    data-node-id={node.id}
    style={{
      position: 'absolute',
      left: node.position.x,
      top: node.position.y,
      width: node.width || 280,
      height: node.height || 220,
      cursor: 'move',
      zIndex: node.zIndex || 1,
    }}
    onMouseDown={handleDragStart}
  >
<div
  ref={nodeRef}
  style={{
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    ...getNodeStyle(),
    // Ensure content can scroll properly
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden', // Prevent double scrollbars
  }}
  className={`shadow-lg select-none ${
    isDragging ? 'shadow-2xl z-50 brightness-110 saturate-150' : 'hover:shadow-xl'
  } ${isResizing ? 'resizing' : ''}`}
>
  <div className="p-4 h-full flex flex-col overflow-hidden">
    <div className="flex items-center justify-between mb-3 flex-shrink-0">
      <h3 className="font-bold text-white text-lg">
        {node.type === 'category' ? categoryEmoji[node.category!] : '📚'} {node.title}
      </h3>
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 bg-black/30 rounded-full text-xs text-white">
          {nodeTodos.length} tasks
        </span>
      </div>
    </div>
    
    <div className="flex-1 space-y-2 overflow-y-auto min-h-0"> {/* Added min-h-0 for flexbox scrolling */}
      {nodeTodos.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No tasks in this {node.type === 'class' ? 'class' : 'category'}</p>
      ) : (
        nodeTodos.map(todo => (
          <div
            key={todo.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-black/30 hover:bg-black/40 transition-colors group flex-shrink-0"
          >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTodo(todo.id);
                  }}
                  className={`h-4 w-4 flex items-center justify-center rounded border-2 transition-all ${
                    todo.completed 
                      ? "bg-green-500 border-green-500" 
                      : "border-gray-400 hover:border-green-400"
                  }`}
                >
                  {todo.completed && (
                    <span className="text-white text-xs">✓</span>
                  )}
                </button>
                <span className={`text-sm flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                  {todo.text}
                </span>
                
                {/* Star button for shortlist - only on whiteboard */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleShortlist(todo.id);
                  }}
                  className={`p-1 transition-all ${
                    shortlistedTodos.includes(todo.id)
                      ? 'text-yellow-400 hover:text-yellow-300'
                      : 'text-gray-400 hover:text-yellow-400 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Star 
                    size={14} 
                    fill={shortlistedTodos.includes(todo.id) ? "currentColor" : "none"}
                  />
                </button>
                
                {todo.dueDate && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    differenceInCalendarDays(todo.dueDate, startOfDay(new Date())) === 0 
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {format(todo.dueDate, 'MMM d')}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

    <div
      className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
      onMouseDown={(e) => {
        e.stopPropagation();
        handleResize(e);
      }}
    >
      <GripHorizontal size={16} className="text-white rotate-45" />
    </div>
  </div>
</div>
  </div>
);
};

// Animated Background Component
const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined); // Fixed: Added initial value
  const dotsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initDots();
    };

    const initDots = () => {
      const dotCount = Math.floor((canvas.width * canvas.height) / 8000);
      dotsRef.current = [];
      
      for (let i = 0; i < dotCount; i++) {
        dotsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5
        });
      }
    };

    const animate = () => {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0f172a'); // slate-900
  gradient.addColorStop(0.3, '#1e1b4b'); // indigo-950
  gradient.addColorStop(0.7, '#312e81'); // indigo-900
  gradient.addColorStop(1, '#0f172a'); // back to slate-900
  
  ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      dotsRef.current.forEach(dot => {
        dot.x += dot.vx;
        dot.y += dot.vy;
        
        if (dot.x <= 0 || dot.x >= canvas.width) dot.vx *= -1;
        if (dot.y <= 0 || dot.y >= canvas.height) dot.vy *= -1;
        
        dot.x = Math.max(0, Math.min(canvas.width, dot.x));
        dot.y = Math.max(0, Math.min(canvas.height, dot.y));
        
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
      });

      dotsRef.current.forEach((dot1, i) => {
        dotsRef.current.forEach((dot2, j) => {
          if (i < j) {
            const dx = dot1.x - dot2.x;
            const dy = dot1.y - dot2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
              ctx.beginPath();
              ctx.moveTo(dot1.x, dot1.y);
              ctx.lineTo(dot2.x, dot2.y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * (1 - distance / 100)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

const categoryEmoji: Record<Category, string> = {
  academics: "📚",
  health: "🏃",
  financial: "💵",
  social: "👋",
  other: "📝",
};

const categoryColors: Record<Category, string> = {
  academics: "from-purple-500 to-blue-500",
  health: "from-green-500 to-emerald-500",
  financial: "from-yellow-500 to-orange-500",
  social: "from-pink-500 to-rose-500",
  other: "from-gray-500 to-slate-500",
};

const categoryNames: Record<Category, string> = {
  academics: "Academics",
  health: "Health", 
  financial: "Financial",
  social: "Social",
  other: "Other",
};

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'all';

interface WhiteboardNode {
  id: string;
  type: 'category' | 'class';
  title: string;
  position: { x: number; y: number };
  category?: Category;
  classData?: ClassItem; // Fixed: Now using defined ClassItem interface
  todos: string[];
  width?: number;
  height?: number;
  visible?: boolean;
  zIndex?: number;
}

// Load nodes from localStorage
const loadNodesFromStorage = (): WhiteboardNode[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('whiteboard-nodes');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save nodes to localStorage
const saveNodesToStorage = (nodes: WhiteboardNode[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('whiteboard-nodes', JSON.stringify(nodes));
  } catch (error) {
    console.error('Failed to save nodes to localStorage:', error);
  }
};

// Load shortlist from localStorage
const loadShortlistFromStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('shortlist-todos');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save shortlist to localStorage
const saveShortlistToStorage = (shortlist: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('shortlist-todos', JSON.stringify(shortlist));
  } catch (error) {
    console.error('Failed to save shortlist to localStorage:', error);
  }
};

// Load Canvas settings from localStorage
const loadCanvasSettings = (): { canvasUrl: string; canvasApiKey: string } => {
  if (typeof window === 'undefined') return { canvasUrl: '', canvasApiKey: '' };
  try {
    const saved = localStorage.getItem('canvas-settings');
    return saved ? JSON.parse(saved) : { canvasUrl: '', canvasApiKey: '' };
  } catch {
    return { canvasUrl: '', canvasApiKey: '' };
  }
};

// Save Canvas settings to localStorage
const saveCanvasSettings = (canvasUrl: string, canvasApiKey: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('canvas-settings', JSON.stringify({ canvasUrl, canvasApiKey }));
  } catch (error) {
    console.error('Failed to save Canvas settings to localStorage:', error);
  }
};

function formatDueLabel(date: Date) {
  const today = startOfDay(new Date());
  const diffDays = differenceInCalendarDays(date, today);

  if (diffDays === 0) return { label: "Today", color: "text-red-400" };
  if (diffDays === 1) return { label: "Tomorrow", color: "text-yellow-400" };
  if (diffDays > 1) return { label: `Due ${format(date, "MMM d")}`, color: "text-green-400" };
  return { label: `Overdue`, color: "text-red-400" };
}

type DragHandleProps = {
  listeners?: Record<string, any>;
  attributes?: Record<string, any>;
};

export function DragHandle({ listeners, attributes }: DragHandleProps) {
  return (
    <button
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing mr-2 p-1 rounded hover:bg-white/10 transition-colors"
      aria-label="Drag to reorder"
    >
      <Menu size={14} className="text-gray-400" />
    </button>
  );
}

interface SortableItemProps {
  todo: Todo;
  toggle: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SortableItem({ todo, toggle, onComplete, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const baseStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : "none",
    zIndex: isDragging ? 50 : undefined,
  };

  const daysLeft = todo.dueDate ? differenceInCalendarDays(todo.dueDate, startOfDay(new Date())) : null;

  let bgClass = "bg-gradient-to-r from-blue-500/35 to-emerald-500/35 hover:bg-neutral-600/35 border-l-4";
  let borderColor = "border-gray-500";
  let pulseClass = "";

  if (daysLeft !== null) {
    if (daysLeft < 0) {
      borderColor = "border-red-500";
      pulseClass = "animate-pulse-red";
    } else if (daysLeft === 0) {
      borderColor = "border-yellow-500";
      pulseClass = "animate-pulse-yellow";
    } else if (daysLeft === 1) {
      borderColor = "border-green-400";
    } else if (daysLeft > 1) {
      borderColor = "border-green-600";
    }
  }

  const textClass = todo.completed ? "line-through text-gray-400" : "text-white";

  const handleComplete = () => {
    if (!todo.completed && !isCompleting) {
      setIsCompleting(true);
      toggle(todo.id);
      setTimeout(() => {
        onComplete(todo.id);
        setIsCompleting(false);
      }, 1000);
    }
  };

  return (
    <>
      <motion.li
        ref={setNodeRef}
        style={baseStyle}
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ 
          opacity: isCompleting ? 0 : 1, 
          x: 0,
          scale: isCompleting ? 0.95 : 1
        }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`flex items-center p-3 rounded-lg transition-all ${bgClass} ${borderColor} ${pulseClass} ${
          isDragging ? "opacity-50 shadow-xl rotate-2" : ""
        } ${isCompleting ? "bg-green-500/20" : ""}`}
      >
        <div className="flex items-center shrink-0">
          <DragHandle listeners={listeners} attributes={attributes} />
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleComplete}
            aria-label="Mark complete"
            aria-pressed={todo.completed}
            className={`h-4 w-4 flex items-center justify-center rounded border-2 mr-3 shrink-0 transition-all duration-300 ${
              todo.completed || isCompleting 
                ? "bg-green-500 border-green-500 text-white scale-110" 
                : "border-gray-400 text-transparent hover:border-green-400 hover:scale-110"
            }`}
          >
            {todo.completed || isCompleting ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                ✓
              </motion.span>
            ) : ""}
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-md">{categoryEmoji[todo.category]}</span>
            <span className={`${textClass} font-medium truncate`}>{todo.text}</span>
          </div>
          
          {todo.description && (
            <p className="text-gray-300 text-xs truncate">
              {todo.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1">
            {todo.dueDate && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full bg-black/20 ${formatDueLabel(todo.dueDate).color}`}>
                {formatDueLabel(todo.dueDate).label}
              </span>
            )}
            {todo.repeat !== 'none' && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <RefreshCw size={10} />
                Repeats {todo.repeat}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            aria-label="Edit task"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          
          {!todo.completed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(todo.id);
              }}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
              aria-label="Delete task"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </motion.li>

      <EditTodoModal
        todo={todo}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
      />
    </>
  );
}

export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Parse ICS data function
const parseICSData = (icsData: string) => {
  try {
    const events: any[] = [];
    const lines = icsData.split(/\r?\n/);
    let currentEvent: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } 
      else if (line === 'END:VEVENT') {
        if (currentEvent) {
          const processedEvent = processCanvasEvent(currentEvent);
          if (processedEvent) {
            events.push(processedEvent);
          }
        }
        currentEvent = null;
      }
      else if (currentEvent) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const propertyName = line.substring(0, colonIndex);
          const propertyValue = line.substring(colonIndex + 1);
          
          const basePropertyName = propertyName.split(';')[0];
          
          switch (basePropertyName) {
            case 'SUMMARY':
              currentEvent.name = propertyValue;
              break;
            case 'DTSTART':
              currentEvent.start = propertyValue;
              break;
            case 'DESCRIPTION':
              currentEvent.description = propertyValue;
              break;
            case 'UID':
              currentEvent.uid = propertyValue;
              break;
          }
        }
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error parsing ICS file:', error);
    return [];
  }
};

const processCanvasEvent = (eventData: any) => {
  if (!eventData.start || !eventData.name) {
    return null;
  }
  
  const parseICSToDate = (icsDate: string): Date | null => {
    if (!icsDate) return null;
    try {
      const dateStr = icsDate.includes('T') ? icsDate.split('T')[0] : icsDate.substring(0, 8);
      if (dateStr.length >= 8) {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(year, month, day);
      }
    } catch (error) {
      console.error('Error parsing ICS date:', error);
    }
    return null;
  };

  const dueDate = parseICSToDate(eventData.start);
  if (!dueDate) return null;

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  if (dueDate < oneMonthAgo) {
    return null;
  }

  let assignmentName = eventData.name;
  assignmentName = assignmentName.replace(/<[^>]*>/g, '');
  assignmentName = assignmentName.replace(/^\s+|\s+$/g, '');
  
  let description = eventData.description || '';
  description = description.replace(/<[^>]*>/g, '');
  description = description.substring(0, 200);

  const todo: Todo = {
    id: eventData.uid || `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: assignmentName,
    description: description,
    dueDate: dueDate,
    dueTime: undefined,
    category: 'academics' as Category,
    completed: false,
    repeat: 'none' as RepeatFrequency,
    createdAt: new Date(),
  };

  return todo;
};

// Shortlist Component
const ShortlistPanel: React.FC<{
  shortlistedTodos: string[];
  todos: Todo[];
  toggleTodo: (id: string) => void;
  toggleShortlist: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ shortlistedTodos, todos, toggleTodo, toggleShortlist, isOpen, onToggle }) => {
  const shortlistTasks = todos.filter(todo => shortlistedTodos.includes(todo.id));

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed right-6 bottom-6 z-[1000] flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all ${
          isOpen 
            ? 'bg-yellow-500 hover:bg-yellow-400' 
            : 'bg-neutral-700 hover:bg-neutral-600'
        }`}
        title="Shortlist"
      >
        <Star 
          size={20} 
          className={shortlistedTodos.length > 0 ? "text-yellow-200" : "text-gray-300"}
          fill={shortlistedTodos.length > 0 ? "currentColor" : "none"}
        />
        {shortlistedTodos.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {shortlistedTodos.length}
          </span>
        )}
      </button>

      {/* Shortlist Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed right-6 bottom-24 w-80 h-96 bg-neutral-800/95 backdrop-blur-sm rounded-lg border border-neutral-700 shadow-xl z-[1000] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Star size={18} className="text-yellow-400" fill="currentColor" />
                <h3 className="font-semibold text-white">Shortlist</h3>
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs">
                  {shortlistedTodos.length} tasks
                </span>
              </div>
              <button
                onClick={onToggle}
                className="p-1 hover:bg-neutral-700 rounded transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {shortlistTasks.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Star size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No tasks in shortlist</p>
                  <p className="text-sm">Star tasks on the whiteboard to add them here</p>
                </div>
              ) : (
                shortlistTasks.map(todo => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-neutral-700/50 hover:bg-neutral-700 transition-colors group"
                  >
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={`h-4 w-4 flex items-center justify-center rounded border-2 transition-all ${
                        todo.completed 
                          ? "bg-green-500 border-green-500" 
                          : "border-gray-400 hover:border-green-400"
                      }`}
                    >
                      {todo.completed && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                        {todo.text}
                      </span>
                      {todo.dueDate && (
                        <span className={`text-xs block mt-1 ${
                          differenceInCalendarDays(todo.dueDate, startOfDay(new Date())) === 0 
                            ? 'text-red-300'
                            : 'text-gray-400'
                        }`}>
                          {format(todo.dueDate, 'MMM d')}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleShortlist(todo.id)}
                      className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors"
                      title="Remove from shortlist"
                    >
                      <Star size={14} fill="currentColor" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default function ToDoList() {
  const { todos, toggleTodo, deleteTodo, addTodo: contextAddTodo, reorderTodos, setTodos } = useTodos();
  const [newTodo, setNewTodo] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [category, setCategory] = useState<Category>("other");
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [repeat, setRepeat] = useState<RepeatFrequency>('none');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showCanvasImport, setShowCanvasImport] = useState(false);
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasApiKey, setCanvasApiKey] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Whiteboard state
  const [nodes, setNodes] = useState<WhiteboardNode[]>([]);
  const whiteboardRef = useRef<HTMLDivElement>(null); // Fixed: This is now properly typed
  const nodesInitialized = useRef(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const nextZIndex = useRef(10);

  // Shortlist state
  const [shortlistedTodos, setShortlistedTodos] = useState<string[]>([]);
  const [showShortlist, setShowShortlist] = useState(false);

  const { classes } = useSchedule();

  // Load shortlist from localStorage on component mount
  useEffect(() => {
    const savedShortlist = loadShortlistFromStorage();
    setShortlistedTodos(savedShortlist);
  }, []);

  // Save shortlist to localStorage whenever it changes
  useEffect(() => {
    saveShortlistToStorage(shortlistedTodos);
  }, [shortlistedTodos]);

  // Toggle shortlist function
  const toggleShortlist = (todoId: string) => {
    setShortlistedTodos(prev => {
      if (prev.includes(todoId)) {
        return prev.filter(id => id !== todoId);
      } else {
        return [...prev, todoId];
      }
    });
  };

  // Load Canvas settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = loadCanvasSettings();
    setCanvasUrl(savedSettings.canvasUrl);
    setCanvasApiKey(savedSettings.canvasApiKey);
  }, []);

  // Load nodes from localStorage on initial render
  useEffect(() => {
    if (nodesInitialized.current) return;
    
    const savedNodes = loadNodesFromStorage();
    if (savedNodes.length > 0) {
      setNodes(savedNodes);
      nodesInitialized.current = true;
    } else {
      // Initialize default category nodes with smaller size
      const defaultNodes: WhiteboardNode[] = Object.keys(categoryNames).map((cat, index) => ({
        id: `category-${cat}`,
        type: 'category',
        title: categoryNames[cat as Category],
        category: cat as Category,
        position: { 
          x: 30 + (index % 3) * 300,
          y: 30 + Math.floor(index / 3) * 250
        },
        todos: todos.filter(t => t.category === cat && !t.completed).map(t => t.id),
        width: 280,
        height: 220,
        visible: true,
        zIndex: 1
      }));
      setNodes(defaultNodes);
      nodesInitialized.current = true;
    }
  }, []);

  // Save nodes to localStorage whenever they change
  useEffect(() => {
    if (nodes.length > 0 && nodesInitialized.current) {
      saveNodesToStorage(nodes);
    }
  }, [nodes]);

  // Update node todos when todos change
  useEffect(() => {
    if (!nodesInitialized.current) return;
    
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        todos: todos.filter(t => {
          if (node.type === 'category') {
            return t.category === node.category && !t.completed;
          } else if (node.type === 'class' && node.classData) {
            const courseCode = getUniqueCourseCode(node.classData.name);
            return t.category === 'academics' && 
                   !t.completed &&
                   (courseCode ? 
                     t.description?.toLowerCase().includes(courseCode.toLowerCase()) ||
                     t.text.toLowerCase().includes(courseCode.toLowerCase()) :
                     t.text.toLowerCase().includes(node.classData.name.toLowerCase())
                   );
          }
          return !t.completed;
        }).map(t => t.id)
      }))
    );
  }, [todos]);

  // Auto-create class nodes when classes are loaded - FIXED DUPLICATES
  useEffect(() => {
    if (classes.length === 0 || !nodesInitialized.current) return;

    setNodes(currentNodes => {
      const existingClassNodeIds = new Set(
        currentNodes.filter(node => node.type === 'class').map(node => node.id)
      );

      // Get unique courses by course code to avoid duplicates from labs/recitations
      const uniqueCourses = new Map();
      
      classes.forEach(classItem => {
        const courseCode = getUniqueCourseCode(classItem.name);
        if (courseCode && !uniqueCourses.has(courseCode)) {
          uniqueCourses.set(courseCode, classItem);
        }
      });

      const uniqueClassItems = Array.from(uniqueCourses.values());
      
      console.log('Unique courses found:', uniqueClassItems.map(c => c.name));

      const newClassNodes: WhiteboardNode[] = uniqueClassItems
        .filter(classItem => !existingClassNodeIds.has(`class-${classItem.id}`))
        .map((classItem, index) => {
          const courseCode = getUniqueCourseCode(classItem.name);
          const displayName = courseCode || classItem.name;
          
          return {
            id: `class-${classItem.id}`,
            type: 'class',
            title: displayName,
            classData: classItem,
            position: {
              x: 500 + (index % 4) * 300,
              y: 30 + Math.floor(index / 4) * 250
            },
            todos: todos
              .filter(todo => 
                todo.category === 'academics' && 
                !todo.completed &&
                (courseCode ? 
                  todo.description?.toLowerCase().includes(courseCode.toLowerCase()) ||
                  todo.text.toLowerCase().includes(courseCode.toLowerCase()) :
                  todo.text.toLowerCase().includes(classItem.name.toLowerCase())
                )
              )
              .map(todo => todo.id),
            width: 280,
            height: 220,
            visible: true,
            zIndex: 1
          };
        });

      if (newClassNodes.length === 0) {
        return currentNodes;
      }

      return [...currentNodes, ...newClassNodes];
    });
  }, [classes, todos]);

  // Handle node drag start for z-index layering
  const handleNodeDragStart = (nodeId: string) => {
    setDraggingNodeId(nodeId);
    setNodes(currentNodes =>
      currentNodes.map(node =>
        node.id === nodeId
          ? { ...node, zIndex: nextZIndex.current++ }
          : node
      )
    );
  };

  const handleNodeDragEnd = () => {
    setDraggingNodeId(null);
  };

  // Sidebar resize handler
  const handleSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(300, Math.min(startWidth + deltaX, 600));
      setSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleNodeVisibility = (nodeId: string) => {
    setNodes(currentNodes =>
      currentNodes.map(node =>
        node.id === nodeId
          ? { ...node, visible: !node.visible }
          : node
      )
    );
  };

  const showAllNodes = () => {
    setNodes(currentNodes =>
      currentNodes.map(node => ({ ...node, visible: true }))
    );
  };

  const hideAllNodes = () => {
    setNodes(currentNodes =>
      currentNodes.map(node => ({ ...node, visible: false }))
    );
  };

  // Canvas sync function with settings saving
  const handleManualSync = async () => {
    if (!canvasUrl || !canvasApiKey) {
      setShowSyncSettings(true);
      return;
    }

    // Save Canvas settings to localStorage
    saveCanvasSettings(canvasUrl, canvasApiKey);

    setIsSyncing(true);
    try {
      console.log('Starting Canvas sync...');
      
      const response = await fetch('/api/canvas-sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          canvasUrl: canvasUrl.trim(),
          canvasApiKey: canvasApiKey.trim()
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `Sync failed: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      console.log('Content-Type:', contentType);
      console.log('Response length:', responseText.length);

      if (contentType?.includes('application/json')) {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.error || 'Unknown error from Canvas API');
      }

      if (!contentType?.includes('text/calendar') && responseText.includes('BEGIN:VCALENDAR')) {
        console.log('Detected ICS format despite content-type');
      }

      if (!responseText.includes('BEGIN:VCALENDAR')) {
        throw new Error('Invalid response format from Canvas API');
      }

      const canvasEvents = parseICSData(responseText);
      console.log('Parsed events:', canvasEvents.length);
      
      if (canvasEvents.length === 0) {
        alert('No new assignments found in your Canvas account.');
        return;
      }
      
      let importedCount = 0;
      let updatedCount = 0;

      canvasEvents.forEach(event => {
        const existingTodoIndex = todos.findIndex(todo => {
          if (todo.id === event.id) return true;
          
          const isSameText = todo.text.trim() === event.text.trim();
          const isSameDate = todo.dueDate && event.dueDate && 
            Math.abs(todo.dueDate.getTime() - event.dueDate.getTime()) < 24 * 60 * 60 * 1000;
          
          return isSameText && isSameDate;
        });

        if (existingTodoIndex !== -1) {
          const updatedTodos = [...todos];
          updatedTodos[existingTodoIndex] = {
            ...updatedTodos[existingTodoIndex],
            dueDate: event.dueDate,
            description: event.description || updatedTodos[existingTodoIndex].description,
          };
          setTodos(updatedTodos);
          updatedCount++;
        } else {
          contextAddTodo(event);
          importedCount++;
        }
      });

      setLastSync(new Date());
      
      if (importedCount > 0 || updatedCount > 0) {
        alert(`Sync successful! ${importedCount} new assignments, ${updatedCount} updated.`);
      } else {
        alert('All assignments from Canvas were already in your todo list.');
      }
    } catch (error: any) {
      console.error('Sync error details:', error);
      
      let userMessage = error.message || 'Sync failed. Please check your API key and URL.';
      
      if (error.message.includes('404')) {
        userMessage = 'Canvas API endpoint not found (404). Please check your Canvas URL.';
      } else if (error.message.includes('401')) {
        userMessage = 'Invalid API key (401). Please check your Canvas API key.';
      } else if (error.message.includes('403')) {
        userMessage = 'Access forbidden (403). Please check your API key permissions.';
      } else if (error.message.includes('Failed to fetch')) {
        userMessage = 'Network error. Please check your internet connection and Canvas URL.';
      }
      
      alert(userMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const testCanvasConnection = async () => {
    alert('Test connection functionality would go here');
  };

  const handleCanvasImport = async () => {
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      setShowCanvasImport(false);
      alert('Import completed!');
    }, 2000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    alert('File upload functionality would go here');
    setShowFileUpload(false);
  };

  // Filter functions
  const filterTodosByViewMode = (todos: Todo[]) => {
    const now = new Date();
    const today = startOfDay(now);
    
    switch (viewMode) {
      case 'daily':
        const endOfToday = new Date(today);
        endOfToday.setDate(endOfToday.getDate() + 1);
        return todos.filter(todo => 
          todo.dueDate && todo.dueDate >= today && todo.dueDate < endOfToday
        );
      case 'weekly':
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        return todos.filter(todo => 
          todo.dueDate && todo.dueDate >= today && todo.dueDate < endOfWeek
        );
      case 'monthly':
        const endOfMonth = new Date(today);
        endOfMonth.setDate(endOfMonth.getDate() + 30);
        return todos.filter(todo => 
          todo.dueDate && todo.dueDate >= today && todo.dueDate < endOfMonth
        );
      case 'all':
      default:
        return todos;
    }
  };

  const activeTodos = filterTodosByViewMode(
    todos.filter((todo) => !todo.completed && !completingIds.has(todo.id))
  ).sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return 0;
  });

  const completedTodos = todos.filter((todo) => todo.completed);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderTodos(active.id as string, over.id as string);
  };

  const addTodo = () => {
    if (newTodo.trim() === "" || (dueDate && dueDate < startOfDay(new Date()))) return;
    const newTask = {
      text: newTodo.trim(),
      completed: false,
      dueDate,
      category,
      repeat,
      createdAt: new Date(),
    };
    contextAddTodo(newTask);
    setNewTodo("");
    setDueDate(null);
    setRepeat('none');
  };

  const handleComplete = (id: string) => {
    setCompletingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setCompletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 1000);
  };

  const handleDeleteTodo = (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTodo(id);
    }
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") addTodo();
    if (e.key === "Escape") {
      setNewTodo("");
      setDueDate(null);
    }
  };

  const visibleNodes = nodes.filter(node => node.visible !== false);

  return (
    <div className="h-screen flex bg-neutral-900 text-white">
      {/* Left Panel - Task List */}
      <div 
        ref={sidebarRef}
        className="flex flex-col border-r bg-gradient-to-bl from-neutral-900/80 to-black/90 relative"
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-gray-500/50 active:bg-blue-500 z-10"
          onMouseDown={handleSidebarResize}
        />
        
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="ml-2 text-3xl font-outfit">Tasks</h1>
            <div className="flex gap-2">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                className="px-3 py-1 rounded-lg bg-neutral-700 border border-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500 font-outfit"
              >
                <option value="all">All</option>
                <option value="daily">📅 Today</option>
                <option value="weekly">📅 Week</option>
                <option value="monthly">📅 Month</option>
              </select>
            </div>
          </div>

          {/* Add Task Form */}
          <div className="space-y-3">
            <input 
              type="text" 
              value={newTodo} 
              onChange={(e) => setNewTodo(e.target.value)} 
              onKeyDown={handleEnter} 
              placeholder="What needs to be done?" 
              className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 font-outfit placeholder-gray-400"
            />
            <div className="flex gap-2">
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value as Category)} 
                className="flex-1 px-3 py-2 rounded-lg bg-black border border-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500 font-outfit"
              >
                <option value="academics">📚 Academics</option>
                <option value="health">🏃 Health</option>
                <option value="financial">💵 Financial</option>
                <option value="social">👋 Social</option>
                <option value="other">📝 Other</option>
              </select>
              <DatePicker 
                selected={dueDate} 
                onChange={(date) => setDueDate(date)} 
                minDate={new Date()} 
                isClearable 
                placeholderText="📅" 
                className="px-3 py-2 rounded-lg bg-black border border-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500 w-20"
                calendarClassName="bg-slate-800 text-white rounded-lg"
              />
              <select 
                value={repeat} 
                onChange={(e) => setRepeat(e.target.value as RepeatFrequency)} 
                className="px-3 py-2 rounded-lg bg-black border border-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500 font-outfit"
              >
                <option value="none">No repeat</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <button 
              onClick={addTodo} 
              className="text-xl w-full px-4 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-lg hover:bg-gradient-to-r hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2 font-outfit"
            >
              <Plus size={20} />
              Add Task
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={activeTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="h-full overflow-y-auto">
                <ul className="p-4 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {activeTodos.length === 0 ? (
                      <motion.div 
                        key="empty-state" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="text-center text-gray-400 py-8"
                      >
                        <div className="text-4xl mb-2">🎯</div>
                        <p>No tasks yet</p>
                        <p className="text-sm font-outfit">Add a task to get started</p>
                      </motion.div>
                    ) : (
                      activeTodos.map((todo) => (
                        <SortableItem 
                          key={todo.id} 
                          todo={todo} 
                          toggle={toggleTodo} 
                          onComplete={handleComplete}
                          onDelete={handleDeleteTodo}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </ul>
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Completed Tasks */}
        {completedTodos.length > 0 && (
          <div className="border-t border-gray-700 p-4">
            <button 
              onClick={() => setShowCompleted((prev) => !prev)} 
              className="w-full px-4 py-2 bg-neutral-700 rounded-lg hover:bg-neutral-600 transition-colors text-sm text-gray-300"
            >
              {showCompleted ? "Hide" : "Show"} Completed ({completedTodos.length})
            </button>
            {showCompleted && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {completedTodos.map((todo) => (
                    <motion.div
                      key={todo.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex justify-between items-center p-3 rounded-lg bg-slate-700 text-gray-400 line-through text-sm"
                    >
                      <span className="truncate">{todo.text}</span>
                      <button 
                        onClick={() => deleteTodo(todo.id)} 
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        🗑️
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Panel - Whiteboard */}
      <div className="flex-1 relative overflow-hidden bg-neutral-900">
        <div 
          ref={whiteboardRef}
          className="w-full h-full relative"
        >
          {/* Animated Background */}
          <AnimatedBackground />

          {/* Node Visibility Toggle Menu - Always on top */}
          <div className="absolute top-6 left-6 flex gap-3 z-50">
            <button
              onClick={() => setShowNodeMenu(!showNodeMenu)}
              className="flex items-center px-4 py-2 bg-neutral-700 rounded-lg hover:bg-neutral-600 transition-all border border-gray-600"
              title="Toggle Nodes"
            >
              <Eye size={16} className="mr-2" />
              Nodes
            </button>
            
            {showNodeMenu && (
              <div className="absolute top-12 left-0 bg-neutral-800 rounded-lg shadow-xl border border-neutral-600 p-4 min-w-48 z-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Node Visibility</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={showAllNodes}
                      className="p-1 hover:bg-slate-700 rounded"
                      title="Show All"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={hideAllNodes}
                      className="p-1 hover:bg-slate-700 rounded"
                      title="Hide All"
                    >
                      <EyeOff size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {nodes.map((node) => (
                    <div key={node.id} className="flex items-center justify-between">
                      <span className="text-sm">
                        {node.type === 'category' 
                          ? categoryEmoji[node.category!] 
                          : '📚'} {node.title}
                        {node.type === 'class' && (
                          <span className="text-xs text-gray-500 ml-1">(Class)</span>
                        )}
                      </span>
                      <button
                        onClick={() => toggleNodeVisibility(node.id)}
                        className={`p-1 rounded ${
                          node.visible !== false 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                      >
                        {node.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Whiteboard Nodes */}
          {visibleNodes.map((node) => (
            <WhiteboardNodeComponent
              key={node.id}
              node={node}
              todos={todos}
              toggleTodo={toggleTodo}
              whiteboardRef={whiteboardRef}
              setNodes={setNodes}
              onDragStart={handleNodeDragStart}
              onDragEnd={handleNodeDragEnd}
              toggleShortlist={toggleShortlist}
              shortlistedTodos={shortlistedTodos}
            />
          ))}

          {/* Whiteboard Controls */}
          <div className="absolute top-6 right-6 flex gap-3 z-40">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center px-4 py-2 bg-neutral-700 rounded-lg hover:bg-neutral-600 transition-all border border-neutral-600"
              title={lastSync ? `Last sync: ${lastSync ? format(lastSync, 'PPpp') : 'Never'}` : 'Never synced'}
            >
              <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Canvas'}
            </button>
            <button
              onClick={() => setShowSyncSettings(true)}
              className="flex items-center px-4 py-2 bg-emerald-700 rounded-lg hover:bg-emerald-600 transition-all border border-emerald-600"
              title="Canvas Sync Settings"
            >
              <Key size={16} />
            </button>
          </div>

          {/* Empty State */}
          {visibleNodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Layout size={64} className="mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Your Whiteboard</h3>
                <p>All nodes are hidden or no tasks available</p>
                <button
                  onClick={showAllNodes}
                  className="mt-4 px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Show All Nodes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shortlist Panel */}
      <ShortlistPanel
        shortlistedTodos={shortlistedTodos}
        todos={todos}
        toggleTodo={toggleTodo}
        toggleShortlist={toggleShortlist}
        isOpen={showShortlist}
        onToggle={() => setShowShortlist(!showShortlist)}
      />

      {/* Modals */}
      {showCanvasImport && (
        <div className="fixed inset-0 bg-black/90 bg-opacity-50 flex items-center justify-center p-4 z-[1001]">
          <div className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Import from Canvas</h2>
                <button onClick={() => setShowCanvasImport(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-400 mb-4">Enter your Canvas ICS feed URL to import assignments automatically.</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Canvas ICS URL</label>
                <input 
                  type="url" 
                  placeholder="https://canvas.pitt.edu/feeds/calendars/user_xxx.ics" 
                  value={canvasUrl} 
                  onChange={(e) => setCanvasUrl(e.target.value)} 
                  className="w-full p-3 bg-slate-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowCanvasImport(false)} className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors">Cancel</button>
                <button onClick={handleCanvasImport} disabled={!canvasUrl || isImporting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isImporting ? "Importing..." : "Import Assignments"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSyncSettings && (
        <div className="fixed inset-0 bg-black/90 bg-opacity-50 flex items-center justify-center p-4 z-[1001]">
          <div className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-md border border-neutral-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Canvas Sync Settings</h2>
                <button onClick={() => setShowSyncSettings(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Canvas Instance URL</label>
                <input 
                  type="url" 
                  placeholder="https://yourschool.instructure.com" 
                  value={canvasUrl} 
                  onChange={(e) => setCanvasUrl(e.target.value)} 
                  className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-1 focus:ring-neutral-500" 
                />
                <p className="text-xs text-gray-400 mt-1">Your Canvas instance URL (e.g., https://yourschool.instructure.com)</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Canvas API Key</label>
                <input 
                  type="password" 
                  placeholder="Your Canvas API key" 
                  value={canvasApiKey} 
                  onChange={(e) => setCanvasApiKey(e.target.value)} 
                  className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-1 focus:ring-neutral-500" 
                />
                <p className="text-xs text-gray-400 mt-1">Find this in Canvas: Account → Settings → Approved Integrations → New Access Token</p>
              </div>
              {lastSync && <p className="text-sm text-gray-400 mb-4">Last sync: {format(lastSync, 'PPpp')}</p>}
              <div className="flex justify-end space-x-3">
                <button onClick={testCanvasConnection} disabled={!canvasUrl || !canvasApiKey} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Test Connection</button>
                <button onClick={() => setShowSyncSettings(false)} className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-neutral-700 transition-colors">Cancel</button>
                <button onClick={() => { 
                  saveCanvasSettings(canvasUrl, canvasApiKey);
                  handleManualSync(); 
                  setShowSyncSettings(false); 
                }} disabled={!canvasUrl || !canvasApiKey} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save & Sync</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}