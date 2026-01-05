import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import EditArea from "./components/EditArea";
import React, { useState, useEffect } from "react";
import path from "path-browserify";

// Type definitions
type DirContents = [string, boolean];

// Constants
const FILE_FILTERS = [
  { name: "Text Files", extensions: ["txt"] },
  { name: "Markdown Files", extensions: ["md", "markdown"] },
  { name: "All Files", extensions: ["*"] },
];

/**
 * Fetches the contents of a given directory from the Rust backend.
 */
const fetchDirectoryContents = async (
  directoryPath: string,
): Promise<DirContents[]> => {
  try {
    return await invoke("read_directory_contents", { path: directoryPath });
  } catch (error) {
    console.error(
      `Error fetching directory contents for ${directoryPath}:`,
      error,
    );
    return [];
  }
};

/**
 * Sorts directory contents with directories first, then alphabetically.
 */
const sortDirectoryContents = (contents: DirContents[]): DirContents[] =>
  contents.sort((a, b) => {
    // Directories before files
    if (a[1] !== b[1]) return a[1] ? -1 : 1;
    // Then sort alphabetically by basename
    return path.basename(a[0]).localeCompare(path.basename(b[0]));
  });

/**
 * Custom hook for managing Tauri event listeners.
 */
const useTauriEvent = (eventName: string, callback: (e?: any) => void) => {
  useEffect(() => {
    const unlistenPromise = listen(eventName, callback);
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [eventName, callback]);
};

const App: React.FC = () => {
  const [originPath, setOriginPath] = useState("");
  const [directoryContents, setDirectoryContents] = useState<DirContents[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [expandedContents, setExpandedContents] = useState<
    Record<string, DirContents[]>
  >({});
  const [filePath, setFilePath] = useState("");
  const [fileContent, setFileContent] = useState("");

  // Save file
  const saveFile = async () => {
    try {
      if (filePath.trim() === "") {
        const selectedPath = await save({
          defaultPath: "untitled.txt",
          filters: FILE_FILTERS,
        });

        if (selectedPath) {
          await invoke("save_file_to_path", {
            fileContent,
            filePath: selectedPath,
          });
          setFilePath(selectedPath);
        }
      } else {
        await invoke("save_file_to_path", { fileContent, filePath });
      }
    } catch (error) {
      console.error("Error saving file:", error);
    }
  };

  // Open file dialog
  const openFileDialog = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        directory: false,
        filters: FILE_FILTERS,
      });

      if (selectedPath) {
        const pathStr = Array.isArray(selectedPath)
          ? selectedPath[0]
          : selectedPath;
        const file: [string, string, string] = await invoke(
          "load_file_from_path",
          {
            pathStr,
          },
        );
        setFilePath(file[1]);
        setFileContent(file[2]);
      }
    } catch (error) {
      console.error("Error opening file:", error);
    }
  };

  // Open folder dialog
  const openFolderDialog = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        directory: true,
      });

      if (selectedPath) {
        const pathStr = Array.isArray(selectedPath)
          ? selectedPath[0]
          : selectedPath;
        await invoke("set_project_directory", { directoryPath: pathStr });
      }
    } catch (error) {
      console.error("Error opening folder:", error);
    }
  };

  // Handle directory tree item click
  const handleToggleFolder = async (fullPath: string, isDirectory: boolean) => {
    if (!isDirectory) {
      const file: [string, string, string] = await invoke(
        "load_file_from_path",
        {
          pathStr: fullPath,
        },
      );
      setFilePath(file[1]);
      setFileContent(file[2]);
      return;
    }

    if (expandedPaths.has(fullPath)) {
      setExpandedPaths((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fullPath);
        return newSet;
      });
    } else {
      const subcontents = await fetchDirectoryContents(fullPath);
      setExpandedContents((prev) => ({
        ...prev,
        [fullPath]: sortDirectoryContents(subcontents),
      }));
      setExpandedPaths((prev) => new Set(prev).add(fullPath));
    }
  };

  // Render directory tree recursively
  const renderDirectoryContents = (contents: DirContents[]) => (
    <ul className="pl-4">
      {contents.map((item) => {
        const [itemFullPath, isDirectory] = item;
        const displayName = itemFullPath.split(/[\\\/]/).pop() || itemFullPath;

        return (
          <li key={itemFullPath} className="py-1">
            <span
              className={`cursor-pointer ${
                isDirectory ? "text-blue-600" : "text-gray-800"
              } hover:text-blue-800 flex items-center`}
              onClick={() => handleToggleFolder(itemFullPath, isDirectory)}
            >
              {isDirectory
                ? expandedPaths.has(itemFullPath)
                  ? "▼ "
                  : "▶ "
                : "📄 "}
              {displayName}
            </span>
            {isDirectory &&
              expandedPaths.has(itemFullPath) &&
              expandedContents[itemFullPath] &&
              renderDirectoryContents(expandedContents[itemFullPath])}
          </li>
        );
      })}
    </ul>
  );

  // Load directory contents when project path changes
  useEffect(() => {
    if (originPath) {
      fetchDirectoryContents(originPath).then((contents) => {
        setDirectoryContents(sortDirectoryContents(contents));
        setExpandedPaths(new Set());
        setExpandedContents({});
      });
    }
  }, [originPath]);

  // Register event listeners
  useTauriEvent("folder-selected", (e: any) => setOriginPath(e.payload));
  useTauriEvent("save", () => saveFile());
  useTauriEvent("open-file-dialog", () => openFileDialog());
  useTauriEvent("open-folder-dialog", () => openFolderDialog());

  return (
    <div className="flex h-screen bg-gray-100 font-inter">
      <div className="w-1/4 bg-white p-4 shadow-md overflow-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Project Explorer
        </h2>
        <p className="text-sm text-gray-600 mb-2">
          Origin Path:{" "}
          <span className="font-mono text-xs break-all">
            {originPath || "No folder selected"}
          </span>
        </p>
        {directoryContents.length > 0 ? (
          renderDirectoryContents(directoryContents)
        ) : (
          <p className="text-gray-500 text-sm">
            Select a folder to view its contents.
          </p>
        )}
      </div>

      <div className="flex-1">
        <EditArea
          key={filePath}
          filePath={filePath}
          content={fileContent}
          setContent={setFileContent}
        />
      </div>
    </div>
  );
};

export default App;
