import React, { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import path from "path-browserify";

interface EditAreaProps {
  filePath: string;
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
}

const DIRTY_CHECK_DEBOUNCE_MS = 500;

function EditArea({ filePath, content, setContent }: EditAreaProps) {
  const [lineCount, setLineCount] = useState<number>(1);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLineCount(content.split("\n").length);
  }, [content]);

  // Check dirty state by calling backend whenever content changes
  useEffect(() => {
    if (!filePath) {
      setIsDirty(false);
      return;
    }

    // Clear existing timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // Debounce the dirty check to avoid too many backend calls
    checkTimeoutRef.current = setTimeout(async () => {
      setIsChecking(true);
      try {
        const result = await invoke<boolean>("is_dirty", {
          path: filePath,
          currentContent: content,
        });
        setIsDirty(result);
      } catch (error) {
        console.error("Error checking dirty state:", error);
        setIsDirty(false);
      } finally {
        setIsChecking(false);
      }
    }, DIRTY_CHECK_DEBOUNCE_MS);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [content, filePath]);

  // Reset dirty state when a new file is loaded
  useEffect(() => {
    if (filePath) {
      setIsDirty(false);
    }
  }, [filePath]);

  // Handle changes in the textarea
  const handleContentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(event.target.value);
    },
    [setContent],
  );

  // Synchronize scrolling between the textarea and the line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Generate line number elements
  const renderLineNumbers = useCallback(() => {
    const numbers = [];
    for (let i = 1; i <= lineCount; i++) {
      numbers.push(
        <div
          key={i}
          className="line-number h-6 flex items-center justify-end pr-2"
        >
          {i}
        </div>,
      );
    }
    return numbers;
  }, [lineCount]);

  // Extract just the file name for display
  const getDisplayFileName = (): string => {
    if (!filePath) return "";
    return path.basename(filePath);
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800">
            {getDisplayFileName()}
          </span>
          {isDirty && (
            <span className="text-red-500 text-lg" title="Unsaved changes">
              ●
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {isChecking ? "Checking..." : isDirty ? "Unsaved" : "Saved"}
        </span>
      </div>
      <div className="flex flex-col w-full max-h-screen h-[100vh] bg-gray-800 overflow-hidden">
        {/* Editor Wrapper: Contains line numbers and textarea */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Line Numbers Pane */}
          <div
            className="flex-shrink-0 w-12 bg-gray-50 text-gray-500 text-sm text-right px-5 py-2 border-r border-gray-200 overflow-hidden select-none resize-x"
            ref={lineNumbersRef}
          >
            {renderLineNumbers()}
          </div>

          {/* Text Input Area */}
          <textarea
            ref={textareaRef}
            className="flex-1 w-full p-2 text-base leading-6 bg-white resize-none overflow-y-auto text-nowrap focus:outline-none focus:ring-0"
            value={content}
            onChange={handleContentChange}
            onScroll={handleScroll}
            placeholder="Start typing here..."
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

export default EditArea;
