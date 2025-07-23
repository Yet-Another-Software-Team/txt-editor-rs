import { invoke } from "@tauri-apps/api/core";
import EditArea from "./components/EditArea"; 
import { listen } from "@tauri-apps/api/event";
import { useState } from "react";

function App() {

  const [path, setPath] = useState('');

  // const openFolder = () => {}

  listen<string>('folder-selected', (e) => {
    setPath(e.payload); // Update the path state with the selected folder
  })

  return (
    <div>
      <p>{path}</p>
      <EditArea/>
    </div>
  );
}

export default App;
