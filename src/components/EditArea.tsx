import React, { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import path from "path-browserify";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, StateEffect } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { getLanguageExtension } from "../utils";

interface EditAreaProps {
  filePath: string;
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
}

const DIRTY_CHECK_DEBOUNCE_MS = 500;

function EditArea({ filePath, content, setContent }: EditAreaProps) {
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!editorRef.current) return;

    const initEditor = async () => {
      const languageExt = await getLanguageExtension(filePath);

      // Create editor state
      const state = EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          oneDark,
          languageExt,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newContent = update.state.doc.toString();
              setContent(newContent);
            }
          }),
          EditorView.lineWrapping,
        ],
      });

      // Create editor view
      const view = new EditorView({
        state,
        parent: editorRef.current!,
      });

      viewRef.current = view;
    };

    initEditor();

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update editor content when filePath changes (new file loaded)
  useEffect(() => {
    if (viewRef.current && filePath) {
      const updateFile = async () => {
        const currentContent = viewRef.current!.state.doc.toString();
        if (currentContent !== content) {
          viewRef.current!.dispatch({
            changes: {
              from: 0,
              to: currentContent.length,
              insert: content,
            },
          });
        }

        // Update language extension based on new file
        const languageExt = await getLanguageExtension(filePath);
        viewRef.current!.dispatch({
          effects: StateEffect.reconfigure.of([
            basicSetup,
            oneDark,
            languageExt,
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                const newContent = update.state.doc.toString();
                setContent(newContent);
              }
            }),
            EditorView.lineWrapping,
          ]),
        });

        setIsDirty(false);
      };

      updateFile();
    }
  }, [filePath]);

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

  // Extract just the file name for display
  const getDisplayFileName = (): string => {
    if (!filePath) return "";
    return path.basename(filePath);
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header */}
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
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            {isChecking ? "Checking..." : isDirty ? "Unsaved" : "Saved"}
          </span>
          <span className="text-xs text-gray-400">
            Ctrl+Z: Undo | Ctrl+Y: Redo
          </span>
        </div>
      </div>

      {/* CodeMirror Editor Container */}
      <div
        ref={editorRef}
        className="flex-1 overflow-auto"
        style={{ height: "calc(100vh - 48px)" }}
      />
    </div>
  );
}

export default EditArea;
