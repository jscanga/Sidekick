// components/EditTodoModal.tsx
"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTodos, Category, RepeatFrequency, Todo as TodoType } from "@/contexts/todocontext";
import { startOfDay } from "date-fns";

interface EditTodoModalProps {
  todoItem: TodoType; // renamed to avoid conflict
  isOpen: boolean;
  onClose: () => void;
}

const categoryEmoji: Record<Category, string> = {
  academics: "📚",
  health: "🏃",
  financial: "💵",
  social: "👋",
  other: "📝",
};

// Time formatting helper
const formatTimeForInput = (timeString: string | undefined): string => {
  if (!timeString) return "";
  return timeString;
};

export default function EditTodoModal({ todoItem, isOpen, onClose }: EditTodoModalProps) {
  const { updateTodo } = useTodos();
  const [text, setText] = useState(todoItem.text);
  const [description, setDescription] = useState(todoItem.description || "");
  const [dueDate, setDueDate] = useState<Date | null>(todoItem.dueDate);
  const [dueTime, setDueTime] = useState(todoItem.dueTime || "");
  const [category, setCategory] = useState<Category>(todoItem.category);
  const [repeat, setRepeat] = useState<RepeatFrequency>(todoItem.repeat);

  const handleSave = () => {
    if (text.trim() === "") return;

    updateTodo(todoItem.id, {
      text: text.trim(),
      description: description.trim() || undefined,
      dueDate,
      dueTime: dueTime || undefined,
      category,
      repeat,
    });

    onClose();
  };

  const handleRemoveRepeat = () => {
    setRepeat("none");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black opacity-90 flex items-center justify-center z-40">
      <div className="bg-neutral-800 p-6 rounded-lg w-96 max-w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Edit Task</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Task Name
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="Task name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="Short description..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-3 py-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            >
              <option value="academics">📚 Academics</option>
              <option value="health">🏃 Health</option>
              <option value="financial">💵 Financial</option>
              <option value="social">👋 Social</option>
              <option value="other">📝 Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Due Date
              </label>
              <DatePicker
                selected={dueDate}
                onChange={(date) => setDueDate(date)}
                minDate={new Date()}
                isClearable
                placeholderText="No due date"
                className="w-full px-3 py-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Time (Optional)
              </label>
              <input
                type="time"
                value={formatTimeForInput(dueTime)}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Repeat
            </label>
            <select
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as RepeatFrequency)}
              className="w-full px-3 py-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            >
              <option value="none">No repeat</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            {repeat !== "none" && (
              <button
                onClick={handleRemoveRepeat}
                className="mt-2 text-sm text-red-400 hover:text-red-300"
              >
                Remove repeat
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
