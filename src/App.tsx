import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import EditArea from "./components/EditArea";
import React, { useState, useEffect } from "react";
import path from "path-browserify";

// Define the type for directory contents: [fullPath: string, isDirectory: boolean]
type DirContents = [string, boolean];

/**
 * Fetches the contents of a given directory from the Rust backend.
 * @param directoryPath The full path of the directory to read.
 * @returns A promise that resolves to an array of [fullPath, isDirectory] tuples.
 */
const fetchDirectoryContents = async (
  directoryPath: string,
): Promise<DirContents[]> => {
  try {
    const contents: [string, boolean][] = await invoke(
      "read_directory_contents",
      { path: directoryPath },
    );
    return contents;
  } catch (error) {
    console.error(
      `Error fetching directory contents for ${directoryPath}:`,
      error,
    );
    return [];
  }
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

  async function saveFile() {
    try {
      if (filePath.trim() === "") {
        // Use frontend dialog for save
        const selectedPath = await save({
          defaultPath: "untitled.txt",
          filters: [
            { name: "Text Files", extensions: ["txt"] },
            { name: "Markdown Files", extensions: ["md", "markdown"] },
            { name: "All Files", extensions: ["*"] },
          ],
        });

        if (selectedPath) {
          const result = await invoke("save_file_to_path", {
            fileContent: fileContent,
            filePath: selectedPath,
          });
          console.log(result);
          setFilePath(selectedPath);
        }
      } else {
        const result = await invoke("save_file_to_path", {
          fileContent: fileContent,
          filePath: filePath,
        });
        console.log(result);
      }
    } catch (error) {
      console.error("Error saving file:", error);
    }
  }

  async function openFileDialog() {
    try {
      const selectedPath = await open({
        multiple: false,
        directory: false,
        filters: [
          { name: "Text Files", extensions: ["txt"] },
          { name: "Markdown Files", extensions: ["md", "markdown"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (selectedPath) {
        const pathStr = Array.isArray(selectedPath)
          ? selectedPath[0]
          : selectedPath;
        const file: [string, string, string] = await invoke(
          "load_file_from_path",
          { pathStr },
        );
        setFilePath(file[1]);
        setFileContent(file[2]);
      }
    } catch (error) {
      console.error("Error opening file:", error);
    }
  }

  async function openFolderDialog() {
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
  }

  // Effect to load initial directory contents when the originPath changes
  useEffect(() => {
    if (originPath) {
      fetchDirectoryContents(originPath).then((contents) => {
        const sortedContents = contents.sort((a, b) => {
          // If 'a' is a directory and 'b' is a file, 'a' comes first
          if (a[1] && !b[1]) return -1;
          // If 'a' is a file and 'b' is a directory, 'b' comes first
          if (!a[1] && b[1]) return 1;
          // Otherwise, sort alphabetically by their base name
          return path.basename(a[0]).localeCompare(path.basename(b[0]));
        });
        setDirectoryContents(sortedContents);
        setExpandedPaths(new Set());
        setExpandedContents({});
      });
    }
  }, [originPath]);

  useEffect(() => {
    const unlisten = listen<string>("folder-selected", (e) => {
      setOriginPath(e.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen("save", () => {
      saveFile();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [fileContent, filePath]);

  useEffect(() => {
    const unlisten = listen("open-file-dialog", () => {
      openFileDialog();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const unlisten = listen("open-folder-dialog", () => {
      openFolderDialog();
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  /**
   * Handles the click event for toggling (expanding/collapsing) a directory.
   * @param fullPath The full path of the item that was clicked.
   * @param isDirectory A boolean indicating if the clicked item is a directory.
   */
  const handleToggleFolder = async (fullPath: string, isDirectory: boolean) => {
    if (!isDirectory) {
      console.log(`Clicked on file: ${fullPath}`);
      let file: [string, string, string] = await invoke("load_file_from_path", {
        pathStr: fullPath,
      });
      console.log(file);
      setFilePath(file[1]);
      setFileContent(file[2]);
      return;
    }

    // Check if the directory is currently expanded
    if (expandedPaths.has(fullPath)) {
      // If expanded, collapse it by removing its path from the expandedPaths set
      setExpandedPaths((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fullPath);
        return newSet;
      });
    } else {
      // If not expanded, fetch its contents
      const subcontents = await fetchDirectoryContents(fullPath);
      const sortedSubcontents = subcontents.sort((a, b) => {
        if (a[1] && !b[1]) return -1;
        if (!a[1] && b[1]) return 1;
        return path.basename(a[0]).localeCompare(path.basename(b[0]));
      });

      // Store the fetched contents in expandedContents, keyed by the directory's full path
      setExpandedContents((prev) => ({
        ...prev,
        [fullPath]: sortedSubcontents,
      }));
      // Add the directory's full path to the expandedPaths set
      setExpandedPaths((prev) => new Set(prev).add(fullPath));
    }
  };

  /**
   * Recursive function to render the directory contents as a tree.
   * @param contents An array of DirContents to render.
   */
  const renderDirectoryContents = (contents: DirContents[]) => (
    // Add left padding to create indentation for nested levels
    <ul className="pl-4">
      {contents.map((item) => {
        const itemFullPath = item[0];
        const isDirectory = item[1];

        let displayName = itemFullPath;
        const lastSlashIndex = itemFullPath.lastIndexOf("/");
        const lastBackslashIndex = itemFullPath.lastIndexOf("\\");

        const lastSeparatorIndex = Math.max(lastSlashIndex, lastBackslashIndex);

        if (lastSeparatorIndex !== -1) {
          displayName = itemFullPath.substring(lastSeparatorIndex + 1);
        }

        return (
          // Use the full path as the key for uniqueness in React lists
          <li key={itemFullPath} className="py-1">
            <span
              // Apply cursor and text color based on whether it's a directory
              className={`cursor-pointer ${isDirectory ? "text-blue-600" : "text-gray-800"} hover:text-blue-800 flex items-center`}
              // Call handleToggleFolder with the item's full path and type
              onClick={() => handleToggleFolder(itemFullPath, isDirectory)}
            >
              {/* Display expand/collapse icon for directories, or a file icon for files */}
              {isDirectory ? (
                expandedPaths.has(itemFullPath) ? (
                  "▼ "
                ) : (
                  "▶ "
                )
              ) : (
                <span className="mr-1">📄</span> // File icon
              )}
              {displayName}
            </span>
            {/* Recursively render sub-contents if it's a directory, expanded, and has contents */}
            {isDirectory &&
              expandedPaths.has(itemFullPath) &&
              expandedContents[itemFullPath] &&
              renderDirectoryContents(expandedContents[itemFullPath])}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex h-screen bg-gray-100 font-inter">
      {/* Sidebar for the directory tree */}
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
          filePath={filePath}
          originPath={originPath}
          content={fileContent}
          setContent={setFileContent}
        />
      </div>
    </div>
  );
};

export default App;
