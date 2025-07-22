import { invoke } from "@tauri-apps/api/core";
import EditArea from "./components/EditArea"; 
import { listen } from "@tauri-apps/api/event";
import { useState } from "react";

function App() {

  const [path, setPath] = useState('');

  const openFolder = () => {
    invoke("open_directory");
  }

  listen<string>('folder-selected', (e) => {
    setPath(e.payload); // Update the path state with the selected folder
  })

  return (
    <div>
      <button className="hover:text-blue-500 underline text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2" onClick={openFolder}>Open Folder</button>
      <p>{path}</p>
      <EditArea/>
    </div>
  );
}

export default App;
